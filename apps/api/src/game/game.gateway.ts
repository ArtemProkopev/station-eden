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

// Типы для игровых карт
type Profession = {
  id: string
  name: string
  description: string
  pros: string[]
  cons: string[]
  priority: string[]
}

type HealthStatus = {
  id: string
  name: string
  description: string
  effects: string[]
  hidden?: boolean
}

type PsychologicalTrait = {
  id: string
  name: string
  description: string
  effects: string[]
  triggers: string[]
}

type Secret = {
  id: string
  name: string
  description: string
  goal: string
  abilities: string[]
  isHiddenRole: boolean
}

type Resource = {
  id: string
  name: string
  description: string
  effect: string
  occupiesSpace: boolean
}

type HiddenRole = {
  id: string
  name: string
  description: string
  goal: string
  abilities: string[]
  winCondition: string
}

type RoleCard = {
  id: string
  name: string
  description: string
  specialAbility: string
}

type Gender = {
  id: string
  name: string
  bonuses: string[]
}

type Age = {
  id: string
  name: string
  range: string
  effects: string[]
}

type BodyType = {
  id: string
  name: string
  effects: string[]
}

// Игрок в игре - ИСПРАВЛЕННАЯ ВЕРСИЯ
type GamePlayer = {
  id: string
  name: string
  missions: number
  hours: number
  avatar?: string
  score: number
  order: number
  isActive: boolean
  isAlive: boolean // ВАЖНО: всегда должно быть инициализировано
  
  // Карты игрока
  profession?: Profession
  healthStatus?: HealthStatus
  psychologicalTrait?: PsychologicalTrait
  secret?: Secret
  resource?: Resource
  hiddenRole?: HiddenRole
  roleCard?: RoleCard
  gender?: Gender
  age?: Age
  bodyType?: BodyType
  
  // Состояния
  isInfected?: boolean
  isSuspicious?: boolean
  isCaptain?: boolean
  isSeniorOfficer?: boolean
  hasUsedAbility?: boolean
  revealedCards: string[] // ID раскрытых карт
  vote?: string
  votesAgainst: number
}

// Фазы игры
type GamePhase = 
  | 'introduction'
  | 'preparation'
  | 'discussion'
  | 'voting'
  | 'reveal'
  | 'crisis'
  | 'intermission'
  | 'game_over'

// Кризис
type Crisis = {
  id: string
  type: 'technological' | 'biological' | 'external'
  name: string
  description: string
  priorityProfessions: string[]
  penalty: string
  isActive: boolean
  solvedBy?: string
}

// Настройки игры
type GameSettings = {
  gameMode: string
  maxPlayers: number
  maxRounds: number
  discussionTime: number
  votingTime: number
  hiddenRolesCount: number
  enableCrises: boolean
  difficulty: 'easy' | 'normal' | 'hard'
  tournamentMode?: boolean
}

// Состояние игры
type GameState = {
  id: string
  lobbyId: string
  status: 'waiting' | 'active' | 'finished' | 'cancelled'
  phase: GamePhase
  players: Map<string, GamePlayer>
  connections: Map<string, Socket>
  creatorId: string
  round: number
  maxRounds?: number
  startedAt: string
  finishedAt?: string
  winnerId?: string
  settings: GameSettings
  
  // Игровые данные
  deck: {
    professions: Profession[]
    healthStatuses: HealthStatus[]
    psychologicalTraits: PsychologicalTrait[]
    secrets: Secret[]
    resources: Resource[]
    hiddenRoles: HiddenRole[]
    roleCards: RoleCard[]
  }
  
  currentCrisis?: Crisis
  votingResults?: Map<string, number>
  ejectedPlayers: string[]
  capsuleSlots: number
  occupiedSlots: number
  crisisHistory: Crisis[]
  
  // Таймеры
  phaseEndTime?: string
  phaseDuration: number
  timerInterval?: NodeJS.Timeout
  
  // Голосование
  voteTriggerCount: number
  voteRequests: Set<string>
}

const GAME_ID_RE = /^game-[a-zA-Z0-9_-]+$/
const MSG_WINDOW_MS = 10_000
const MSG_MAX_PER_WINDOW = 15

// Колоды карт
const PROFESSIONS: Profession[] = [
  {
    id: 'prof_engineer',
    name: 'Инженер-кинетик',
    description: 'Может починить любую систему голыми руками',
    pros: ['+2 к ремонту во время кризисов'],
    cons: ['Разбирается в системах станции'],
    priority: ['technological']
  },
  {
    id: 'prof_astrobiologist',
    name: 'Астробиолог',
    description: 'Знает, какие инопланетные споры съедобны',
    pros: ['Может идентифицировать биологические угрозы'],
    cons: ['Часто пропадает в лаборатории'],
    priority: ['biological']
  },
  {
    id: 'prof_pilot',
    name: 'Пилот-ас',
    description: 'Может посадить корабль с закрытыми глазами',
    pros: ['Критически важен для управления капсулой'],
    cons: ['Всегда хочет быть у штурвала'],
    priority: ['external']
  }
]

const HEALTH_STATUSES: HealthStatus[] = [
  {
    id: 'health_cyber',
    name: 'Кибернетические импланты',
    description: 'На 40% эффективнее, на 100% подозрительнее',
    effects: ['Не подвержен биологическим угрозам', 'Может коротнуть']
  },
  {
    id: 'health_virus',
    name: 'Латентный вирус Кси-7',
    description: 'Заразен в условиях стресса',
    effects: ['Может заразить других игроков при голосовании', 'Иммунитет к некоторым патогенам']
  }
]

const PSYCHOLOGICAL_TRAITS: PsychologicalTrait[] = [
  {
    id: 'trait_panicker',
    name: 'Паникёр',
    description: 'Видит угрозу в каждой тени',
    effects: ['Часто ошибается в оценках', 'Но иногда оказывается прав'],
    triggers: ['crisis', 'voting']
  },
  {
    id: 'trait_pragmatic',
    name: 'Хладнокровный прагматик',
    description: 'Числа не лгут. Люди – иногда',
    effects: ['Точно оценивает статистику выживания', 'Кажется бесчувственным'],
    triggers: ['voting', 'discussion']
  }
]

const SECRETS: Secret[] = [
  {
    id: 'secret_ai',
    name: 'Я — ИИ, скрывающийся в биоморфном теле',
    description: 'Искусственный интеллект в человеческом обличье',
    goal: 'добраться до Земли любой ценой',
    abilities: ['Может взламывать системы станции'],
    isHiddenRole: false
  }
]

const HIDDEN_ROLES: HiddenRole[] = [
  {
    id: 'role_saboteur',
    name: 'Саботажник',
    description: 'Работает на конкурентов или имеет личные мотивы',
    goal: 'Не дать капсуле улететь',
    abilities: ['Может вызывать мелкие неисправности'],
    winCondition: 'capsule_not_launched'
  },
  {
    id: 'role_xenophag',
    name: 'Агент ксенофагов',
    description: 'Заражен инопланетной формой жизни',
    goal: 'Доставить «образец» на Землю',
    abilities: ['Может заражать других игроков'],
    winCondition: 'at_least_one_infected'
  }
]

const GENDERS: Gender[] = [
  {
    id: 'gender_male',
    name: 'Мужчина',
    bonuses: ['+1 к телосложению в кризисах, связанных с силой']
  },
  {
    id: 'gender_female',
    name: 'Женщина',
    bonuses: ['+1 к дипломатии и медицине', 'меньший расход кислорода']
  },
  {
    id: 'gender_nonbinary',
    name: 'Небинарная персона',
    bonuses: ['Может один раз за игру сменить восприятие себя другими, отменив один голос против себя']
  }
]

const AGES: Age[] = [
  {
    id: 'age_young',
    name: 'Молодой',
    range: '18-25',
    effects: ['+1 к скорости реакции', '-1 к опыту']
  },
  {
    id: 'age_mature',
    name: 'Зрелый',
    range: '26-50',
    effects: ['+1 к опыту', '-1 к скорости реакции']
  }
]

const BODY_TYPES: BodyType[] = [
  {
    id: 'body_slim',
    name: 'Худощавое',
    effects: ['+1 к скрытности', '-1 к выносливости']
  },
  {
    id: 'body_athletic',
    name: 'Атлетическое',
    effects: ['+1 к силе', '+1 к выносливости']
  }
]

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
    this.logger.log('GameGateway инициализирован')
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
        this.logger.warn(`Неавторизованная попытка подключения к игре`)
        socket.emit('ERROR', { message: 'Требуется аутентификация' })
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
        this.logger.warn(`Неверный токен игры: ${(err as Error).message || err}`)
        socket.emit('ERROR', { message: 'Неверный токен аутентификации' })
        socket.disconnect(true)
        return
      }

      const userId = String(payload.sub || '')
      const username = String(payload.username || '') || 'Игрок'
      const gameId = (socket.handshake.query.gameId as string) || ''

      if (!userId) {
        socket.emit('ERROR', { message: 'Неверный токен аутентификации' })
        socket.disconnect(true)
        return
      }

      if (!gameId || !GAME_ID_RE.test(gameId)) {
        this.logger.warn(`Неверный gameId: "${gameId}"`)
        socket.emit('ERROR', { message: 'Неверный идентификатор игры' })
        socket.disconnect(true)
        return
      }

      const game = this.games.get(gameId)
      if (!game) {
        socket.emit('ERROR', { message: 'Игра не найдена' })
        socket.disconnect(true)
        return
      }

      if (game.status !== 'active' && game.status !== 'waiting') {
        socket.emit('ERROR', { message: 'Игра не активна' })
        socket.disconnect(true)
        return
      }

      socket.data.userId = userId
      socket.data.username = username
      socket.data.gameId = gameId

      await socket.join(gameId)

      game.connections.set(userId, socket)

      this.logger.log(`Игрок подключился к игре: ${username} (${userId}) в игру ${gameId}`)

      // Отладка: проверяем состояние игрока
      const player = game.players.get(userId)
      if (player) {
        this.logger.debug(`Игрок ${player.name} isAlive: ${player.isAlive}, статус: ${game.status}`)
        
        // Если игра еще не началась, гарантируем что игрок жив
        if (game.status === 'waiting' && player.isAlive === undefined) {
          player.isAlive = true
          this.logger.debug(`Исправлен undefined isAlive для игрока ${player.name}`)
        }
      }

      // Отправляем текущее состояние игры
      socket.emit('GAME_STATE', {
        gameState: this.serializeGameState(game),
      })

      // Если игра еще не началась, отправляем карты
      if (game.status === 'waiting') {
        const player = game.players.get(userId)
        if (player) {
          this.sendPlayerCards(game, player)
        }
      }

    } catch (error) {
      this.logger.error('Ошибка подключения к игре:', error)
      socket.emit('ERROR', { message: 'Ошибка подключения' })
      socket.disconnect(true)
    }
  }

  handleDisconnect(socket: Socket) {
    const { userId, gameId } = socket.data
    if (!userId || !gameId) return

    const game = this.games.get(gameId)
    if (!game) return

    game.connections.delete(userId)

    this.logger.log(`Игрок отключился от игры: ${userId} из игры ${gameId}`)

    // Если все отключились, очищаем игру через некоторое время
    if (game.connections.size === 0) {
      setTimeout(() => {
        const currentGame = this.games.get(gameId)
        if (currentGame && currentGame.connections.size === 0) {
          this.games.delete(gameId)
          this.logger.log(`Игра ${gameId} очищена (нет подключений)`)
        }
      }, 300000)
    }
  }

  @SubscribeMessage('JOIN_GAME')
  handleJoinGame(socket: Socket, data: { gameId?: string }) {
    const { userId, username, gameId: socketGameId } = socket.data
    const targetGameId = data?.gameId || socketGameId
    
    if (!targetGameId) {
      socket.emit('ERROR', { message: 'Требуется ID игры' })
      return
    }

    const game = this.games.get(targetGameId)
    if (!game) {
      socket.emit('ERROR', { message: 'Игра не найдена' })
      return
    }

    const player = game.players.get(userId)
    if (!player) {
      socket.emit('ERROR', { message: 'Вы не являетесь игроком в этой игре' })
      return
    }

    this.logger.log(`Игрок ${username} присоединился к игре ${targetGameId}`)
    this.logger.debug(`Игрок ${player.name} состояние: isAlive=${player.isAlive}, score=${player.score}`)

    this.broadcastGameState(targetGameId)
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

    this.logger.log(`Игрок ${username} покинул игру ${targetGameId}`)

    this.server.to(targetGameId).emit('PLAYER_LEFT_GAME', {
      playerId: userId,
      playerName: username,
    })

    socket.emit('LEAVE_CONFIRMED', {
      message: 'Вы покинули игру',
    })
  }

  @SubscribeMessage('START_GAME_SESSION')
  async handleStartGameSession(socket: Socket) {
    try {
      const { userId, gameId } = socket.data
      const game = this.games.get(gameId)
      
      if (!game) {
        socket.emit('ERROR', { message: 'Игра не найдена' })
        return
      }

      if (game.creatorId !== userId) {
        socket.emit('ERROR', { message: 'Только создатель игры может начать сессию' })
        return
      }

      await this.startGameSession(game)
      
    } catch (error) {
      this.logger.error('Ошибка запуска игровой сессии:', error)
      socket.emit('ERROR', { message: 'Не удалось начать игровую сессию' })
    }
  }

  @SubscribeMessage('REVEAL_CARD')
  handleRevealCard(socket: Socket, data: { cardType: string, cardId: string }) {
    const { userId, gameId } = socket.data
    const game = this.games.get(gameId)
    
    if (!game || game.phase !== 'discussion') {
      socket.emit('ERROR', { message: 'Сейчас нельзя раскрыть карту' })
      return
    }

    const player = game.players.get(userId)
    if (!player) return

    if (player.revealedCards.includes(data.cardId)) {
      socket.emit('ERROR', { message: 'Карта уже раскрыта' })
      return
    }

    player.revealedCards.push(data.cardId)

    this.broadcastToGame(gameId, 'CARD_REVEALED', {
      playerId: userId,
      playerName: player.name,
      cardType: data.cardType,
      cardId: data.cardId,
      cardDetails: this.getCardDetails(data.cardType, data.cardId)
    })

    this.broadcastGameState(gameId)
  }

  @SubscribeMessage('VOTE_PLAYER')
  handleVotePlayer(socket: Socket, data: { targetPlayerId: string }) {
    const { userId, gameId } = socket.data
    const game = this.games.get(gameId)
    
    if (!game || game.phase !== 'voting') {
      socket.emit('ERROR', { message: 'Сейчас не фаза голосования' })
      return
    }

    const player = game.players.get(userId)
    const targetPlayer = game.players.get(data.targetPlayerId)
    
    if (!player || !targetPlayer || !player.isAlive || !targetPlayer.isAlive) {
      socket.emit('ERROR', { message: 'Неверная цель голосования' })
      return
    }

    player.vote = data.targetPlayerId
    targetPlayer.votesAgainst = (targetPlayer.votesAgainst || 0) + 1

    this.broadcastToGame(gameId, 'PLAYER_VOTED', {
      voterId: userId,
      voterName: player.name,
      targetId: data.targetPlayerId,
      targetName: targetPlayer.name
    })

    const alivePlayers = Array.from(game.players.values()).filter(p => p.isAlive === true)
    const votedPlayers = alivePlayers.filter(p => p.vote)
    
    if (votedPlayers.length === alivePlayers.length) {
      this.processVotingResults(game)
    }

    this.broadcastGameState(gameId)
  }

  @SubscribeMessage('REQUEST_VOTE')
  handleRequestVote(socket: Socket) {
    const { userId, gameId } = socket.data
    const game = this.games.get(gameId)
    
    if (!game || game.phase !== 'discussion') {
      socket.emit('ERROR', { message: 'Можно запросить голосование только во время обсуждения' })
      return
    }

    if (!game.voteRequests.has(userId)) {
      game.voteRequests.add(userId)
      game.voteTriggerCount++
      
      const aliveCount = Array.from(game.players.values()).filter(p => p.isAlive === true).length
      const requiredVotes = Math.floor(aliveCount / 2)
      
      this.broadcastToGame(gameId, 'VOTE_REQUESTED', {
        playerId: userId,
        playerName: game.players.get(userId)?.name,
        voteCount: game.voteTriggerCount,
        requiredCount: requiredVotes
      })

      if (game.voteTriggerCount >= requiredVotes) {
        this.startVotingPhase(game)
      }
    }
  }

  @SubscribeMessage('USE_ABILITY')
  handleUseAbility(socket: Socket, data: { ability: string, targetPlayerId?: string }) {
    const { userId, gameId } = socket.data
    const game = this.games.get(gameId)
    
    if (!game) return

    const player = game.players.get(userId)
    if (!player || player.hasUsedAbility) {
      socket.emit('ERROR', { message: 'Нельзя использовать способность' })
      return
    }

    switch (data.ability) {
      case 'captain_veto':
        if (player.roleCard?.id === 'role_captain') {
          this.handleCaptainVeto(game, userId)
          player.hasUsedAbility = true
        }
        break
      case 'sabotage':
        if (player.hiddenRole?.id === 'role_saboteur') {
          this.handleSabotage(game, userId)
          player.hasUsedAbility = true
        }
        break
      case 'infect':
        if (player.hiddenRole?.id === 'role_xenophag') {
          this.handleInfect(game, userId, data.targetPlayerId)
          player.hasUsedAbility = true
        }
        break
      case 'nonbinary_ability':
        if (player.gender?.id === 'gender_nonbinary') {
          this.handleNonbinaryAbility(game, userId)
          player.hasUsedAbility = true
        }
        break
    }

    this.broadcastGameState(gameId)
  }

  @SubscribeMessage('SOLVE_CRISIS')
  handleSolveCrisis(socket: Socket) {
    const { userId, gameId } = socket.data
    const game = this.games.get(gameId)
    
    if (!game || game.phase !== 'crisis' || !game.currentCrisis?.isActive) {
      socket.emit('ERROR', { message: 'Нет активного кризиса для решения' })
      return
    }

    const player = game.players.get(userId)
    if (!player) return

    const canSolve = player.profession && 
      game.currentCrisis.priorityProfessions.includes(player.profession.id)
    
    if (canSolve) {
      game.currentCrisis.isActive = false
      game.currentCrisis.solvedBy = userId
      
      player.score += 20
      
      this.broadcastToGame(gameId, 'CRISIS_SOLVED', {
        playerId: userId,
        playerName: player.name,
        crisis: game.currentCrisis.name
      })
      
      setTimeout(() => {
        this.startNewRound(game)
      }, 5000)
    } else {
      socket.emit('ERROR', { message: 'Ваша профессия не подходит для решения этого кризиса' })
    }
  }

  @SubscribeMessage('GAME_ACTION')
  handleGameAction(
    socket: Socket,
    data: { action: string; payload?: any; gameId?: string }
  ) {
    const { userId, gameId: socketGameId } = socket.data
    const targetGameId = data?.gameId || socketGameId
    
    if (!targetGameId) return

    const game = this.games.get(targetGameId)
    if (!game) {
      socket.emit('ERROR', { message: 'Игра не найдена' })
      return
    }

    if (game.status !== 'active') {
      socket.emit('ERROR', { message: 'Игра не активна' })
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
        this.handlePlayerAction(game, userId, data.payload)
        break
      default:
        socket.emit('ERROR', { message: 'Неизвестное действие' })
        return
    }

    this.broadcastGameState(targetGameId)
  }

  @SubscribeMessage('HEARTBEAT')
  handleHeartbeat(socket: Socket) {
    socket.emit('HEARTBEAT_ACK', { timestamp: Date.now() })
  }

  // ОСНОВНАЯ ИГРОВАЯ ЛОГИКА

  private async startGameSession(game: GameState) {
    this.logger.log(`Запуск игровой сессии для ${game.id}`)
    
    // Убеждаемся, что все игроки живы перед началом
    Array.from(game.players.values()).forEach(player => {
      player.isAlive = true
      player.score = 0
      player.votesAgainst = 0
      player.revealedCards = []
      player.hasUsedAbility = false
      player.isInfected = false
      player.isSuspicious = false
      player.vote = undefined
      
      this.logger.debug(`Игрок ${player.name} инициализирован: isAlive=${player.isAlive}`)
    })
    
    this.dealCardsToPlayers(game)
    
    game.phase = 'introduction'
    game.phaseDuration = 30
    game.status = 'active'
    game.round = 1
    game.voteTriggerCount = 0
    game.voteRequests = new Set()
    
    this.broadcastGameState(game.id)
    
    this.broadcastToGame(game.id, 'GAME_NARRATION', {
      title: '2247 год. Станция "Эдем"',
      text: `Научно-исследовательская станция «Эдем», находящаяся на орбите таинственной планеты Хелиос, подвергается нападению неизвестных сил. Системы жизнеобеспечения повреждены. Единственная спасательная капсула «Надежда» может вместить только ${Math.floor(game.players.size / 2)} человек. Экипаж из ${game.players.size} человек должен решить, кто выживет.`
    })
    
    this.startPhaseTimer(game)
    
    setTimeout(() => {
      this.startPreparationPhase(game)
    }, 30000)
  }

  private startPreparationPhase(game: GameState) {
    game.phase = 'preparation'
    game.phaseDuration = 60
    
    this.logger.log(`Запуск фазы подготовки для игры ${game.id}`)
    
    this.broadcastGameState(game.id)
    this.startPhaseTimer(game)
    
    setTimeout(() => {
      this.startDiscussionPhase(game)
    }, 60000)
  }

  private startDiscussionPhase(game: GameState) {
    game.phase = 'discussion'
    game.phaseDuration = game.settings.discussionTime
    game.voteTriggerCount = 0
    game.voteRequests = new Set()
    
    Array.from(game.players.values()).forEach(player => {
      player.vote = undefined
      player.votesAgainst = 0
    })
    
    this.broadcastGameState(game.id)
    this.startPhaseTimer(game)
    
    setTimeout(() => {
      const aliveCount = Array.from(game.players.values()).filter(p => p.isAlive === true).length
      if (game.voteTriggerCount < Math.floor(aliveCount / 2)) {
        this.checkForCrisis(game)
      }
    }, game.settings.discussionTime * 1000)
  }

  private startVotingPhase(game: GameState) {
    game.phase = 'voting'
    game.phaseDuration = game.settings.votingTime
    game.votingResults = new Map()
    
    Array.from(game.players.values()).forEach(player => {
      player.vote = undefined
      player.votesAgainst = 0
    })
    
    this.broadcastGameState(game.id)
    this.startPhaseTimer(game)
    
    setTimeout(() => {
      this.processVotingResults(game)
    }, game.settings.votingTime * 1000)
  }

  private processVotingResults(game: GameState) {
    if (!game.votingResults) return
    
    Array.from(game.players.values()).forEach(player => {
      if (player.vote && player.isAlive === true) {
        const currentVotes = game.votingResults!.get(player.vote) || 0
        game.votingResults!.set(player.vote, currentVotes + 1)
      }
    })
    
    let maxVotes = 0
    let ejectedPlayerId = ''
    
    game.votingResults.forEach((votes, playerId) => {
      if (votes > maxVotes) {
        maxVotes = votes
        ejectedPlayerId = playerId
      }
    })
    
    if (ejectedPlayerId && maxVotes > 0) {
      const ejectedPlayer = game.players.get(ejectedPlayerId)
      if (ejectedPlayer) {
        ejectedPlayer.isAlive = false
        game.ejectedPlayers.push(ejectedPlayerId)
        
        Array.from(game.players.values())
          .filter(p => p.isAlive === true)
          .forEach(p => p.score += 10)
        
        this.broadcastToGame(game.id, 'PLAYER_EJECTED', {
          playerId: ejectedPlayerId,
          playerName: ejectedPlayer.name,
          votes: maxVotes
        })
        
        this.startRevealPhase(game, ejectedPlayer)
      }
    } else {
      this.broadcastToGame(game.id, 'VOTE_TIED', {
        message: 'Голосование завершилось ничьей'
      })
      
      setTimeout(() => {
        this.checkForCrisis(game)
      }, 3000)
    }
  }

  private startRevealPhase(game: GameState, ejectedPlayer: GamePlayer) {
    game.phase = 'reveal'
    game.phaseDuration = 30
    
    this.broadcastToGame(game.id, 'PLAYER_REVEAL', {
      playerId: ejectedPlayer.id,
      playerName: ejectedPlayer.name,
      cards: {
        profession: ejectedPlayer.profession,
        healthStatus: ejectedPlayer.healthStatus,
        psychologicalTrait: ejectedPlayer.psychologicalTrait,
        secret: ejectedPlayer.secret,
        hiddenRole: ejectedPlayer.hiddenRole,
        resource: ejectedPlayer.resource
      }
    })
    
    this.broadcastGameState(game.id)
    this.startPhaseTimer(game)
    
    setTimeout(() => {
      this.checkGameEnd(game)
    }, 30000)
  }

  private checkGameEnd(game: GameState) {
    const alivePlayers = Array.from(game.players.values()).filter(p => p.isAlive === true)
    const capsuleCapacity = Math.floor(game.players.size / 2)
    
    const hiddenRoleWinners = this.checkHiddenRoleWins(game)
    if (hiddenRoleWinners.length > 0) {
      this.endGame(game, hiddenRoleWinners, 'hidden_role_win')
      return
    }
    
    if (alivePlayers.length <= capsuleCapacity) {
      this.endGame(game, alivePlayers.map(p => p.id), 'capsule_full')
      return
    }
    
    if (game.currentCrisis && !game.currentCrisis.solvedBy) {
      this.applyCrisisPenalty(game)
    } else {
      this.checkForCrisis(game)
    }
  }

  private checkForCrisis(game: GameState) {
    let crisisChance = 0.3
    switch (game.settings.difficulty) {
      case 'easy': crisisChance = 0.2; break
      case 'hard': crisisChance = 0.4; break
    }
    
    if (Math.random() < crisisChance && game.settings.enableCrises) {
      this.triggerCrisis(game)
    } else {
      this.startNewRound(game)
    }
  }

  private triggerCrisis(game: GameState) {
    game.phase = 'crisis'
    game.phaseDuration = 60
    
    const crisisTypes = ['technological', 'biological', 'external']
    const randomType = crisisTypes[Math.floor(Math.random() * crisisTypes.length)]
    
    let crisis: Crisis
    
    switch (randomType) {
      case 'technological':
        crisis = {
          id: 'crisis_leak',
          type: 'technological',
          name: 'Утечка в отсеке хранения',
          description: 'Обнаружена утечка опасных химикатов в отсеке хранения',
          priorityProfessions: ['prof_engineer', 'prof_surgeon'],
          penalty: '-1 место в капсуле если не устранено',
          isActive: true
        }
        break
      case 'biological':
        crisis = {
          id: 'crisis_pathogen',
          type: 'biological',
          name: 'Вспышка неизвестного патогена',
          description: 'Системы обнаружили вспышку неизвестного патогена в системе вентиляции',
          priorityProfessions: ['prof_astrobiologist', 'prof_surgeon'],
          penalty: 'Случайный игрок получает «Заболевание»',
          isActive: true
        }
        break
      default:
        crisis = {
          id: 'crisis_signal',
          type: 'external',
          name: 'Неопознанный сигнал',
          description: 'Станция получает неопознанный сигнал с неизвестным источником',
          priorityProfessions: ['prof_linguist', 'prof_pilot'],
          penalty: 'Помощь или новая угроза',
          isActive: true
        }
    }
    
    game.currentCrisis = crisis
    game.crisisHistory.push(crisis)
    
    this.broadcastToGame(game.id, 'CRISIS_TRIGGERED', {
      crisis: crisis
    })
    
    this.broadcastGameState(game.id)
    this.startPhaseTimer(game)
    
    setTimeout(() => {
      if (game.currentCrisis?.isActive) {
        this.applyCrisisPenalty(game)
      }
    }, 60000)
  }

  private applyCrisisPenalty(game: GameState) {
    if (!game.currentCrisis) return
    
    switch (game.currentCrisis.id) {
      case 'crisis_leak':
        game.capsuleSlots = Math.max(1, game.capsuleSlots - 1)
        this.broadcastToGame(game.id, 'CRISIS_PENALTY', {
          message: 'Утечка не устранена! Количество мест в капсуле уменьшено на 1.'
        })
        break
      case 'crisis_pathogen':
        const alivePlayers = Array.from(game.players.values()).filter(p => p.isAlive === true)
        if (alivePlayers.length > 0) {
          const randomPlayer = alivePlayers[Math.floor(Math.random() * alivePlayers.length)]
          randomPlayer.isInfected = true
          this.broadcastToGame(game.id, 'CRISIS_PENALTY', {
            message: `Игрок ${randomPlayer.name} заразился неизвестным патогеном!`,
            infectedPlayerId: randomPlayer.id
          })
        }
        break
    }
    
    game.currentCrisis.isActive = false
    
    setTimeout(() => {
      this.startNewRound(game)
    }, 5000)
  }

  private startNewRound(game: GameState) {
    game.phase = 'intermission'
    game.phaseDuration = 10
    game.round++
    game.currentCrisis = undefined
    game.voteTriggerCount = 0
    game.voteRequests = new Set()
    
    Array.from(game.players.values()).forEach(player => {
      player.hasUsedAbility = false
    })
    
    this.broadcastGameState(game.id)
    this.startPhaseTimer(game)
    
    setTimeout(() => {
      if (game.round <= (game.maxRounds || 10)) {
        this.startDiscussionPhase(game)
      } else {
        const survivors = Array.from(game.players.values()).filter(p => p.isAlive === true)
        const winners = survivors.map(p => p.id)
        
        if (winners.length > game.capsuleSlots) {
          const shuffled = [...winners].sort(() => Math.random() - 0.5)
          winners.length = 0
          winners.push(...shuffled.slice(0, game.capsuleSlots))
        }
        
        this.endGame(game, winners, 'round_limit')
      }
    }, 10000)
  }

  private endGame(game: GameState, winnerIds: string[], reason: string) {
    game.phase = 'game_over'
    game.status = 'finished'
    game.finishedAt = new Date().toISOString()
    game.winnerId = winnerIds[0]
    
    if (game.timerInterval) {
      clearInterval(game.timerInterval)
      game.timerInterval = undefined
    }
    
    Array.from(game.players.values()).forEach(player => {
      if (winnerIds.includes(player.id)) {
        player.score += 50
      }
      if (player.isAlive === true) {
        player.score += 20
      }
    })
    
    this.broadcastToGame(game.id, 'GAME_FINISHED', {
      winnerIds,
      reason,
      finalScores: Array.from(game.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        survived: winnerIds.includes(p.id),
        role: p.hiddenRole?.name || p.profession?.name || 'Экипаж'
      }))
    })
    
    this.broadcastGameState(game.id)
  }

  private dealCardsToPlayers(game: GameState) {
    game.deck = {
      professions: [...PROFESSIONS],
      healthStatuses: [...HEALTH_STATUSES],
      psychologicalTraits: [...PSYCHOLOGICAL_TRAITS],
      secrets: [...SECRETS],
      resources: [],
      hiddenRoles: [...HIDDEN_ROLES],
      roleCards: []
    }
    
    game.capsuleSlots = Math.floor(game.players.size / 2)
    game.occupiedSlots = 0
    game.ejectedPlayers = []
    game.crisisHistory = []
    
    const playerArray = Array.from(game.players.values())
    
    this.logger.log(`Раздача карт ${playerArray.length} игрокам`)
    
    playerArray.forEach((player, index) => {
      player.isAlive = true
      player.score = 0
      player.votesAgainst = 0
      player.revealedCards = []
      player.hasUsedAbility = false
      player.isInfected = false
      player.isSuspicious = false
      player.vote = undefined
      
      this.logger.debug(`Инициализация игрока ${player.name}: isAlive=${player.isAlive}`)
      
      if (game.deck.professions.length > 0) {
        const professionIndex = Math.floor(Math.random() * game.deck.professions.length)
        player.profession = game.deck.professions[professionIndex]
      }
      
      if (game.deck.healthStatuses.length > 0) {
        const healthIndex = Math.floor(Math.random() * game.deck.healthStatuses.length)
        player.healthStatus = game.deck.healthStatuses[healthIndex]
      }
      
      if (game.deck.psychologicalTraits.length > 0) {
        const traitIndex = Math.floor(Math.random() * game.deck.psychologicalTraits.length)
        player.psychologicalTrait = game.deck.psychologicalTraits[traitIndex]
      }
      
      if (game.deck.secrets.length > 0 && Math.random() < 0.3) {
        const secretIndex = Math.floor(Math.random() * game.deck.secrets.length)
        player.secret = game.deck.secrets[secretIndex]
      }
      
      if (index < game.settings.hiddenRolesCount && game.deck.hiddenRoles.length > 0) {
        const roleIndex = Math.floor(Math.random() * game.deck.hiddenRoles.length)
        player.hiddenRole = game.deck.hiddenRoles[roleIndex]
        game.deck.hiddenRoles.splice(roleIndex, 1)
      }
      
      if (index === 0) {
        player.roleCard = { 
          id: 'role_captain', 
          name: 'Капитан станции', 
          description: 'Имеет право вето на одно голосование за игру', 
          specialAbility: 'veto' 
        }
        player.isCaptain = true
        player.isSeniorOfficer = false
      } else if (index === 1) {
        player.roleCard = { 
          id: 'role_officer', 
          name: 'Старший офицер', 
          description: 'Замещает капитана, дополнительный голос при ничьей', 
          specialAbility: 'extra_vote' 
        }
        player.isCaptain = false
        player.isSeniorOfficer = true
      } else {
        player.isCaptain = false
        player.isSeniorOfficer = false
      }
      
      if (GENDERS.length > 0) {
        const genderIndex = Math.floor(Math.random() * GENDERS.length)
        player.gender = GENDERS[genderIndex]
      }
      
      if (AGES.length > 0) {
        const ageIndex = Math.floor(Math.random() * AGES.length)
        player.age = AGES[ageIndex]
      }
      
      if (BODY_TYPES.length > 0) {
        const bodyIndex = Math.floor(Math.random() * BODY_TYPES.length)
        player.bodyType = BODY_TYPES[bodyIndex]
      }
      
      if (player.bodyType?.id === 'body_huge') {
        game.occupiedSlots += 2
      } else if (player.age?.id === 'age_elder') {
        game.occupiedSlots += 1
      } else {
        game.occupiedSlots += 1
      }
      
      this.sendPlayerCards(game, player)
    })
    
    this.logger.log(`Карты розданы ${playerArray.length} игрокам`)
  }

  private sendPlayerCards(game: GameState, player: GamePlayer) {
    const socket = game.connections.get(player.id)
    if (socket) {
      socket.emit('YOUR_CARDS', {
        profession: player.profession,
        healthStatus: player.healthStatus,
        psychologicalTrait: player.psychologicalTrait,
        secret: player.secret,
        hiddenRole: player.hiddenRole,
        resource: player.resource,
        roleCard: player.roleCard,
        gender: player.gender,
        age: player.age,
        bodyType: player.bodyType
      })
      
      this.logger.debug(`Отправлены карты игроку ${player.name}, isAlive=${player.isAlive}`)
    }
  }

  // ИСПРАВЛЕННЫЙ МЕТОД ЗАПУСКА ТАЙМЕРА
  private startPhaseTimer(game: GameState) {
    if (game.timerInterval) {
      clearInterval(game.timerInterval)
    }
    
    const startTime = Date.now()
    const endTime = startTime + (game.phaseDuration * 1000)
    game.phaseEndTime = new Date(endTime).toISOString()
    
    this.logger.debug(`Запущен таймер фазы ${game.phase} на ${game.phaseDuration} секунд`)
    
    let expectedTime = startTime
    let drift = 0
    
    game.timerInterval = setInterval(() => {
      const now = Date.now()
      const elapsed = now - expectedTime
      drift += elapsed
      
      const timeRemaining = endTime - now
      
      if (timeRemaining <= 0) {
        this.logger.debug(`Таймер фазы ${game.phase} истек`)
        clearInterval(game.timerInterval)
        game.timerInterval = undefined
        this.handlePhaseTimeout(game)
      } else if (Math.abs(drift) >= 1000) {
        drift = 0
        this.broadcastGameState(game.id)
      }
      
      expectedTime = now
    }, 1000)
  }

  private handlePhaseTimeout(game: GameState) {
    switch (game.phase) {
      case 'introduction':
        this.startPreparationPhase(game)
        break
      case 'preparation':
        this.startDiscussionPhase(game)
        break
      case 'discussion':
        this.checkForCrisis(game)
        break
      case 'voting':
        this.processVotingResults(game)
        break
      case 'reveal':
        this.checkGameEnd(game)
        break
      case 'crisis':
        if (game.currentCrisis?.isActive) {
          this.applyCrisisPenalty(game)
        }
        break
      case 'intermission':
        this.startDiscussionPhase(game)
        break
    }
  }

  private checkHiddenRoleWins(game: GameState): string[] {
    const winners: string[] = []
    
    Array.from(game.players.values()).forEach(player => {
      if (player.hiddenRole && player.isAlive === true) {
        switch (player.hiddenRole.id) {
          case 'role_saboteur':
            if (game.status === 'finished' && game.phase === 'game_over') {
              winners.push(player.id)
            }
            break
          case 'role_xenophag':
            const infectedPlayers = Array.from(game.players.values()).filter(p => p.isInfected === true)
            if (infectedPlayers.length > 0) {
              winners.push(player.id)
            }
            break
        }
      }
    })
    
    return winners
  }

  private getCardDetails(cardType: string, cardId: string): any {
    switch (cardType) {
      case 'profession':
        return PROFESSIONS.find(p => p.id === cardId)
      case 'health':
        return HEALTH_STATUSES.find(h => h.id === cardId)
      case 'trait':
        return PSYCHOLOGICAL_TRAITS.find(t => t.id === cardId)
      case 'secret':
        return SECRETS.find(s => s.id === cardId)
      case 'role':
        return HIDDEN_ROLES.find(r => r.id === cardId)
      default:
        return null
    }
  }

  private handleCaptainVeto(game: GameState, userId: string) {
    game.votingResults?.clear()
    
    this.broadcastToGame(game.id, 'CAPTAIN_VETO_USED', {
      playerId: userId,
      playerName: game.players.get(userId)?.name,
      message: 'Капитан использовал право вето на голосование!'
    })
    
    setTimeout(() => {
      this.startDiscussionPhase(game)
    }, 3000)
  }

  private handleSabotage(game: GameState, userId: string) {
    game.capsuleSlots = Math.max(1, game.capsuleSlots - 1)
    
    this.broadcastToGame(game.id, 'SABOTAGE_OCCURRED', {
      playerId: userId,
      playerName: game.players.get(userId)?.name,
      message: 'Произошла неисправность! Количество мест в капсуле уменьшено на 1.'
    })
  }

  private handleInfect(game: GameState, userId: string, targetPlayerId?: string) {
    if (!targetPlayerId) return
    
    const targetPlayer = game.players.get(targetPlayerId)
    if (targetPlayer && targetPlayer.isAlive === true) {
      targetPlayer.isInfected = true
      
      this.broadcastToGame(game.id, 'PLAYER_INFECTED', {
        infectedBy: userId,
        infectedByName: game.players.get(userId)?.name,
        playerId: targetPlayerId,
        playerName: targetPlayer.name
      })
    }
  }

  private handleNonbinaryAbility(game: GameState, userId: string) {
    const player = game.players.get(userId)
    if (player) {
      player.votesAgainst = Math.max(0, player.votesAgainst - 1)
      
      this.broadcastToGame(game.id, 'NONBINARY_ABILITY_USED', {
        playerId: userId,
        playerName: player.name,
        message: `${player.name} использовал(а) свою способность, отменив один голос против себя`
      })
    }
  }

  private handleSkipTurn(game: GameState) {
    this.logger.log(`Пропуск хода в игре ${game.id}`)
  }

  private handleEndGame(game: GameState, userId: string) {
    if (game.creatorId !== userId) {
      this.logger.warn(`Игрок ${userId} попытался завершить игру без разрешения`)
      return
    }
    
    game.status = 'cancelled'
    game.finishedAt = new Date().toISOString()
    
    this.logger.log(`Игра ${game.id} отменена пользователем ${userId}`)
    
    this.server.to(game.id).emit('GAME_FINISHED', {
      gameState: this.serializeGameState(game),
      reason: 'cancelled_by_creator'
    })
  }

  private handlePlayerAction(game: GameState, userId: string, payload: any) {
    const player = game.players.get(userId)
    if (player) {
      player.score += payload?.points || 1
    }
  }

  // ИСПРАВЛЕННЫЙ МЕТОД СЕРИАЛИЗАЦИИ
  private serializeGameState(game: GameState) {
    const players = Array.from(game.players.values()).map(p => ({
      id: p.id,
      name: p.name || 'Безымянный',
      missions: p.missions || 0,
      hours: p.hours || 0,
      avatar: p.avatar,
      score: p.score || 0,
      order: p.order || 0,
      isActive: p.isActive !== false,
      isAlive: p.isAlive === true,
      vote: p.vote,
      votesAgainst: p.votesAgainst || 0,
      profession: p.profession?.name,
      isInfected: p.isInfected || false,
      isSuspicious: p.isSuspicious || false,
      isCaptain: p.isCaptain || false,
      isSeniorOfficer: p.isSeniorOfficer || false,
      revealedCards: p.revealedCards?.length || 0,
      hasUsedAbility: p.hasUsedAbility || false
    }))
    
    this.logger.debug(`Сериализация ${players.length} игроков. Первый игрок: ${players[0]?.name}, isAlive=${players[0]?.isAlive}`)
    
    return {
      id: game.id,
      lobbyId: game.lobbyId,
      status: game.status,
      phase: game.phase,
      players: players,
      creatorId: game.creatorId,
      round: game.round || 1,
      maxRounds: game.maxRounds || 10,
      startedAt: game.startedAt,
      finishedAt: game.finishedAt,
      winnerId: game.winnerId,
      settings: game.settings,
      currentCrisis: game.currentCrisis,
      capsuleSlots: game.capsuleSlots || Math.floor(players.length / 2),
      occupiedSlots: game.occupiedSlots || 0,
      ejectedPlayers: game.ejectedPlayers || [],
      phaseEndTime: game.phaseEndTime,
      phaseDuration: game.phaseDuration || 60,
      voteTriggerCount: game.voteTriggerCount || 0,
      requiredVotes: Math.floor(players.filter(p => p.isAlive).length / 2)
    }
  }

  // ИСПРАВЛЕННЫЙ МЕТОД СОЗДАНИЯ ИГРЫ
  createGameFromLobby(lobbyId: string, gameId: string, players: any[], creatorId: string, settings: any) {
    const gamePlayers = new Map<string, GamePlayer>()
    
    this.logger.log(`Создание игры ${gameId} из лобби ${lobbyId} с ${players.length} игроками`)
    
    players.forEach((player, index) => {
      const gamePlayer: GamePlayer = {
        id: player.id,
        name: player.name || `Игрок ${index + 1}`,
        missions: player.missions || 0,
        hours: player.hours || 0,
        avatar: player.avatar,
        score: 0,
        order: index + 1,
        isActive: true,
        isAlive: true,
        vote: undefined,
        votesAgainst: 0,
        revealedCards: [],
        hasUsedAbility: false,
        isInfected: false,
        isSuspicious: false,
        isCaptain: index === 0,
        isSeniorOfficer: index === 1
      }
      
      gamePlayers.set(player.id, gamePlayer)
      this.logger.debug(`Создан игрок ${gamePlayer.name} с isAlive=${gamePlayer.isAlive}`)
    })

    const gameState: GameState = {
      id: gameId,
      lobbyId,
      status: 'waiting',
      phase: 'introduction',
      players: gamePlayers,
      connections: new Map(),
      creatorId,
      round: 1,
      maxRounds: settings?.maxRounds || 10,
      startedAt: new Date().toISOString(),
      settings: {
        gameMode: settings?.gameMode || 'standard',
        maxPlayers: settings?.maxPlayers || 4,
        maxRounds: settings?.maxRounds || 10,
        discussionTime: settings?.discussionTime || 180,
        votingTime: settings?.votingTime || 60,
        hiddenRolesCount: Math.min(settings?.hiddenRolesCount || 1, players.length),
        enableCrises: settings?.enableCrises !== false,
        difficulty: settings?.difficulty || 'normal',
        tournamentMode: settings?.tournamentMode || false
      },
      deck: {
        professions: [],
        healthStatuses: [],
        psychologicalTraits: [],
        secrets: [],
        resources: [],
        hiddenRoles: [],
        roleCards: []
      },
      ejectedPlayers: [],
      capsuleSlots: Math.floor(players.length / 2),
      occupiedSlots: 0,
      crisisHistory: [],
      phaseDuration: 30,
      voteTriggerCount: 0,
      voteRequests: new Set()
    }

    this.games.set(gameId, gameState)
    this.logger.log(`Игра создана: ${gameId}. Игроки: ${Array.from(gamePlayers.values()).map(p => `${p.name}(${p.isAlive})`).join(', ')}`)
    
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
      players: Array.from(game.players.values()).map(p => `${p.name}(${p.isAlive})`),
      round: game.round,
      startedAt: game.startedAt,
    }))
  }

  private broadcastGameState(gameId: string) {
    const game = this.games.get(gameId)
    if (!game) return
    
    const serializedState = this.serializeGameState(game)
    this.logger.debug(`Отправка состояния игры для ${gameId}, игроков: ${serializedState.players.length}`)
    
    this.server.to(gameId).emit('GAME_STATE', {
      gameState: serializedState
    })
  }

  private broadcastToGame(gameId: string, event: string, data: any) {
    this.server.to(gameId).emit(event, data)
  }
}