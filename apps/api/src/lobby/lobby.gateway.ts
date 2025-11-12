import { Logger } from '@nestjs/common'
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
}

type LobbyState = {
	settings: LobbySettings
	players: Map<string, Player>
	connections: Map<string, Socket>
	creatorId: string
}

const DEFAULT_LOBBY_SETTINGS: LobbySettings = {
	maxPlayers: 4,
	gameMode: 'standard',
	isPrivate: false,
	password: '',
}

/** Жёсткие лимиты на уровне сервера */
const LOBBY_ID_RE = /^[a-zA-Z0-9_-]{3,32}$/
const HARD_MAX_PLAYERS = 6 // верхний предел при любом client-UI
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
	// Важно: только WebSocket, без polling — совпадает с Caddyfile
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

	constructor(private readonly jwtService: JwtService) {}

	private lobbies = new Map<string, LobbyState>()

	// rate-limit карты
	private msgBuckets = new Map<string, { windowStart: number; count: number }>() // key = userId
	private joinBucketsByIp = new Map<
		string,
		{ windowStart: number; count: number; conns: number }
	>() // key = ip

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
			// 1) ограничим соединения по IP
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

			// 2) аутентификация по access_token cookie
			const rawCookie = socket.handshake.headers.cookie || ''
			const cookies = cookie.parse(rawCookie)
			const token = cookies['access_token']

			if (!token) {
				this.logger.warn('Unauthorized connection attempt - no token')
				socket.emit('ERROR', { message: 'Authentication required' })
				socket.disconnect(true)
				return
			}

			let payload: any
			try {
				payload = await this.jwtService.verifyAsync(token, {
					secret: process.env.JWT_ACCESS_SECRET!,
				})
			} catch {
				this.logger.warn('Invalid token provided')
				socket.emit('ERROR', { message: 'Invalid authentication token' })
				socket.disconnect(true)
				return
			}

			const userId = String(payload.sub || '')
			const username = String(payload.username || '') || 'Игрок'
			const lobbyId = (socket.handshake.query.lobbyId as string) || ''

			if (!lobbyId || !LOBBY_ID_RE.test(lobbyId)) {
				this.logger.warn(`Invalid lobbyId: "${lobbyId}"`)
				socket.emit('ERROR', { message: 'Invalid lobby id' })
				socket.disconnect(true)
				return
			}

			socket.data.userId = userId
			socket.data.username = username
			socket.data.lobbyId = lobbyId

			await socket.join(lobbyId)

			if (!this.lobbies.has(lobbyId)) {
				this.lobbies.set(lobbyId, {
					settings: { ...DEFAULT_LOBBY_SETTINGS },
					players: new Map(),
					connections: new Map(),
					creatorId: userId, // первый подключившийся — создатель
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

			// сохраняем последнее соединение пользователя
			lobby.connections.set(userId, socket)

			// Отдаём состояние лобби
			socket.emit('LOBBY_STATE', {
				players: Array.from(lobby.players.values()),
				settings: { ...lobby.settings, maxPlayers: effectiveMax },
				creatorId: lobby.creatorId,
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

		// удаляем привязку соединения
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

		const isNewPlayer = !lobby.players.has(userId)
		lobby.players.set(userId, authenticatedPlayer)

		this.logger.log(
			`Player ${authenticatedPlayer.name} ${isNewPlayer ? 'joined' : 'updated in'} lobby ${lobbyId}`
		)

		this.server.to(lobbyId).emit('LOBBY_STATE', {
			players: Array.from(lobby.players.values()),
			settings: { ...lobby.settings, maxPlayers: effectiveMax },
			creatorId: lobby.creatorId,
		})
	}

	@SubscribeMessage('SEND_MESSAGE')
	handleSendMessage(socket: Socket, data: { message: any }) {
		const { lobbyId, username, userId } = socket.data
		const lobby = this.lobbies.get(lobbyId)
		if (!lobby) return

		// не-участникам лобби — запрет писать
		if (!lobby.players.has(userId)) {
			socket.emit('ERROR', { message: 'You are not in this lobby' })
			socket.leave(lobbyId)
			return
		}

		// rate-limit сообщений
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

		const playerId = data.playerId || userId
		const player = lobby.players.get(playerId)

		if (playerId !== userId) {
			socket.emit('ERROR', {
				message: 'Cannot change other player ready status',
			})
			return
		}

		if (player) {
			player.isReady = !!data.isReady
			this.logger.log(`Player ${player.name} ready: ${player.isReady}`)

			this.server.to(lobbyId).emit('LOBBY_STATE', {
				players: Array.from(lobby.players.values()),
				settings: lobby.settings,
				creatorId: lobby.creatorId,
			})
		}
	}

	@SubscribeMessage('UPDATE_LOBBY_SETTINGS')
	handleUpdateLobbySettings(
		socket: Socket,
		data: { settings: Partial<LobbySettings> }
	) {
		const { userId, lobbyId } = socket.data
		const lobby = this.lobbies.get(lobbyId)
		if (!lobby) return

		if (lobby.creatorId !== userId) {
			socket.emit('ERROR', {
				message: 'Only lobby creator can change settings',
			})
			return
		}

		// не даём «выкрутить» выше жёсткого лимита
		const next = { ...data.settings }
		if (typeof next.maxPlayers === 'number') {
			next.maxPlayers = Math.max(2, Math.min(HARD_MAX_PLAYERS, next.maxPlayers))
		}

		Object.assign(lobby.settings, next)

		this.server.to(lobbyId).emit('LOBBY_SETTINGS_UPDATED', {
			settings: {
				...lobby.settings,
				maxPlayers: Math.min(lobby.settings.maxPlayers, HARD_MAX_PLAYERS),
			},
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
		if (player) {
			const targetSocket = lobby.connections.get(playerId)

			lobby.players.delete(playerId)
			lobby.connections.delete(playerId)

			if (targetSocket) {
				targetSocket.leave(lobbyId)
				targetSocket.emit('ERROR', {
					message: 'You were removed from the lobby',
				})
				// targetSocket.disconnect(true)
			}

			this.logger.log(`Player ${player.name} left lobby ${lobbyId}`)

			if (lobby.creatorId === playerId && lobby.players.size > 0) {
				const remainingPlayers = Array.from(lobby.players.keys())
				lobby.creatorId = remainingPlayers[0]
				this.logger.log(
					`New lobby creator: ${lobby.creatorId} for lobby ${lobbyId}`
				)
			}

			this.server.to(lobbyId).emit('LOBBY_STATE', {
				players: Array.from(lobby.players.values()),
				settings: lobby.settings,
				creatorId: lobby.creatorId,
			})

			if (lobby.players.size === 0 && lobby.connections.size === 0) {
				this.lobbies.delete(lobbyId)
				this.logger.log(`Lobby ${lobbyId} deleted (empty)`)
			}
		}
	}

	getLobbyState(lobbyId: string) {
		const lobby = this.lobbies.get(lobbyId)
		if (!lobby) return null
		return {
			players: Array.from(lobby.players.values()),
			settings: lobby.settings,
			creatorId: lobby.creatorId,
			connections: lobby.connections.size,
		}
	}

	getAllLobbies() {
		return Array.from(this.lobbies.entries()).map(([lobbyId, lobby]) => ({
			lobbyId,
			players: Array.from(lobby.players.values()).map(p => p.name),
			settings: lobby.settings,
			creatorId: lobby.creatorId,
			connections: lobby.connections.size,
		}))
	}
}
