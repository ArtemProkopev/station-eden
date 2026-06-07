// apps/api/src/lobby/lobby.gateway.ts
import { BadRequestException, Logger } from '@nestjs/common'
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
import type {
	ISODateString,
	LobbyVisibility,
	PublicLobbyInfo,
} from '@station-eden/shared'
import * as bcrypt from 'bcryptjs'
import * as cookie from 'cookie'
import { randomBytes } from 'crypto'
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

type LobbyDifficulty = 'easy' | 'normal' | 'hard'

type LobbySettings = {
	maxPlayers: number
	gameMode: string
	isPrivate: boolean
	password: string
	visibility: LobbyVisibility
	hasPassword: boolean
	difficulty?: LobbyDifficulty
	turnTime?: number
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
	visibility: LobbyVisibility
	createdAt: ISODateString
	passwordHash?: string
	inviteCode?: string
	gameStarted?: boolean
	gameId?: string
}

const DEFAULT_LOBBY_SETTINGS: LobbySettings = {
	maxPlayers: 4,
	gameMode: 'standard',
	isPrivate: false,
	password: '',
	visibility: 'public',
	hasPassword: false,
	difficulty: 'normal',
	turnTime: 180,
	maxRounds: 10,
	discussionTime: 180,
	votingTime: 60,
	hiddenRolesCount: 1,
	enableCrises: true,
}

const LOBBY_ID_RE = /^[a-zA-Z0-9_-]{3,32}$/
const GAME_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const GAME_CODE_LENGTH = 8
const GAME_CODE_PREFIX = 'EDEN'
const GAME_CODE_MAX_ATTEMPTS = 50
const HARD_MAX_PLAYERS = 6
const MSG_MAX_LEN = 300
const MSG_WINDOW_MS = 10_000
const MSG_MAX_PER_WINDOW = 15
const JOIN_WINDOW_MS = 10_000
const JOIN_MAX_PER_IP = 5
const MAX_CONN_PER_IP_TOTAL = 20

const MIN_PLAYERS = 2
const MIN_MAX_ROUNDS = 3
const MAX_MAX_ROUNDS = 20
const MIN_DISCUSSION_TIME = 30
const MAX_DISCUSSION_TIME = 600
const MIN_VOTING_TIME = 15
const MAX_VOTING_TIME = 300

const ALLOWED_GAME_MODES = new Set([
	'standard',
	'extended',
	'competitive',
	'cooperative',
])

const ALLOWED_DIFFICULTIES = new Set<LobbyDifficulty>([
	'easy',
	'normal',
	'hard',
])

const ALLOWED_TURN_TIMES = new Set([60, 180, 300])

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value)
}

function normalizeIntegerInRange(
	value: unknown,
	min: number,
	max: number,
): number | undefined {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return undefined
	}

	const normalized = Math.trunc(value)

	return Math.max(min, Math.min(max, normalized))
}

function normalizeBoolean(value: unknown): boolean | undefined {
	return typeof value === 'boolean' ? value : undefined
}

function normalizeAllowedNumber(
	value: unknown,
	allowedValues: Set<number>,
): number | undefined {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return undefined
	}

	const normalized = Math.trunc(value)

	return allowedValues.has(normalized) ? normalized : undefined
}

function normalizeGameMode(value: unknown): string | undefined {
	if (typeof value !== 'string') {
		return undefined
	}

	return ALLOWED_GAME_MODES.has(value) ? value : undefined
}

function normalizeDifficulty(value: unknown): LobbyDifficulty | undefined {
	if (typeof value !== 'string') {
		return undefined
	}

	return ALLOWED_DIFFICULTIES.has(value as LobbyDifficulty)
		? (value as LobbyDifficulty)
		: undefined
}
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
		private readonly gameGateway: GameGateway,
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

	private createRandomGameCode(length = GAME_CODE_LENGTH) {
		const bytes = randomBytes(length)

		return Array.from(bytes, byte => {
			const index = byte & 31
			return GAME_CODE_ALPHABET[index]
		}).join('')
	}

	private formatPublicGameId(code: string) {
		const firstGroup = code.slice(0, 4)
		const secondGroup = code.slice(4, 8)

		return `${GAME_CODE_PREFIX}-${firstGroup}-${secondGroup}`
	}

	private isGameIdTaken(gameId: string) {
		if (this.gameGateway.getGameState(gameId)) {
			return true
		}

		return Array.from(this.lobbies.values()).some(
			lobby => lobby.gameId === gameId,
		)
	}

	private generatePublicGameId() {
		for (let attempt = 0; attempt < GAME_CODE_MAX_ATTEMPTS; attempt++) {
			const code = this.createRandomGameCode()
			const gameId = this.formatPublicGameId(code)

			if (!this.isGameIdTaken(gameId)) {
				return gameId
			}
		}

		throw new Error('Не удалось сгенерировать уникальный ID игры')
	}

	private normalizeVisibility(value: unknown): LobbyVisibility {
		if (
			value === 'public' ||
			value === 'password' ||
			value === 'hidden_password'
		) {
			return value
		}

		return 'public'
	}

	private createRandomLobbyId() {
		for (let attempt = 0; attempt < GAME_CODE_MAX_ATTEMPTS; attempt++) {
			const id = Math.random().toString(36).slice(2, 10)

			if (LOBBY_ID_RE.test(id) && !this.lobbies.has(id)) {
				return id
			}
		}

		throw new Error('Не удалось создать уникальный ID лобби')
	}

	private sanitizeSettings(lobby: LobbyState): LobbySettings {
		const effectiveMax = Math.min(
			lobby.settings.maxPlayers || 4,
			HARD_MAX_PLAYERS,
		)

		return {
			...lobby.settings,
			maxPlayers: effectiveMax,
			password: '',
			hasPassword: !!lobby.passwordHash,
			visibility: lobby.visibility,
			isPrivate: lobby.visibility === 'hidden_password',
		}
	}

	private normalizeLobbySettingsPatch(
		rawSettings: unknown,
		lobby: LobbyState,
	): Partial<LobbySettings> {
		if (!isRecord(rawSettings)) {
			return {}
		}

		const next: Partial<LobbySettings> = {}

		const maxPlayers = normalizeIntegerInRange(
			rawSettings.maxPlayers,
			MIN_PLAYERS,
			HARD_MAX_PLAYERS,
		)

		if (maxPlayers !== undefined) {
			next.maxPlayers = maxPlayers
		}

		const effectiveMaxPlayers =
			next.maxPlayers ??
			Math.min(
				lobby.settings.maxPlayers || DEFAULT_LOBBY_SETTINGS.maxPlayers,
				HARD_MAX_PLAYERS,
			)

		const gameMode = normalizeGameMode(rawSettings.gameMode)

		if (gameMode) {
			next.gameMode = gameMode
		}

		const difficulty = normalizeDifficulty(rawSettings.difficulty)

		if (difficulty) {
			next.difficulty = difficulty
		}

		const turnTime = normalizeAllowedNumber(
			rawSettings.turnTime,
			ALLOWED_TURN_TIMES,
		)

		if (turnTime !== undefined) {
			next.turnTime = turnTime
		}

		const maxRounds = normalizeIntegerInRange(
			rawSettings.maxRounds,
			MIN_MAX_ROUNDS,
			MAX_MAX_ROUNDS,
		)

		if (maxRounds !== undefined) {
			next.maxRounds = maxRounds
		}

		const discussionTime = normalizeIntegerInRange(
			rawSettings.discussionTime,
			MIN_DISCUSSION_TIME,
			MAX_DISCUSSION_TIME,
		)

		if (discussionTime !== undefined) {
			next.discussionTime = discussionTime
		}

		const votingTime = normalizeIntegerInRange(
			rawSettings.votingTime,
			MIN_VOTING_TIME,
			MAX_VOTING_TIME,
		)

		if (votingTime !== undefined) {
			next.votingTime = votingTime
		}

		const hiddenRolesCount = normalizeIntegerInRange(
			rawSettings.hiddenRolesCount,
			0,
			Math.max(0, effectiveMaxPlayers - 1),
		)

		if (hiddenRolesCount !== undefined) {
			next.hiddenRolesCount = hiddenRolesCount
		}

		const enableCrises = normalizeBoolean(rawSettings.enableCrises)

		if (enableCrises !== undefined) {
			next.enableCrises = enableCrises
		}

		const fastGame = normalizeBoolean(rawSettings.fastGame)

		if (fastGame !== undefined) {
			next.fastGame = fastGame
		}

		const tournamentMode = normalizeBoolean(rawSettings.tournamentMode)

		if (tournamentMode !== undefined) {
			next.tournamentMode = tournamentMode
		}

		const limitedResources = normalizeBoolean(rawSettings.limitedResources)

		if (limitedResources !== undefined) {
			next.limitedResources = limitedResources
		}

		return next
	}

	private emitLobbyState(lobbyId: string, lobby: LobbyState) {
		this.server.to(lobbyId).emit('LOBBY_STATE', {
			players: Array.from(lobby.players.values()),
			settings: this.sanitizeSettings(lobby),
			creatorId: lobby.creatorId,
			gameStarted: lobby.gameStarted || false,
		})
	}

	private bindSocketToLobby(
		socket: Socket,
		lobbyId: string,
		lobby: LobbyState,
	) {
		socket.join(lobbyId)
		lobby.connections.set(socket.data.userId, socket)
	}

	private async isPasswordValid(lobby: LobbyState, password?: string) {
		if (!lobby.passwordHash) return true
		if (!password || password.trim().length < 4) return false

		return bcrypt.compare(password.trim(), lobby.passwordHash)
	}

	async createLobbyFromRequest(data: {
		creatorId: string
		creatorName: string
		visibility: LobbyVisibility
		password?: string
	}) {
		const visibility = this.normalizeVisibility(data.visibility)
		const needsPassword =
			visibility === 'password' || visibility === 'hidden_password'

		if (needsPassword && (!data.password || data.password.trim().length < 4)) {
			throw new BadRequestException('Пароль должен содержать минимум 4 символа')
		}

		const lobbyId = this.createRandomLobbyId()
		const passwordHash = needsPassword
			? await bcrypt.hash(data.password!.trim(), 10)
			: undefined
		const createdAt = new Date().toISOString()

		this.lobbies.set(lobbyId, {
			settings: {
				...DEFAULT_LOBBY_SETTINGS,
				visibility,
				hasPassword: !!passwordHash,
				isPrivate: visibility === 'hidden_password',
				password: '',
			},
			players: new Map(),
			connections: new Map(),
			creatorId: data.creatorId,
			visibility,
			createdAt,
			passwordHash,
			inviteCode: lobbyId,
			gameStarted: false,
		})

		this.logger.log(
			`New ${visibility} lobby created: ${lobbyId} by ${data.creatorName}`,
		)

		return {
			lobbyId,
			visibility,
			hasPassword: !!passwordHash,
			inviteCode: lobbyId,
		}
	}

	getOpenLobbies(): PublicLobbyInfo[] {
		return Array.from(this.lobbies.entries())
			.filter(([, lobby]) => {
				if (lobby.gameStarted) return false

				return lobby.visibility === 'public' || lobby.visibility === 'password'
			})
			.map(([lobbyId, lobby]) => ({
				lobbyId,
				playersCount: lobby.players.size,
				maxPlayers: Math.min(lobby.settings.maxPlayers || 4, HARD_MAX_PLAYERS),
				gameMode: lobby.settings.gameMode || 'standard',
				visibility: lobby.visibility === 'password' ? 'password' : 'public',
				hasPassword: !!lobby.passwordHash,
				createdAt: lobby.createdAt,
			}))
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
					}`,
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
					'JWT secret is not configured (JWT_ACCESS_SECRET / JWT_SECRET)',
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
					`Invalid WS token provided: ${(err as Error).message || err}`,
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
					`Player ${username} tried to join lobby ${lobbyId} after game started`,
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

			if (!this.lobbies.has(lobbyId)) {
				this.lobbies.set(lobbyId, {
					settings: { ...DEFAULT_LOBBY_SETTINGS },
					players: new Map(),
					connections: new Map(),
					creatorId: userId,
					visibility: 'public',
					createdAt: new Date().toISOString(),
					gameStarted: false,
				})

				this.logger.log(
					`New legacy public lobby created: ${lobbyId} by ${username}`,
				)
			}

			const lobby = this.lobbies.get(lobbyId)!

			if (lobby.passwordHash) {
				socket.emit('LOBBY_LOCKED', {
					message: 'Для подключения к лобби нужен пароль',
					hasPassword: true,
				})
				return
			}

			const effectiveMax = Math.min(
				lobby.settings.maxPlayers || 4,
				HARD_MAX_PLAYERS,
			)

			if (lobby.players.size >= effectiveMax && !lobby.players.has(userId)) {
				this.logger.warn(`Lobby ${lobbyId} is full, rejecting ${username}`)
				socket.emit('ERROR', { message: 'Lobby is full' })
				socket.disconnect(true)
				return
			}

			this.bindSocketToLobby(socket, lobbyId, lobby)

			socket.emit('LOBBY_STATE', {
				players: Array.from(lobby.players.values()),
				settings: this.sanitizeSettings(lobby),
				creatorId: lobby.creatorId,
				gameStarted: lobby.gameStarted || false,
			})

			this.logger.log(
				`Player connected: ${username} (${userId}) to lobby ${lobbyId}, players: ${lobby.players.size}`,
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
				`Player disconnected: ${player.name} from lobby ${lobbyId}`,
			)

			if (lobby.players.size === 0 && lobby.connections.size === 0) {
				this.lobbies.delete(lobbyId)
				this.logger.log(`Lobby ${lobbyId} deleted (empty)`)
			} else if (lobby.creatorId === userId) {
				const remainingPlayers = Array.from(lobby.players.keys())

				if (remainingPlayers.length > 0) {
					lobby.creatorId = remainingPlayers[0]

					this.logger.log(
						`New lobby creator: ${lobby.creatorId} for lobby ${lobbyId}`,
					)

					this.emitLobbyState(lobbyId, lobby)
				}
			}
		}
	}

	@SubscribeMessage('JOIN_LOBBY')
	async handleJoinLobby(
		socket: Socket,
		data: { player: Player; password?: string },
	) {
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

		const passwordOk = await this.isPasswordValid(lobby, data?.password)

		if (!passwordOk) {
			socket.emit('ERROR', {
				message: lobby.passwordHash
					? 'Неверный пароль лобби'
					: 'Для подключения к лобби нужен пароль',
			})
			return
		}

		const effectiveMax = Math.min(
			lobby.settings.maxPlayers || 4,
			HARD_MAX_PLAYERS,
		)

		if (lobby.players.size >= effectiveMax && !lobby.players.has(userId)) {
			socket.emit('ERROR', { message: 'Lobby is full' })
			return
		}

		this.bindSocketToLobby(socket, lobbyId, lobby)

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

		this.emitLobbyState(lobbyId, lobby)
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
		data: { playerId?: string; isReady: boolean },
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

		this.emitLobbyState(lobbyId, lobby)
	}

	@SubscribeMessage('UPDATE_LOBBY_SETTINGS')
	handleUpdateLobbySettings(
		socket: Socket,
		data: { settings: Partial<LobbySettings> },
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

		const next = this.normalizeLobbySettingsPatch(data?.settings, lobby)

		Object.assign(lobby.settings, next)

		const effectiveMax = Math.min(
			lobby.settings.maxPlayers || 4,
			HARD_MAX_PLAYERS,
		)

		this.server.to(lobbyId).emit('LOBBY_SETTINGS_UPDATED', {
			settings: this.sanitizeSettings(lobby),
		})

		this.server.to(lobbyId).emit('LOBBY_STATE', {
			players: Array.from(lobby.players.values()),
			settings: {
				...this.sanitizeSettings(lobby),
				maxPlayers: effectiveMax,
			},
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

		this.emitLobbyState(lobbyId, lobby)

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
				.filter(player => !player.isReady)
				.map(player => player.name)

			if (notReadyPlayers.length > 0) {
				socket.emit('ERROR', {
					message: `Следующие игроки не готовы: ${notReadyPlayers.join(', ')}`,
				})
				return
			}

			const gameId = this.generatePublicGameId()

			lobby.gameStarted = true
			lobby.gameId = gameId

			const playersForGame = Array.from(lobby.players.values()).map(player => ({
				id: player.id,
				name: player.name,
				missions: player.missions,
				hours: player.hours,
				avatar: player.avatar,
			}))

			const gameSettingsForGateway = {
				gameMode: lobby.settings.gameMode || 'standard',
				maxPlayers: Math.min(lobby.settings.maxPlayers || 4, HARD_MAX_PLAYERS),
				maxRounds: lobby.settings.maxRounds ?? 10,
				discussionTime: lobby.settings.discussionTime ?? 180,
				votingTime: lobby.settings.votingTime ?? 60,
				hiddenRolesCount: Math.min(
					lobby.settings.hiddenRolesCount ?? 1,
					playersForGame.length,
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
				gameSettingsForGateway,
			)

			this.logger.log(
				`Game created via GameGateway: ${gameId} from lobby ${targetLobbyId} by ${username}`,
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
				const currentLobby = this.lobbies.get(targetLobbyId)

				if (currentLobby && currentLobby.connections.size === 0) {
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
			settings: this.sanitizeSettings(lobby),
			creatorId: lobby.creatorId,
			connections: lobby.connections.size,
			visibility: lobby.visibility,
			createdAt: lobby.createdAt,
			hasPassword: !!lobby.passwordHash,
			inviteCode: lobby.inviteCode,
			gameStarted: lobby.gameStarted || false,
			gameId: lobby.gameId,
		}
	}

	getAllLobbies() {
		return Array.from(this.lobbies.entries()).map(([lobbyId, lobby]) => ({
			lobbyId,
			players: Array.from(lobby.players.values()).map(player => player.name),
			settings: this.sanitizeSettings(lobby),
			creatorId: lobby.creatorId,
			connections: lobby.connections.size,
			visibility: lobby.visibility,
			createdAt: lobby.createdAt,
			hasPassword: !!lobby.passwordHash,
			inviteCode: lobby.inviteCode,
			gameStarted: lobby.gameStarted || false,
			gameId: lobby.gameId,
		}))
	}
}
