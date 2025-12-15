// apps/api/src/lobby/lobby.gateway.ts
import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import {
	OnGatewayConnection,
	OnGatewayDisconnect,
	OnGatewayInit,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets'
import * as cookie from 'cookie'
import { Server, Socket } from 'socket.io'
import { GameGateway } from '../game/game.gateway'

type Player = {
	id: string
	name: string
	missions: number
	hours: number
	avatar?: string
	isReady: boolean
}

type LobbySettings = {
	maxPlayers: number
	gameMode: string
	isPrivate: boolean
	password: string
	difficulty?: string
	turnTime?: string
	fastGame?: boolean
	tournamentMode?: boolean
	limitedResources?: boolean

	// игровые настройки для прокидывания в GameGateway
	maxRounds?: number
	discussionTime?: number
	votingTime?: number
	hiddenRolesCount?: number
	enableCrises?: boolean
}

type LobbyState = {
	settings: LobbySettings
	players: Map<string, Player>
	connections: Map<string, Socket>
	creatorId: string
	gameStarted?: boolean
	gameId?: string
}

const DEFAULT_LOBBY_SETTINGS: LobbySettings = {
	maxPlayers: 4,
	gameMode: 'standard',
	isPrivate: false,
	password: '',
}

const LOBBY_ID_RE = /^[a-zA-Z0-9_-]{3,32}$/
const HARD_MAX_PLAYERS = 6
const MSG_MAX_LEN = 300
const MSG_WINDOW_MS = 10_000
const MSG_MAX_PER_WINDOW = 15
const JOIN_WINDOW_MS = 10_000
const JOIN_MAX_PER_IP = 5
const MAX_CONN_PER_IP_TOTAL = 20

@WebSocketGateway({
	path: '/lobby',
	cors: {
		origin: process.env.API_CORS_ORIGIN?.split(',') || [
			'http://localhost:3000',
			'https://stationeden.ru',
		],
		credentials: true,
	},
	transports: ['websocket'],
	pingTimeout: 60000,
	pingInterval: 25000,
})
export class LobbyGateway
	implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
	private readonly logger = new Logger(LobbyGateway.name)

	@WebSocketServer()
	private server!: Server

	constructor(
		private readonly jwtService: JwtService,
		private readonly configService: ConfigService,
		private readonly gameGateway: GameGateway
	) {}

	private lobbies = new Map<string, LobbyState>()
	private msgBuckets = new Map<string, { windowStart: number; count: number }>()
	private joinBucketsByIp = new Map<
		string,
		{ windowStart: number; count: number; conns: number }
	>()

	private now() {
		return Date.now()
	}

	private clientIp(socket: Socket) {
		const xf = (socket.handshake.headers['x-forwarded-for'] as string) || ''
		const ip =
			(xf.split(',')[0] || '').trim() || socket.handshake.address || 'unknown'
		return ip
	}

	private allowJoinFromIp(ip: string) {
		const b = this.joinBucketsByIp.get(ip) || {
			windowStart: this.now(),
			count: 0,
			conns: 0,
		}
		const t = this.now()
		if (t - b.windowStart > JOIN_WINDOW_MS) {
			b.windowStart = t
			b.count = 0
		}
		if (b.count >= JOIN_MAX_PER_IP) return false
		b.count++
		this.joinBucketsByIp.set(ip, b)
		return true
	}

	private incConn(ip: string) {
		const b = this.joinBucketsByIp.get(ip) || {
			windowStart: this.now(),
			count: 0,
			conns: 0,
		}
		b.conns++
		this.joinBucketsByIp.set(ip, b)
		return b.conns
	}

	private decConn(ip: string) {
		const b = this.joinBucketsByIp.get(ip)
		if (!b) return
		b.conns = Math.max(0, b.conns - 1)
		this.joinBucketsByIp.set(ip, b)
	}

	private allowMessage(userId: string) {
		const bucket = this.msgBuckets.get(userId) || {
			windowStart: this.now(),
			count: 0,
		}
		const t = this.now()
		if (t - bucket.windowStart > MSG_WINDOW_MS) {
			bucket.windowStart = t
			bucket.count = 0
		}
		if (bucket.count >= MSG_MAX_PER_WINDOW) return false
		bucket.count++
		this.msgBuckets.set(userId, bucket)
		return true
	}

	afterInit() {
		this.logger.log('LobbyGateway initialized')
	}

	async handleConnection(socket: Socket) {
		try {
			const ip = this.clientIp(socket)
			if (!this.allowJoinFromIp(ip)) {
				this.logger.warn(`Join rate-limit by IP ${ip}`)
				socket.emit('ERROR', { message: 'Too many connections from IP' })
				socket.disconnect(true)
				return
			}
			const totalConns = this.incConn(ip)
			if (totalConns > MAX_CONN_PER_IP_TOTAL) {
				this.logger.warn(`Too many concurrent connections from IP ${ip}`)
				socket.emit('ERROR', { message: 'Too many concurrent connections' })
				socket.disconnect(true)
				return
			}

			const rawCookie = socket.handshake.headers.cookie || ''
			const cookies = rawCookie ? cookie.parse(rawCookie) : {}

			const accessCookieName =
				this.configService.get<string>('ACCESS_TOKEN_COOKIE_NAME') ||
				'access_token'

			const token = cookies[accessCookieName]

			if (!token) {
				this.logger.warn(
					`Unauthorized WS connection attempt - no "${accessCookieName}" cookie. Cookies: ${
						rawCookie || '<empty>'
					}`
				)
				socket.emit('ERROR', { message: 'Authentication required' })
				socket.disconnect(true)
				return
			}

			const jwtSecret =
				this.configService.get<string>('JWT_ACCESS_SECRET') ||
				this.configService.get<string>('JWT_SECRET')

			if (!jwtSecret) {
				this.logger.error(
					'JWT secret is not configured (JWT_ACCESS_SECRET / JWT_SECRET)'
				)
				socket.emit('ERROR', { message: 'Server auth configuration error' })
				socket.disconnect(true)
				return
			}

			let payload: any
			try {
				payload = await this.jwtService.verifyAsync(token, {
					secret: jwtSecret,
				})
			} catch (err) {
				this.logger.warn(
					`Invalid WS token provided: ${(err as Error).message || err}`
				)
				socket.emit('ERROR', { message: 'Invalid authentication token' })
				socket.disconnect(true)
				return
			}

			const userId = String(payload.sub || '')
			const username = String(payload.username || '') || 'Игрок'
			const lobbyId = (socket.handshake.query.lobbyId as string) || ''

			if (!userId) {
				this.logger.warn('WS token payload has no "sub" (user id)')
				socket.emit('ERROR', { message: 'Invalid authentication token' })
				socket.disconnect(true)
				return
			}

			if (!lobbyId || !LOBBY_ID_RE.test(lobbyId)) {
				this.logger.warn(`Invalid lobbyId: "${lobbyId}"`)
				socket.emit('ERROR', { message: 'Invalid lobby id' })
				socket.disconnect(true)
				return
			}

			const existingLobby = this.lobbies.get(lobbyId)
			if (existingLobby?.gameStarted) {
				this.logger.warn(
					`Player ${username} tried to join lobby ${lobbyId} after game started`
				)
				socket.emit('ERROR', {
					message: 'Game has already started in this lobby',
				})
				socket.disconnect(true)
				return
			}

			socket.data.userId = userId
			socket.data.username = username
			socket.data.lobbyId = lobbyId

			socket.join(lobbyId)

			if (!this.lobbies.has(lobbyId)) {
				this.lobbies.set(lobbyId, {
					settings: { ...DEFAULT_LOBBY_SETTINGS },
					players: new Map(),
					connections: new Map(),
					creatorId: userId,
					gameStarted: false,
				})
				this.logger.log(`New lobby created: ${lobbyId} by ${username}`)
			}

			const lobby = this.lobbies.get(lobbyId)!
			const effectiveMax = Math.min(
				lobby.settings.maxPlayers || 4,
				HARD_MAX_PLAYERS
			)

			if (lobby.players.size >= effectiveMax) {
				this.logger.warn(`Lobby ${lobbyId} is full, rejecting ${username}`)
				socket.emit('ERROR', { message: 'Lobby is full' })
				socket.leave(lobbyId)
				socket.disconnect(true)
				return
			}

			lobby.connections.set(userId, socket)

			socket.emit('LOBBY_STATE', {
				players: Array.from(lobby.players.values()),
				settings: { ...lobby.settings, maxPlayers: effectiveMax },
				creatorId: lobby.creatorId,
				gameStarted: lobby.gameStarted || false,
			})

			this.logger.log(
				`Player connected: ${username} (${userId}) to lobby ${lobbyId}, players: ${lobby.players.size}`
			)
		} catch (error) {
			this.logger.error('Connection error:', error)
			socket.emit('ERROR', { message: 'Connection failed' })
			socket.disconnect(true)
		}
	}

	handleDisconnect(socket: Socket) {
		const { userId, lobbyId } = socket.data
		const ip = this.clientIp(socket)
		this.decConn(ip)

		if (!userId || !lobbyId) return

		const lobby = this.lobbies.get(lobbyId)
		if (!lobby) return

		lobby.connections.delete(userId)

		if (lobby.players.has(userId)) {
			const player = lobby.players.get(userId)!
			lobby.players.delete(userId)

			this.server.to(lobbyId).emit('PLAYER_LEFT', { playerId: userId })
			this.logger.log(
				`Player disconnected: ${player.name} from lobby ${lobbyId}`
			)

			if (lobby.players.size === 0 && lobby.connections.size === 0) {
				this.lobbies.delete(lobbyId)
				this.logger.log(`Lobby ${lobbyId} deleted (empty)`)
			} else if (lobby.creatorId === userId) {
				const remainingPlayers = Array.from(lobby.players.keys())
				if (remainingPlayers.length > 0) {
					lobby.creatorId = remainingPlayers[0]
					this.logger.log(
						`New lobby creator: ${lobby.creatorId} for lobby ${lobbyId}`
					)
				}
			}
		}
	}

	@SubscribeMessage('JOIN_LOBBY')
	handleJoinLobby(socket: Socket, data: { player: Player }) {
		const { userId, username, lobbyId } = socket.data
		const lobby = this.lobbies.get(lobbyId)

		if (!lobby) {
			socket.emit('ERROR', { message: 'Lobby not found' })
			return
		}

		if (lobby.gameStarted) {
			socket.emit('ERROR', {
				message: 'Cannot join lobby - game has already started',
			})
			return
		}

		const effectiveMax = Math.min(
			lobby.settings.maxPlayers || 4,
			HARD_MAX_PLAYERS
		)
		if (lobby.players.size >= effectiveMax) {
			socket.emit('ERROR', { message: 'Lobby is full' })
			return
		}

		const p = data?.player || ({} as Player)
		const sanitizedName =
			typeof p.name === 'string' && p.name.trim()
				? p.name.trim().slice(0, 50)
				: username || 'Игрок'

		const authenticatedPlayer: Player = {
			id: userId,
			name: sanitizedName,
			missions: Number.isFinite(p.missions)
				? Math.max(0, Math.min(9999, p.missions))
				: 0,
			hours: Number.isFinite(p.hours)
				? Math.max(0, Math.min(9999, p.hours))
				: 0,
			avatar:
				typeof p.avatar === 'string' && p.avatar.startsWith('http')
					? p.avatar
					: undefined,
			isReady: !!p.isReady,
		}

		lobby.players.set(userId, authenticatedPlayer)

		this.server.to(lobbyId).emit('LOBBY_STATE', {
			players: Array.from(lobby.players.values()),
			settings: { ...lobby.settings, maxPlayers: effectiveMax },
			creatorId: lobby.creatorId,
			gameStarted: lobby.gameStarted || false,
		})
	}

	@SubscribeMessage('SEND_MESSAGE')
	handleSendMessage(socket: Socket, data: { message: any }) {
		const { lobbyId, username, userId } = socket.data
		const lobby = this.lobbies.get(lobbyId)
		if (!lobby) return

		if (!lobby.players.has(userId)) {
			socket.emit('ERROR', { message: 'You are not in this lobby' })
			socket.leave(lobbyId)
			return
		}

		if (!this.allowMessage(userId)) {
			socket.emit('ERROR', { message: 'Too many messages' })
			return
		}

		const msg = data?.message ?? {}
		const textRaw = typeof msg.text === 'string' ? msg.text : ''
		const text = textRaw.trim().slice(0, MSG_MAX_LEN)
		if (!text) return

		const messageWithAuth = {
			...msg,
			text,
			type: 'player' as const,
			playerId: userId,
			playerName: username || 'Игрок',
			timestamp: new Date().toISOString(),
		}

		this.server.to(lobbyId).emit('CHAT_MESSAGE', { message: messageWithAuth })
	}

	@SubscribeMessage('TOGGLE_READY')
	handleToggleReady(
		socket: Socket,
		data: { playerId?: string; isReady: boolean }
	) {
		const { userId, lobbyId } = socket.data
		const lobby = this.lobbies.get(lobbyId)
		if (!lobby) return

		if (lobby.gameStarted) {
			socket.emit('ERROR', {
				message: 'Cannot change ready status - game has already started',
			})
			return
		}

		const playerId = data.playerId || userId
		if (playerId !== userId) {
			socket.emit('ERROR', {
				message: 'Cannot change other player ready status',
			})
			return
		}

		const player = lobby.players.get(playerId)
		if (!player) return

		player.isReady = !!data.isReady

		this.server.to(lobbyId).emit('LOBBY_STATE', {
			players: Array.from(lobby.players.values()),
			settings: {
				...lobby.settings,
				maxPlayers: Math.min(lobby.settings.maxPlayers, HARD_MAX_PLAYERS),
			},
			creatorId: lobby.creatorId,
			gameStarted: lobby.gameStarted || false,
		})
	}

	@SubscribeMessage('UPDATE_LOBBY_SETTINGS')
	handleUpdateLobbySettings(
		socket: Socket,
		data: { settings: Partial<LobbySettings> }
	) {
		const { userId, lobbyId } = socket.data
		const lobby = this.lobbies.get(lobbyId)
		if (!lobby) return

		if (lobby.gameStarted) {
			socket.emit('ERROR', {
				message: 'Cannot change settings - game has already started',
			})
			return
		}

		if (lobby.creatorId !== userId) {
			socket.emit('ERROR', {
				message: 'Only lobby creator can change settings',
			})
			return
		}

		const next = { ...data.settings }
		if (typeof next.maxPlayers === 'number') {
			next.maxPlayers = Math.max(2, Math.min(HARD_MAX_PLAYERS, next.maxPlayers))
		}

		Object.assign(lobby.settings, next)

		const effectiveMax = Math.min(
			lobby.settings.maxPlayers || 4,
			HARD_MAX_PLAYERS
		)

		this.server.to(lobbyId).emit('LOBBY_SETTINGS_UPDATED', {
			settings: { ...lobby.settings, maxPlayers: effectiveMax },
		})

		this.server.to(lobbyId).emit('LOBBY_STATE', {
			players: Array.from(lobby.players.values()),
			settings: { ...lobby.settings, maxPlayers: effectiveMax },
			creatorId: lobby.creatorId,
			gameStarted: lobby.gameStarted || false,
		})
	}

	@SubscribeMessage('PLAYER_LEFT')
	handlePlayerLeft(socket: Socket, data: { playerId?: string }) {
		const { userId, lobbyId } = socket.data
		const lobby = this.lobbies.get(lobbyId)
		if (!lobby) return

		const playerId = data.playerId || userId
		if (playerId !== userId && lobby.creatorId !== userId) {
			socket.emit('ERROR', { message: 'Cannot remove other players' })
			return
		}

		const player = lobby.players.get(playerId)
		if (!player) return

		const targetSocket = lobby.connections.get(playerId)

		lobby.players.delete(playerId)
		lobby.connections.delete(playerId)

		if (targetSocket) {
			targetSocket.leave(lobbyId)
			targetSocket.emit('ERROR', { message: 'You were removed from the lobby' })
		}

		if (lobby.creatorId === playerId && lobby.players.size > 0) {
			lobby.creatorId = Array.from(lobby.players.keys())[0]
		}

		this.server.to(lobbyId).emit('LOBBY_STATE', {
			players: Array.from(lobby.players.values()),
			settings: {
				...lobby.settings,
				maxPlayers: Math.min(lobby.settings.maxPlayers, HARD_MAX_PLAYERS),
			},
			creatorId: lobby.creatorId,
			gameStarted: lobby.gameStarted || false,
		})

		if (lobby.players.size === 0 && lobby.connections.size === 0) {
			this.lobbies.delete(lobbyId)
		}
	}

	@SubscribeMessage('START_GAME')
	async handleStartGame(socket: Socket, data: { lobbyId?: string }) {
		try {
			const { userId, lobbyId: socketLobbyId, username } = socket.data
			const targetLobbyId = data?.lobbyId || socketLobbyId

			if (!targetLobbyId) {
				socket.emit('ERROR', { message: 'Lobby ID is required' })
				return
			}

			const lobby = this.lobbies.get(targetLobbyId)
			if (!lobby) {
				socket.emit('ERROR', { message: 'Lobby not found' })
				return
			}

			if (lobby.creatorId !== userId) {
				socket.emit('ERROR', {
					message: 'Только создатель лобби может начать игру',
				})
				return
			}

			if (lobby.gameStarted) {
				socket.emit('ERROR', { message: 'Игра уже началась в этом лобби' })
				return
			}

			if (lobby.players.size < 2) {
				socket.emit('ERROR', {
					message: 'Для начала игры нужно минимум 2 игрока',
				})
				return
			}

			const notReadyPlayers = Array.from(lobby.players.values())
				.filter(p => !p.isReady)
				.map(p => p.name)

			if (notReadyPlayers.length > 0) {
				socket.emit('ERROR', {
					message: `Следующие игроки не готовы: ${notReadyPlayers.join(', ')}`,
				})
				return
			}

			const gameId = `game-${targetLobbyId}-${Date.now()}-${Math.random()
				.toString(36)
				.substr(2, 9)}`

			lobby.gameStarted = true
			lobby.gameId = gameId

			const playersForGame = Array.from(lobby.players.values()).map(p => ({
				id: p.id,
				name: p.name,
				missions: p.missions,
				hours: p.hours,
				avatar: p.avatar,
			}))

			const gameSettingsForGateway = {
				gameMode: lobby.settings.gameMode || 'standard',
				maxPlayers: Math.min(lobby.settings.maxPlayers || 4, HARD_MAX_PLAYERS),
				maxRounds: lobby.settings.maxRounds ?? 10,
				discussionTime: lobby.settings.discussionTime ?? 180,
				votingTime: lobby.settings.votingTime ?? 60,
				hiddenRolesCount: Math.min(
					lobby.settings.hiddenRolesCount ?? 1,
					playersForGame.length
				),
				enableCrises: lobby.settings.enableCrises !== false,
				difficulty:
					(lobby.settings.difficulty as 'easy' | 'normal' | 'hard') || 'normal',
				tournamentMode: !!lobby.settings.tournamentMode,
			}

			this.gameGateway.createGameFromLobby(
				targetLobbyId,
				gameId,
				playersForGame,
				lobby.creatorId,
				gameSettingsForGateway
			)

			this.logger.log(
				`Game created via GameGateway: ${gameId} from lobby ${targetLobbyId} by ${username}`
			)

			this.server.to(targetLobbyId).emit('GAME_STARTED', {
				gameId,
				redirectUrl: `/game/${gameId}`,
				gameState: this.gameGateway.getGameState(gameId),
				message: 'Игра начинается! Перенаправление...',
			})

			const systemMessage = {
				text: `Игра началась! ID игры: ${gameId}`,
				type: 'system' as const,
				playerId: 'system',
				playerName: 'Система',
				timestamp: new Date().toISOString(),
			}
			this.server
				.to(targetLobbyId)
				.emit('CHAT_MESSAGE', { message: systemMessage })

			setTimeout(() => {
				const l = this.lobbies.get(targetLobbyId)
				if (l && l.connections.size === 0) {
					this.lobbies.delete(targetLobbyId)
					this.logger.log(`Lobby ${targetLobbyId} cleaned up after game start`)
				}
			}, 30_000)
		} catch (error) {
			this.logger.error('Error in START_GAME:', error)
			socket.emit('ERROR', {
				message:
					'Ошибка при начале игры: ' +
					(error instanceof Error ? error.message : 'Unknown error'),
			})
		}
	}

	// debug helpers
	getLobbyState(lobbyId: string) {
		const lobby = this.lobbies.get(lobbyId)
		if (!lobby) return null
		return {
			players: Array.from(lobby.players.values()),
			settings: lobby.settings,
			creatorId: lobby.creatorId,
			connections: lobby.connections.size,
			gameStarted: lobby.gameStarted || false,
			gameId: lobby.gameId,
		}
	}

	getAllLobbies() {
		return Array.from(this.lobbies.entries()).map(([lobbyId, lobby]) => ({
			lobbyId,
			players: Array.from(lobby.players.values()).map(p => p.name),
			settings: lobby.settings,
			creatorId: lobby.creatorId,
			connections: lobby.connections.size,
			gameStarted: lobby.gameStarted || false,
			gameId: lobby.gameId,
		}))
	}
}
