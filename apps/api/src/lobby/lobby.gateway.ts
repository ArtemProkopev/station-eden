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
const GAME_ID_RE = /^game-[a-zA-Z0-9_-]+$/
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
    private readonly configService: ConfigService
  ) {}

  private lobbies = new Map<string, LobbyState>()
  private games = new Map<string, any>() // Временное хранилище игр
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
      const gameId = (socket.handshake.query.gameId as string) || ''

      if (!userId) {
        this.logger.warn('WS token payload has no "sub" (user id)')
        socket.emit('ERROR', { message: 'Invalid authentication token' })
        socket.disconnect(true)
        return
      }

      // Проверяем, подключается ли пользователь к игре
      if (gameId) {
        console.log(`[DEBUG] Game connection attempt: ${gameId} by ${username}`);
        
        if (!GAME_ID_RE.test(gameId)) {
          this.logger.warn(`Invalid gameId: "${gameId}"`)
          socket.emit('ERROR', { message: 'Invalid game id' })
          socket.disconnect(true)
          return
        }

        // Обрабатываем подключение к игре
        await this.handleGameConnection(socket, userId, username, gameId)
        return
      }

      // Обычное подключение к лобби
      if (!lobbyId || !LOBBY_ID_RE.test(lobbyId)) {
        this.logger.warn(`Invalid lobbyId: "${lobbyId}"`)
        socket.emit('ERROR', { message: 'Invalid lobby id' })
        socket.disconnect(true)
        return
      }

      // Проверяем, не началась ли уже игра в лобби
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
      socket.data.isGameConnection = false

      await socket.join(lobbyId)

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

  private async handleGameConnection(
    socket: Socket,
    userId: string,
    username: string,
    gameId: string
  ) {
    try {
      console.log(`[DEBUG] handleGameConnection: ${username} to ${gameId}`);
      
      // Проверяем существующую игру
      const game = this.games.get(gameId);
      console.log(`[DEBUG] Game found: ${game ? 'YES' : 'NO'}`);
      console.log(`[DEBUG] All games:`, Array.from(this.games.keys()));

      if (!game) {
        console.log(`[DEBUG] Game ${gameId} not found, creating test game`);
        // Создаем тестовую игру если ее нет
        const testGame = {
          id: gameId,
          lobbyId: 'test-lobby',
          status: 'active',
          players: [
            {
              id: userId,
              name: username,
              score: 0,
              order: 1,
              isActive: true,
              missions: 5,
              hours: 10,
              isReady: true,
            }
          ],
          creatorId: userId,
          currentPlayerId: userId,
          round: 1,
          maxRounds: 10,
          startedAt: new Date().toISOString(),
          settings: {
            gameMode: 'standard',
          },
        };
        
        this.games.set(gameId, testGame);
        console.log(`[DEBUG] Test game created for ${gameId}`);
        
        socket.data.userId = userId;
        socket.data.username = username;
        socket.data.gameId = gameId;
        socket.data.isGameConnection = true;

        await socket.join(gameId);

        console.log(`[DEBUG] Player ${username} connected to game ${gameId}`);

        // Отправляем состояние игры
        socket.emit('GAME_STATE', {
          gameState: testGame,
        });
        
        console.log(`[DEBUG] GAME_STATE sent for test game`);
        return;
      }

      if (game.status !== 'active') {
        console.log(`[DEBUG] Game ${gameId} is not active (status: ${game.status})`);
        socket.emit('ERROR', { message: 'Game is not active' });
        socket.disconnect(true);
        return;
      }

      socket.data.userId = userId;
      socket.data.username = username;
      socket.data.gameId = gameId;
      socket.data.isGameConnection = true;

      await socket.join(gameId);

      console.log(`[DEBUG] Player ${username} connected to existing game ${gameId}`);

      // Отправляем состояние игры
      socket.emit('GAME_STATE', {
        gameState: game,
      });
      
      console.log(`[DEBUG] GAME_STATE sent for existing game`);

      // Уведомляем других игроков
      socket.to(gameId).emit('PLAYER_JOINED_GAME', {
        playerId: userId,
        playerName: username,
      });

    } catch (error) {
      console.error('[DEBUG] Game connection error:', error);
      socket.emit('ERROR', { message: 'Game connection failed' });
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket) {
    const { userId, lobbyId, gameId, isGameConnection } = socket.data
    const ip = this.clientIp(socket)
    this.decConn(ip)

    if (isGameConnection && gameId) {
      // Обработка отключения от игры
      const game = this.games.get(gameId)
      if (game) {
        this.logger.log(`Player ${userId} disconnected from game ${gameId}`)

        // Уведомляем других игроков
        this.server.to(gameId).emit('PLAYER_LEFT_GAME', {
          playerId: userId,
        })

        // Очистка игры если все отключились
        setTimeout(() => {
          const currentGame = this.games.get(gameId)
          const lobbyIdFromGame = game.lobbyId
          const lobby = this.lobbies.get(lobbyIdFromGame)

          if (!lobby || lobby.connections.size === 0) {
            this.games.delete(gameId)
            this.logger.log(`Game ${gameId} cleaned up (no connections)`)
          }
        }, 300000) // 5 минут
      }
      return
    }

    // Обычное отключение от лобби
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

    // Проверяем, не началась ли уже игра
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

    const isNewPlayer = !lobby.players.has(userId)
    lobby.players.set(userId, authenticatedPlayer)

    this.logger.log(
      `Player ${authenticatedPlayer.name} ${
        isNewPlayer ? 'joined' : 'updated in'
      } lobby ${lobbyId}`
    )

    this.server.to(lobbyId).emit('LOBBY_STATE', {
      players: Array.from(lobby.players.values()),
      settings: { ...lobby.settings, maxPlayers: effectiveMax },
      creatorId: lobby.creatorId,
      gameStarted: lobby.gameStarted || false,
    })
  }

  @SubscribeMessage('SEND_MESSAGE')
  handleSendMessage(socket: Socket, data: { message: any }) {
    const { lobbyId, username, userId, isGameConnection, gameId } = socket.data
    
    if (isGameConnection && gameId) {
      // Обработка сообщений в игре
      this.handleGameMessage(socket, data)
      return
    }
    
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

  private handleGameMessage(socket: Socket, data: { message: any }) {
    const { userId, username, gameId } = socket.data
    const game = this.games.get(gameId)
    if (!game) return

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

    this.server.to(gameId).emit('CHAT_MESSAGE', { message: messageWithAuth })
  }

  @SubscribeMessage('TOGGLE_READY')
  handleToggleReady(
    socket: Socket,
    data: { playerId?: string; isReady: boolean }
  ) {
    const { userId, lobbyId, isGameConnection } = socket.data
    
    if (isGameConnection) {
      socket.emit('ERROR', { message: 'Cannot toggle ready in game' })
      return
    }
    
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby) return

    // Проверяем, не началась ли уже игра
    if (lobby.gameStarted) {
      socket.emit('ERROR', {
        message: 'Cannot change ready status - game has already started',
      })
      return
    }

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
        gameStarted: lobby.gameStarted || false,
      })
    }
  }

  @SubscribeMessage('UPDATE_LOBBY_SETTINGS')
  handleUpdateLobbySettings(
    socket: Socket,
    data: { settings: Partial<LobbySettings> }
  ) {
    const { userId, lobbyId, isGameConnection } = socket.data
    
    if (isGameConnection) {
      socket.emit('ERROR', { message: 'Cannot change settings in game' })
      return
    }
    
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby) return

    // Проверяем, не началась ли уже игра
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

    this.server.to(lobbyId).emit('LOBBY_SETTINGS_UPDATED', {
      settings: {
        ...lobby.settings,
        maxPlayers: Math.min(lobby.settings.maxPlayers, HARD_MAX_PLAYERS),
      },
    })
  }

  @SubscribeMessage('PLAYER_LEFT')
  handlePlayerLeft(socket: Socket, data: { playerId?: string }) {
    const { userId, lobbyId, isGameConnection } = socket.data
    
    if (isGameConnection) {
      socket.emit('ERROR', { message: 'Cannot leave lobby from game' })
      return
    }
    
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
        gameStarted: lobby.gameStarted || false,
      })

      if (lobby.players.size === 0 && lobby.connections.size === 0) {
        this.lobbies.delete(lobbyId)
        this.logger.log(`Lobby ${lobbyId} deleted (empty)`)
      }
    }
  }

  @SubscribeMessage('START_GAME')
  async handleStartGame(
    socket: Socket,
    data: { lobbyId?: string; creatorId?: string }
  ) {
    try {
      const { userId, lobbyId: socketLobbyId, username } = socket.data

      // Используем lobbyId из данных или из socket.data
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

      // Проверяем, что отправитель - создатель лобби
      if (lobby.creatorId !== userId) {
        socket.emit('ERROR', {
          message: 'Только создатель лобби может начать игру',
        })
        return
      }

      // Проверяем, не началась ли уже игра
      if (lobby.gameStarted) {
        socket.emit('ERROR', {
          message: 'Игра уже началась в этом лобби',
        })
        return
      }

      // Проверяем минимальное количество игроков
      if (lobby.players.size < 2) {
        socket.emit('ERROR', {
          message: 'Для начала игры нужно минимум 2 игрока',
        })
        return
      }

      // Проверяем, что все игроки готовы
      const notReadyPlayers = Array.from(lobby.players.values())
        .filter((p) => !p.isReady)
        .map((p) => p.name)

      if (notReadyPlayers.length > 0) {
        socket.emit('ERROR', {
          message: `Следующие игроки не готовы: ${notReadyPlayers.join(', ')}`,
        })
        return
      }

      // Генерируем уникальный ID для игры
      const gameId = `game-${targetLobbyId}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`

      // Помечаем лобби как начавшее игру
      lobby.gameStarted = true
      lobby.gameId = gameId

      // Создаем состояние игры
      const gameState = {
        id: gameId,
        lobbyId: targetLobbyId,
        status: 'active' as const,
        players: Array.from(lobby.players.values()).map((player, index) => ({
          ...player,
          score: 0,
          order: index + 1,
          isActive: true,
        })),
        creatorId: lobby.creatorId,
        currentPlayerId: Array.from(lobby.players.keys())[0],
        round: 1,
        maxRounds: 10,
        startedAt: new Date().toISOString(),
        settings: {
          gameMode: lobby.settings.gameMode || 'standard',
          difficulty: lobby.settings.difficulty,
          turnTime: lobby.settings.turnTime,
          tournamentMode: lobby.settings.tournamentMode,
          limitedResources: lobby.settings.limitedResources,
        },
      }

      // Сохраняем игру
      this.games.set(gameId, gameState)
      
      console.log(`[DEBUG] START_GAME: Game saved: ${gameId}`);
      console.log(`[DEBUG] START_GAME: Game players:`, gameState.players.map(p => ({ id: p.id, name: p.name })));
      console.log(`[DEBUG] START_GAME: Total games now:`, this.games.size);
      console.log(`[DEBUG] START_GAME: All game IDs:`, Array.from(this.games.keys()));

      this.logger.log(
        `Game started: ${gameId} from lobby ${targetLobbyId} by ${username}`
      )

      // Отправляем всем игрокам в лобби событие GAME_STARTED
      this.server.to(targetLobbyId).emit('GAME_STARTED', {
        gameId,
        redirectUrl: `/game/${gameId}`,
        gameState,
        message: 'Игра начинается! Перенаправление...',
      })

      // Добавляем системное сообщение в чат
      const systemMessage = {
        text: `Игра началась! ID игры: ${gameId}`,
        type: 'system' as const,
        playerId: 'system',
        playerName: 'Система',
        timestamp: new Date().toISOString(),
      }

      this.server.to(targetLobbyId).emit('CHAT_MESSAGE', {
        message: systemMessage,
      })

      // Очищаем лобби через некоторое время
      setTimeout(() => {
        if (this.lobbies.has(targetLobbyId)) {
          // Проверяем, что никто не остался в лобби
          const lobby = this.lobbies.get(targetLobbyId)
          if (lobby && lobby.connections.size === 0) {
            this.lobbies.delete(targetLobbyId)
            this.logger.log(`Lobby ${targetLobbyId} cleaned up after game start`)
          }
        }
      }, 30000) // 30 секунд
    } catch (error) {
      this.logger.error('Error in START_GAME:', error)
      socket.emit('ERROR', {
        message:
          'Ошибка при начале игры: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      })
    }
  }

  @SubscribeMessage('JOIN_GAME')
  handleJoinGame(socket: Socket, data: { gameId?: string }) {
    try {
      const { userId, username } = socket.data;
      const targetGameId = data?.gameId;

      console.log(`=== [DEBUG] JOIN_GAME START ===`);
      console.log(`[DEBUG] Target Game ID:`, targetGameId);
      console.log(`[DEBUG] User ID:`, userId);
      console.log(`[DEBUG] Username:`, username);
      console.log(`[DEBUG] Socket data:`, socket.data);
      console.log(`[DEBUG] All games:`, Array.from(this.games.keys()));

      if (!targetGameId) {
        console.log(`[DEBUG] No gameId provided`);
        socket.emit('ERROR', { message: 'Game ID is required' });
        return;
      }

      if (!GAME_ID_RE.test(targetGameId)) {
        console.log(`[DEBUG] Invalid game ID format: ${targetGameId}`);
        socket.emit('ERROR', { message: 'Invalid game ID format' });
        return;
      }

      // Ищем игру
      let game = this.games.get(targetGameId);
      console.log(`[DEBUG] Game found:`, game ? 'YES' : 'NO');
      
      if (!game) {
        console.log(`[DEBUG] Game ${targetGameId} not found in games Map`);
        console.log(`[DEBUG] Creating test game for ${targetGameId}`);
        
        // Создаем тестовую игру
        game = {
          id: targetGameId,
          lobbyId: 'test-lobby',
          status: 'active',
          players: [
            {
              id: userId,
              name: username,
              score: 0,
              order: 1,
              isActive: true,
              missions: 5,
              hours: 10,
              isReady: true,
            }
          ],
          creatorId: userId,
          currentPlayerId: userId,
          round: 1,
          maxRounds: 10,
          startedAt: new Date().toISOString(),
          settings: {
            gameMode: 'standard',
          },
        };
        
        this.games.set(targetGameId, game);
        console.log(`[DEBUG] Test game created for ${targetGameId}`);
      }

      console.log(`[DEBUG] Game status:`, game.status);
      console.log(`[DEBUG] Game players:`, game.players);

      if (game.status !== 'active') {
        console.log(`[DEBUG] Game is not active (status: ${game.status})`);
        socket.emit('ERROR', { message: 'Game is not active' });
        return;
      }

      // Проверяем, является ли пользователь игроком
      const playerInGame = game.players.find((p: any) => p.id === userId);
      console.log(`[DEBUG] Player in game:`, playerInGame ? 'YES' : 'NO');
      
      if (!playerInGame) {
        console.log(`[DEBUG] User ${userId} is not in game players, adding...`);
        // Добавляем пользователя в игру
        game.players.push({
          id: userId,
          name: username,
          score: 0,
          order: game.players.length + 1,
          isActive: true,
          missions: 0,
          hours: 0,
          isReady: true,
        });
        this.games.set(targetGameId, game);
        console.log(`[DEBUG] User added to game ${targetGameId}`);
      }

      // Добавляем пользователя в комнату игры
      socket.join(targetGameId);
      
      // Обновляем socket.data для игрового подключения
      socket.data.gameId = targetGameId;
      socket.data.isGameConnection = true;

      console.log(`[DEBUG] Player ${username} successfully joined game ${targetGameId}`);

      // Отправляем состояние игры
      socket.emit('GAME_STATE', {
        gameState: game,
      });

      console.log(`[DEBUG] GAME_STATE sent to player ${username}`);

      // Уведомляем других игроков
      socket.to(targetGameId).emit('PLAYER_JOINED_GAME', {
        playerId: userId,
        playerName: username,
      });

      console.log(`=== [DEBUG] JOIN_GAME END ===`);

    } catch (error) {
      console.error(`[DEBUG] Error in JOIN_GAME:`, error);
      socket.emit('ERROR', { 
        message: 'Error joining game: ' + (error instanceof Error ? error.message : 'Unknown error') 
      });
    }
  }

  @SubscribeMessage('GAME_ACTION')
  handleGameAction(
    socket: Socket,
    data: { action: string; payload?: any; gameId?: string }
  ) {
    const { userId, gameId: socketGameId, isGameConnection } = socket.data

    if (!isGameConnection) {
      socket.emit('ERROR', { message: 'Not a game connection' })
      return
    }

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

    if (game.status !== 'active') {
      socket.emit('ERROR', { message: 'Game is not active' })
      return
    }

    // Проверяем, что ход текущего игрока
    if (game.currentPlayerId !== userId && data.action !== 'end_game') {
      socket.emit('ERROR', { message: 'Not your turn' })
      return
    }

    console.log(`[DEBUG] GAME_ACTION: ${data.action} by ${userId} in game ${targetGameId}`);

    switch (data.action) {
      case 'skip_turn':
        this.handleGameSkipTurn(game)
        break
      case 'end_game':
        this.handleGameEnd(game, userId)
        break
      case 'player_action':
        // Простая логика для тестирования
        this.handlePlayerGameAction(game, userId, data.payload)
        break
      default:
        socket.emit('ERROR', { message: 'Unknown action' })
        return
    }

    // Сохраняем обновленное состояние
    this.games.set(targetGameId, game)

    // Отправляем обновленное состояние всем
    this.server.to(targetGameId).emit('GAME_UPDATE', {
      gameState: game,
    })
  }

  @SubscribeMessage('LEAVE_GAME')
  handleLeaveGame(socket: Socket, data: { gameId?: string }) {
    const { userId, username, gameId: socketGameId, isGameConnection } = socket.data

    if (!isGameConnection) {
      socket.emit('ERROR', { message: 'Not a game connection' })
      return
    }

    const targetGameId = data?.gameId || socketGameId

    if (!targetGameId) return

    const game = this.games.get(targetGameId)
    if (!game) return

    this.logger.log(`Player ${username} left game ${targetGameId}`)

    // Уведомляем остальных игроков
    this.server.to(targetGameId).emit('PLAYER_LEFT_GAME', {
      playerId: userId,
      playerName: username,
    })

    socket.emit('LEAVE_CONFIRMED', {
      message: 'You left the game',
    })

    // Отключаем от комнаты игры
    socket.leave(targetGameId)
  }

  private handleGameSkipTurn(game: any) {
    const playerIds = game.players.map((p: any) => p.id)
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

  private handleGameEnd(game: any, userId: string) {
    if (game.creatorId !== userId) {
      this.logger.warn(`Player ${userId} tried to end game without permission`)
      return
    }

    game.status = 'cancelled'
    game.finishedAt = new Date().toISOString()

    this.logger.log(`Game ${game.id} cancelled by ${userId}`)

    // Уведомляем всех
    this.server.to(game.id).emit('GAME_FINISHED', {
      gameState: game,
      reason: 'cancelled_by_creator',
    })
  }

  private handlePlayerGameAction(game: any, userId: string, payload: any) {
    // Простая логика для тестирования
    const player = game.players.find((p: any) => p.id === userId)
    if (player) {
      // Добавляем очки
      player.score += payload?.points || 1

      // Переход хода
      this.handleGameSkipTurn(game)
    }
  }

  private finishGame(game: any) {
    game.status = 'finished'
    game.finishedAt = new Date().toISOString()

    // Определяем победителя
    let maxScore = -1
    let winnerId = ''

    for (const player of game.players) {
      if (player.score > maxScore) {
        maxScore = player.score
        winnerId = player.id
      }
    }

    game.winnerId = winnerId

    this.logger.log(`Game ${game.id} finished. Winner: ${winnerId}`)

    this.server.to(game.id).emit('GAME_FINISHED', {
      gameState: game,
      reason: 'game_completed',
    })
  }

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
      players: Array.from(lobby.players.values()).map((p) => p.name),
      settings: lobby.settings,
      creatorId: lobby.creatorId,
      connections: lobby.connections.size,
      gameStarted: lobby.gameStarted || false,
      gameId: lobby.gameId,
    }))
  }

  getGameState(gameId: string) {
    return this.games.get(gameId) || null
  }

  getAllGames() {
    return Array.from(this.games.entries()).map(([gameId, game]) => ({
      gameId,
      status: game.status,
      players: game.players.map((p: any) => p.name),
      round: game.round,
      startedAt: game.startedAt,
    }))
  }
}