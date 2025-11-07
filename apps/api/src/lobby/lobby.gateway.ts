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
			console.log(
				'New WebSocket connection attempt, headers:',
				socket.handshake.headers
			)
			console.log('Query params:', socket.handshake.query)

			const rawCookie = socket.handshake.headers.cookie || ''
			const cookies = cookie.parse(rawCookie)
			const token = cookies['access_token']
			console.log('Token present:', !!token)

			let userId: string
			let userName = 'Игрок'
			let lobbyId = socket.handshake.query.lobbyId as string

			if (!lobbyId) {
				lobbyId = 'default-lobby'
			}

			// Аутентификация
			if (token) {
				try {
					const payload = await this.jwtService.verifyAsync(token, {
						secret: process.env.JWT_ACCESS_SECRET!,
					})
					userId = payload.sub
					userName = payload.username || userName
				} catch (error) {
					this.logger.warn('Invalid token, using anonymous connection')
					userId = `anon-${Math.random().toString(36).slice(2, 10)}`
				}
			} else {
				userId = `anon-${Math.random().toString(36).slice(2, 10)}`
			}

			socket.data.userId = userId
			socket.data.lobbyId = lobbyId

			// Инициализируем лобби если не существует
			if (!this.lobbies.has(lobbyId)) {
				this.lobbies.set(lobbyId, {
					settings: { ...DEFAULT_LOBBY_SETTINGS },
					players: new Map(),
				})
			}

			const lobby = this.lobbies.get(lobbyId)!

			// Создаем базовую информацию об игроке
			const player: Player = {
				id: userId,
				name: userName,
				missions: 0,
				hours: 0,
				isReady: false,
			}

			// Добавляем игрока в лобби при подключении
			lobby.players.set(userId, player)

			// Присоединяем к комнате лобби
			await socket.join(lobbyId)

			this.logger.log(`Player connected: ${userId} to lobby ${lobbyId}`)
			this.logger.log(`Lobby ${lobbyId} now has ${lobby.players.size} players`)

			// Отправляем текущее состояние лобби всем участникам
			this.server.to(lobbyId).emit('LOBBY_STATE', {
				players: Array.from(lobby.players.values()),
				settings: lobby.settings,
			})
		} catch (error) {
			this.logger.error('Connection error:', error)
			socket.disconnect()
		}
	}

	handleDisconnect(socket: Socket) {
		const { userId, lobbyId } = socket.data

		if (!userId || !lobbyId) return

		const lobby = this.lobbies.get(lobbyId)
		if (lobby?.players.has(userId)) {
			const playerName = lobby.players.get(userId)?.name
			lobby.players.delete(userId)

			// Уведомляем всех о выходе игрока
			this.server.to(lobbyId).emit('PLAYER_LEFT', { playerId: userId })

			// Обновляем состояние лобби для всех оставшихся игроков
			this.server.to(lobbyId).emit('LOBBY_STATE', {
				players: Array.from(lobby.players.values()),
				settings: lobby.settings,
			})

			// Если лобби пустое, удаляем его
			if (lobby.players.size === 0) {
				this.lobbies.delete(lobbyId)
				this.logger.log(`Lobby ${lobbyId} deleted (empty)`)
			}

			this.logger.log(
				`Player disconnected: ${playerName} from lobby ${lobbyId}`
			)
		}
	}

	@SubscribeMessage('JOIN_LOBBY')
	handleJoinLobby(socket: Socket, data: { player: Player }) {
		const { lobbyId, userId } = socket.data
		const lobby = this.lobbies.get(lobbyId)

		if (!lobby) {
			socket.emit('ERROR', { message: 'Lobby not found' })
			return
		}

		// Проверяем лимит игроков
		if (lobby.players.size >= lobby.settings.maxPlayers) {
			socket.emit('ERROR', { message: 'Lobby is full' })
			return
		}

		const player = data.player

		// Обновляем или добавляем игрока
		lobby.players.set(player.id, player)

		this.logger.log(`Player ${player.name} joined lobby ${lobbyId}`)
		this.logger.log(`Lobby ${lobbyId} now has ${lobby.players.size} players`)

		// Уведомляем всех в лобби о новом игроке
		this.server.to(lobbyId).emit('PLAYER_JOINED', { player })

		// Также отправляем обновленное состояние всем
		this.server.to(lobbyId).emit('LOBBY_STATE', {
			players: Array.from(lobby.players.values()),
			settings: lobby.settings,
		})
	}

	@SubscribeMessage('UPDATE_PLAYER_PROFILE')
	handleUpdatePlayerProfile(socket: Socket, data: { player: Partial<Player> }) {
		const { userId, lobbyId } = socket.data
		const lobby = this.lobbies.get(lobbyId)

		if (!lobby) return

		const player = lobby.players.get(userId)
		if (player) {
			// Обновляем данные игрока
			Object.assign(player, data.player)

			this.logger.log(`Player profile updated: ${player.name}`)

			// Уведомляем всех об изменении
			this.server.to(lobbyId).emit('LOBBY_STATE', {
				players: Array.from(lobby.players.values()),
				settings: lobby.settings,
			})
		}
	}

	@SubscribeMessage('SEND_MESSAGE')
	handleSendMessage(socket: Socket, data: { message: any }) {
		const { lobbyId } = socket.data

		// Рассылаем сообщение всем в лобби, кроме отправителя
		socket.to(lobbyId).emit('CHAT_MESSAGE', { message: data.message })

		// Подтверждение отправителю
		socket.emit('MESSAGE_SENT', { messageId: data.message.id })
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

		if (player) {
			player.isReady = data.isReady

			this.logger.log(`Player ${player.name} ready: ${data.isReady}`)

			// Уведомляем всех в лобби об изменении готовности
			this.server.to(lobbyId).emit('PLAYER_READY', {
				playerId,
				isReady: player.isReady,
			})

			// Также отправляем полное состояние для синхронизации
			this.server.to(lobbyId).emit('LOBBY_STATE', {
				players: Array.from(lobby.players.values()),
				settings: lobby.settings,
			})
		}
	}

	@SubscribeMessage('UPDATE_LOBBY_SETTINGS')
	handleUpdateLobbySettings(
		socket: Socket,
		data: { settings: Partial<LobbySettings> }
	) {
		const { lobbyId } = socket.data
		const lobby = this.lobbies.get(lobbyId)

		if (!lobby) return

		Object.assign(lobby.settings, data.settings)

		this.logger.log(`Lobby settings updated for ${lobbyId}`)

		// Подтверждение инициатору
		socket.emit('LOBBY_SETTINGS_UPDATE_SUCCESS', { settings: lobby.settings })

		// Уведомление всех остальных в лобби
		socket
			.to(lobbyId)
			.emit('LOBBY_SETTINGS_UPDATED', { settings: lobby.settings })

		// Отправляем полное состояние для синхронизации
		this.server.to(lobbyId).emit('LOBBY_STATE', {
			players: Array.from(lobby.players.values()),
			settings: lobby.settings,
		})
	}

	@SubscribeMessage('PLAYER_LEFT')
	handlePlayerLeft(socket: Socket, data: { playerId?: string }) {
		const { userId, lobbyId } = socket.data
		const lobby = this.lobbies.get(lobbyId)

		if (!lobby) return

		const playerId = data.playerId || userId
		const player = lobby.players.get(playerId)

		if (player) {
			lobby.players.delete(playerId)

			this.logger.log(`Player ${player.name} left lobby ${lobbyId}`)

			// Уведомляем всех в лобби о выходе игрока
			this.server.to(lobbyId).emit('PLAYER_LEFT', { playerId })

			// Обновляем состояние лобби
			this.server.to(lobbyId).emit('LOBBY_STATE', {
				players: Array.from(lobby.players.values()),
				settings: lobby.settings,
			})
		}
	}
}
