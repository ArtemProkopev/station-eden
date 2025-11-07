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
	creatorId: string // ID создателя лобби
}

const DEFAULT_LOBBY_SETTINGS: LobbySettings = {
	maxPlayers: 4,
	gameMode: 'standard',
	isPrivate: false,
	password: '',
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
	transports: ['websocket', 'polling'],
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

	afterInit() {
		this.logger.log('LobbyGateway initialized')
	}

	async handleConnection(socket: Socket) {
		try {
			const rawCookie = socket.handshake.headers.cookie || ''
			const cookies = cookie.parse(rawCookie)
			const token = cookies['access_token']

			// Проверка авторизации - обязательна для всех подключений
			if (!token) {
				this.logger.warn('Unauthorized connection attempt - no token')
				socket.emit('ERROR', { message: 'Authentication required' })
				socket.disconnect()
				return
			}

			let payload: any
			try {
				payload = await this.jwtService.verifyAsync(token, {
					secret: process.env.JWT_ACCESS_SECRET!,
				})
			} catch (error) {
				this.logger.warn('Invalid token provided')
				socket.emit('ERROR', { message: 'Invalid authentication token' })
				socket.disconnect()
				return
			}

			const userId = payload.sub
			const username = payload.username
			let lobbyId = socket.handshake.query.lobbyId as string

			if (!lobbyId) {
				this.logger.warn('No lobbyId provided')
				socket.emit('ERROR', { message: 'Lobby ID is required' })
				socket.disconnect()
				return
			}

			socket.data.userId = userId
			socket.data.username = username
			socket.data.lobbyId = lobbyId

			// Присоединяем к комнате лобби
			await socket.join(lobbyId)

			// Инициализируем лобби если не существует
			if (!this.lobbies.has(lobbyId)) {
				this.lobbies.set(lobbyId, {
					settings: { ...DEFAULT_LOBBY_SETTINGS },
					players: new Map(),
					connections: new Map(),
					creatorId: userId, // Первый подключившийся становится создателем
				})
				this.logger.log(`New lobby created: ${lobbyId} by ${username}`)
			}

			const lobby = this.lobbies.get(lobbyId)!

			// Проверяем не переполнено ли лобби
			if (lobby.players.size >= lobby.settings.maxPlayers) {
				this.logger.warn(
					`Lobby ${lobbyId} is full, rejecting connection from ${username}`
				)
				socket.emit('ERROR', { message: 'Lobby is full' })
				socket.disconnect()
				return
			}

			// Сохраняем соединение
			lobby.connections.set(userId, socket)

			// Если игрок уже есть в лобби, обновляем его соединение
			const existingPlayer = lobby.players.get(userId)
			if (existingPlayer) {
				this.logger.log(
					`Player reconnected: ${existingPlayer.name} to lobby ${lobbyId}`
				)
				// Рассылаем обновленное состояние всем
				this.server.to(lobbyId).emit('LOBBY_STATE', {
					players: Array.from(lobby.players.values()),
					settings: lobby.settings,
					creatorId: lobby.creatorId,
				})
			} else {
				// Отправляем текущее состояние лобби новому подключению
				socket.emit('LOBBY_STATE', {
					players: Array.from(lobby.players.values()),
					settings: lobby.settings,
					creatorId: lobby.creatorId,
				})
			}

			this.logger.log(
				`Player connected: ${username} (${userId}) to lobby ${lobbyId}, players: ${lobby.players.size}`
			)
		} catch (error) {
			this.logger.error('Connection error:', error)
			socket.emit('ERROR', { message: 'Connection failed' })
			socket.disconnect()
		}
	}

	handleDisconnect(socket: Socket) {
		const { userId, username, lobbyId } = socket.data

		if (!userId || !lobbyId) return

		const lobby = this.lobbies.get(lobbyId)
		if (!lobby) return

		// Удаляем соединение
		lobby.connections.delete(userId)

		// Если у игрока больше нет активных соединений, удаляем его из лобби
		const hasOtherConnections = Array.from(lobby.connections.keys()).some(
			connUserId => connUserId === userId
		)

		if (!hasOtherConnections && lobby.players.has(userId)) {
			const player = lobby.players.get(userId)!
			lobby.players.delete(userId)

			// Уведомляем всех о выходе игрока
			this.server.to(lobbyId).emit('PLAYER_LEFT', { playerId: userId })
			this.logger.log(
				`Player disconnected: ${player.name} from lobby ${lobbyId}`
			)

			// Если лобби пустое, удаляем его
			if (lobby.players.size === 0 && lobby.connections.size === 0) {
				this.lobbies.delete(lobbyId)
				this.logger.log(`Lobby ${lobbyId} deleted (empty)`)
			} else if (lobby.creatorId === userId) {
				// Если создатель вышел, назначаем нового создателя
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

		// Проверяем не переполнено ли лобби
		if (lobby.players.size >= lobby.settings.maxPlayers) {
			socket.emit('ERROR', { message: 'Lobby is full' })
			return
		}

		const player = data.player

		// Используем аутентифицированные данные вместо переданных клиентом
		const authenticatedPlayer: Player = {
			id: userId,
			name: username || 'Игрок',
			missions: player.missions || 0,
			hours: player.hours || 0,
			avatar: player.avatar,
			isReady: player.isReady || false,
		}

		// Добавляем/обновляем игрока
		const isNewPlayer = !lobby.players.has(userId)
		lobby.players.set(userId, authenticatedPlayer)

		this.logger.log(
			`Player ${authenticatedPlayer.name} ${isNewPlayer ? 'joined' : 'updated in'} lobby ${lobbyId}`
		)

		// Рассылаем обновленное состояние всем в лобби
		this.server.to(lobbyId).emit('LOBBY_STATE', {
			players: Array.from(lobby.players.values()),
			settings: lobby.settings,
			creatorId: lobby.creatorId,
		})
	}

	@SubscribeMessage('SEND_MESSAGE')
	handleSendMessage(socket: Socket, data: { message: any }) {
		const { lobbyId, username } = socket.data

		// Добавляем имя пользователя из аутентификации
		const messageWithAuth = {
			...data.message,
			playerName: username || 'Игрок',
		}

		// Рассылаем сообщение всем в лобби, включая отправителя
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

		// Проверяем, что пользователь может изменять только свой статус готовности
		if (playerId !== userId) {
			socket.emit('ERROR', {
				message: 'Cannot change other player ready status',
			})
			return
		}

		if (player) {
			player.isReady = data.isReady

			this.logger.log(`Player ${player.name} ready: ${data.isReady}`)

			// Рассылаем обновленное состояние всем в лобби
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

		// Проверяем, что только создатель лобби может менять настройки
		if (lobby.creatorId !== userId) {
			socket.emit('ERROR', {
				message: 'Only lobby creator can change settings',
			})
			return
		}

		Object.assign(lobby.settings, data.settings)

		// Рассылаем обновленные настройки всем в лобби
		this.server
			.to(lobbyId)
			.emit('LOBBY_SETTINGS_UPDATED', { settings: lobby.settings })
	}

	@SubscribeMessage('PLAYER_LEFT')
	handlePlayerLeft(socket: Socket, data: { playerId?: string }) {
		const { userId, lobbyId } = socket.data
		const lobby = this.lobbies.get(lobbyId)

		if (!lobby) return

		const playerId = data.playerId || userId

		// Проверяем, что пользователь может удалять только себя (если не создатель)
		if (playerId !== userId && lobby.creatorId !== userId) {
			socket.emit('ERROR', { message: 'Cannot remove other players' })
			return
		}

		const player = lobby.players.get(playerId)

		if (player) {
			lobby.players.delete(playerId)
			lobby.connections.delete(playerId)

			this.logger.log(`Player ${player.name} left lobby ${lobbyId}`)

			// Если это создатель, назначаем нового
			if (lobby.creatorId === playerId && lobby.players.size > 0) {
				const remainingPlayers = Array.from(lobby.players.keys())
				lobby.creatorId = remainingPlayers[0]
				this.logger.log(
					`New lobby creator: ${lobby.creatorId} for lobby ${lobbyId}`
				)
			}

			// Рассылаем обновленное состояние всем в лобби
			this.server.to(lobbyId).emit('LOBBY_STATE', {
				players: Array.from(lobby.players.values()),
				settings: lobby.settings,
				creatorId: lobby.creatorId,
			})

			// Если лобби пустое, удаляем его
			if (lobby.players.size === 0) {
				this.lobbies.delete(lobbyId)
				this.logger.log(`Lobby ${lobbyId} deleted (empty)`)
			}
		}
	}

	// Вспомогательный метод для получения состояния лобби (для отладки)
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

	// Вспомогательный метод для получения всех лобби (для отладки)
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
