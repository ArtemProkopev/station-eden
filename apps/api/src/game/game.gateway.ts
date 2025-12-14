// apps/api/src/game/game.gateway.ts
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

type GamePlayer = {
  id: string
  name: string
  missions: number
  hours: number
  avatar?: string
  score: number
  order: number
  isActive: boolean
}

type GameSettings = {
  gameMode: string
  maxRounds?: number
  difficulty?: string
  turnTime?: number
  limitedResources?: boolean
  tournamentMode?: boolean
}

type GameState = {
  id: string
  lobbyId: string
  status: 'waiting' | 'active' | 'finished' | 'cancelled'
  players: Map<string, GamePlayer>
  connections: Map<string, Socket>
  creatorId: string
  currentPlayerId: string
  round: number
  maxRounds?: number
  startedAt: string
  finishedAt?: string
  winnerId?: string
  settings: GameSettings
}

const GAME_ID_RE = /^game-[a-zA-Z0-9_-]+$/
const MSG_WINDOW_MS = 10_000
const MSG_MAX_PER_WINDOW = 15

@WebSocketGateway({
  path: '/game',
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
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(GameGateway.name)

  @WebSocketServer()
  private server!: Server

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  private games = new Map<string, GameState>()
  private msgBuckets = new Map<string, { windowStart: number; count: number }>()

  private now() {
    return Date.now()
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
    this.logger.log('GameGateway initialized')
  }

  async handleConnection(socket: Socket) {
    try {
      const rawCookie = socket.handshake.headers.cookie || ''
      const cookies = rawCookie ? cookie.parse(rawCookie) : {}

      const accessCookieName =
        this.configService.get<string>('ACCESS_TOKEN_COOKIE_NAME') ||
        'access_token'

      const token = cookies[accessCookieName]

      if (!token) {
        this.logger.warn(`Unauthorized game connection attempt`)
        socket.emit('ERROR', { message: 'Authentication required' })
        socket.disconnect(true)
        return
      }

      const jwtSecret =
        this.configService.get<string>('JWT_ACCESS_SECRET') ||
        this.configService.get<string>('JWT_SECRET')

      let payload: any
      try {
        payload = await this.jwtService.verifyAsync(token, {
          secret: jwtSecret,
        })
      } catch (err) {
        this.logger.warn(`Invalid game token: ${(err as Error).message || err}`)
        socket.emit('ERROR', { message: 'Invalid authentication token' })
        socket.disconnect(true)
        return
      }

      const userId = String(payload.sub || '')
      const username = String(payload.username || '') || 'Игрок'
      const gameId = (socket.handshake.query.gameId as string) || ''

      if (!userId) {
        socket.emit('ERROR', { message: 'Invalid authentication token' })
        socket.disconnect(true)
        return
      }

      if (!gameId || !GAME_ID_RE.test(gameId)) {
        this.logger.warn(`Invalid gameId: "${gameId}"`)
        socket.emit('ERROR', { message: 'Invalid game id' })
        socket.disconnect(true)
        return
      }

      const game = this.games.get(gameId)
      if (!game) {
        socket.emit('ERROR', { message: 'Game not found' })
        socket.disconnect(true)
        return
      }

      if (game.status !== 'active' && game.status !== 'waiting') {
        socket.emit('ERROR', { message: 'Game is not active' })
        socket.disconnect(true)
        return
      }

      socket.data.userId = userId
      socket.data.username = username
      socket.data.gameId = gameId

      await socket.join(gameId)

      game.connections.set(userId, socket)

      this.logger.log(`Player connected to game: ${username} (${userId}) to game ${gameId}`)

      // Отправляем текущее состояние игры
      socket.emit('GAME_STATE', {
        gameState: this.serializeGameState(game),
      })

    } catch (error) {
      this.logger.error('Game connection error:', error)
      socket.emit('ERROR', { message: 'Connection failed' })
      socket.disconnect(true)
    }
  }

  handleDisconnect(socket: Socket) {
    const { userId, gameId } = socket.data
    if (!userId || !gameId) return

    const game = this.games.get(gameId)
    if (!game) return

    game.connections.delete(userId)

    this.logger.log(`Player disconnected from game: ${userId} from game ${gameId}`)

    // Если все отключились, можно очистить игру через некоторое время
    if (game.connections.size === 0) {
      setTimeout(() => {
        const currentGame = this.games.get(gameId)
        if (currentGame && currentGame.connections.size === 0) {
          this.games.delete(gameId)
          this.logger.log(`Game ${gameId} cleaned up (no connections)`)
        }
      }, 300000) // 5 минут
    }
  }

  @SubscribeMessage('JOIN_GAME')
  handleJoinGame(socket: Socket, data: { gameId?: string }) {
    const { userId, username, gameId: socketGameId } = socket.data
    const targetGameId = data?.gameId || socketGameId
    
    if (!targetGameId) {
      socket.emit('ERROR', { message: 'Game ID is required' })
      return
    }

    const game = this.games.get(targetGameId)
    if (!game) {
      socket.emit('ERROR', { message: 'Game not found' })
      return
    }

    const player = game.players.get(userId)
    if (!player) {
      socket.emit('ERROR', { message: 'You are not a player in this game' })
      return
    }

    this.logger.log(`Player ${username} joined game ${targetGameId}`)

    // Отправляем обновленное состояние всем
    this.server.to(targetGameId).emit('GAME_UPDATE', {
      gameState: this.serializeGameState(game),
    })
  }

  @SubscribeMessage('LEAVE_GAME')
  handleLeaveGame(socket: Socket, data: { gameId?: string }) {
    const { userId, username, gameId: socketGameId } = socket.data
    const targetGameId = data?.gameId || socketGameId
    
    if (!targetGameId) return

    const game = this.games.get(targetGameId)
    if (!game) return

    game.connections.delete(userId)
    socket.leave(targetGameId)

    this.logger.log(`Player ${username} left game ${targetGameId}`)

    // Уведомляем остальных игроков
    this.server.to(targetGameId).emit('PLAYER_LEFT_GAME', {
      playerId: userId,
      playerName: username,
    })

    socket.emit('LEAVE_CONFIRMED', {
      message: 'You left the game',
    })
  }

  @SubscribeMessage('GAME_ACTION')
  handleGameAction(socket: Socket, data: { 
    action: string
    payload?: any 
    gameId?: string 
  }) {
    const { userId, gameId: socketGameId } = socket.data
    const targetGameId = data?.gameId || socketGameId
    
    if (!targetGameId) return

    const game = this.games.get(targetGameId)
    if (!game) {
      socket.emit('ERROR', { message: 'Game not found' })
      return
    }

    if (game.status !== 'active') {
      socket.emit('ERROR', { message: 'Game is not active' })
      return
    }

    // Проверяем, что ход текущего игрока
    if (game.currentPlayerId !== userId && data.action !== 'end_game') {
      socket.emit('ERROR', { message: 'Not your turn' })
      return
    }

    switch (data.action) {
      case 'skip_turn':
        this.handleSkipTurn(game)
        break
      case 'end_game':
        this.handleEndGame(game, userId)
        break
      case 'player_action':
        // Здесь будет логика игрового действия
        this.handlePlayerAction(game, userId, data.payload)
        break
      default:
        socket.emit('ERROR', { message: 'Unknown action' })
        return
    }

    // Отправляем обновленное состояние всем
    this.server.to(targetGameId).emit('GAME_UPDATE', {
      gameState: this.serializeGameState(game),
    })
  }

  private handleSkipTurn(game: GameState) {
    const playerIds = Array.from(game.players.keys())
    const currentIndex = playerIds.indexOf(game.currentPlayerId)
    const nextIndex = (currentIndex + 1) % playerIds.length
    game.currentPlayerId = playerIds[nextIndex]
    
    // Если это был последний игрок в раунде
    if (nextIndex === 0) {
      game.round++
      
      // Проверка окончания игры
      if (game.maxRounds && game.round > game.maxRounds) {
        this.finishGame(game)
      }
    }
  }

  private handleEndGame(game: GameState, userId: string) {
    if (game.creatorId !== userId) {
      this.logger.warn(`Player ${userId} tried to end game without permission`)
      return
    }
    
    game.status = 'cancelled'
    game.finishedAt = new Date().toISOString()
    
    this.logger.log(`Game ${game.id} cancelled by ${userId}`)
    
    // Уведомляем всех
    this.server.to(game.id).emit('GAME_FINISHED', {
      gameState: this.serializeGameState(game),
      reason: 'cancelled_by_creator'
    })
  }

  private handlePlayerAction(game: GameState, userId: string, payload: any) {
    // Здесь будет игровая логика
    const player = game.players.get(userId)
    if (player) {
      // Пример: добавить очки
      player.score += payload?.points || 1
      
      // Переход хода
      this.handleSkipTurn(game)
    }
  }

  private finishGame(game: GameState) {
    game.status = 'finished'
    game.finishedAt = new Date().toISOString()
    
    // Определяем победителя (по наибольшему количеству очков)
    let maxScore = -1
    let winnerId = ''
    
    for (const [playerId, player] of game.players) {
      if (player.score > maxScore) {
        maxScore = player.score
        winnerId = playerId
      }
    }
    
    game.winnerId = winnerId
    
    this.logger.log(`Game ${game.id} finished. Winner: ${winnerId}`)
    
    this.server.to(game.id).emit('GAME_FINISHED', {
      gameState: this.serializeGameState(game),
      reason: 'game_completed'
    })
  }

  private serializeGameState(game: GameState) {
    return {
      id: game.id,
      lobbyId: game.lobbyId,
      status: game.status,
      players: Array.from(game.players.values()),
      creatorId: game.creatorId,
      currentPlayerId: game.currentPlayerId,
      round: game.round,
      maxRounds: game.maxRounds,
      startedAt: game.startedAt,
      finishedAt: game.finishedAt,
      winnerId: game.winnerId,
      settings: game.settings,
    }
  }

  // Метод для создания игры из лобби (будет вызываться из LobbyGateway)
  createGameFromLobby(lobbyId: string, gameId: string, players: any[], creatorId: string, settings: any) {
    const gamePlayers = new Map<string, GamePlayer>()
    
    players.forEach((player, index) => {
      gamePlayers.set(player.id, {
        ...player,
        score: 0,
        order: index + 1,
        isActive: true,
      })
    })

    const gameState: GameState = {
      id: gameId,
      lobbyId,
      status: 'active',
      players: gamePlayers,
      connections: new Map(),
      creatorId,
      currentPlayerId: players[0]?.id || '',
      round: 1,
      startedAt: new Date().toISOString(),
      settings: {
        gameMode: settings?.gameMode || 'standard',
        maxRounds: settings?.maxRounds || 10,
        difficulty: settings?.difficulty,
        turnTime: settings?.turnTime,
        limitedResources: settings?.limitedResources,
        tournamentMode: settings?.tournamentMode,
      },
    }

    this.games.set(gameId, gameState)
    this.logger.log(`Game created: ${gameId} from lobby ${lobbyId}`)
    
    return gameState
  }

  getGameState(gameId: string) {
    const game = this.games.get(gameId)
    if (!game) return null
    return this.serializeGameState(game)
  }

  getAllGames() {
    return Array.from(this.games.entries()).map(([gameId, game]) => ({
      gameId,
      status: game.status,
      players: Array.from(game.players.values()).map(p => p.name),
      round: game.round,
      startedAt: game.startedAt,
    }))
  }
}