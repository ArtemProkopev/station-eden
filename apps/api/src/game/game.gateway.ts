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

// Игрок в игре
type GamePlayer = {
  id: string
  name: string
  missions: number
  hours: number
  avatar?: string
  score: number
  order: number
  isActive: boolean
  isAlive: boolean
  vote?: string
  votesAgainst: number
  
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
}

// Фазы игры
type GamePhase = 
  | 'introduction'    // Заставка
  | 'preparation'     // Подготовка
  | 'discussion'      // Обсуждение
  | 'voting'          // Голосование
  | 'reveal'          // Раскрытие
  | 'crisis'          // Кризис
  | 'intermission'    // Между раундами
  | 'game_over'       // Конец игры

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
  voteTriggerCount: number // сколько игроков нажало кнопку голосования
  voteRequests: Set<string> // ID игроков, запросивших голосование
}

const GAME_ID_RE = /^game-[a-zA-Z0-9_-]+$/
const MSG_WINDOW_MS = 10_000
const MSG_MAX_PER_WINDOW = 15

// Колоды карт (в реальном проекте это было бы в БД)
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
  },
  {
    id: 'prof_surgeon',
    name: 'Кибернетический хирург',
    description: 'Человек или машина? Да.',
    pros: ['Может «починить» другого игрока'],
    cons: ['Импланты могут выйти из-под контроля'],
    priority: ['technological', 'biological']
  },
  {
    id: 'prof_linguist',
    name: 'Ксенолингвист',
    description: 'Говорит на 14 инопланетных языках',
    pros: ['Может расшифровать инопланетные сигналы'],
    cons: ['Иногда переводит «с ошибками»'],
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
  },
  {
    id: 'health_vestibular',
    name: 'Синдром идеального вестибулярного аппарата',
    description: 'Никогда не теряет ориентацию',
    effects: ['Не подвержен гравитационным аномалиям', 'Заметно отличается поведением']
  },
  {
    id: 'health_phoenix',
    name: 'Генная модификация «Феникс»',
    description: 'Быстрая регенерация',
    effects: ['Восстанавливается после кризисов быстрее', 'Подозрительная живучесть']
  },
  {
    id: 'health_amnesia',
    name: 'Амнезия',
    description: 'Кто я и где я?',
    effects: ['Забывает многие вещи', 'С случайным шансом может заблокироваться карточка профессии']
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
  },
  {
    id: 'trait_brave',
    name: 'Безрассудно храбрый',
    description: 'Первый в опасность, последний в капсулу',
    effects: ['Спасает других во время кризисов', 'Часто рискует без необходимости'],
    triggers: ['crisis']
  },
  {
    id: 'trait_optimist',
    name: 'Неисправимый оптимист',
    description: 'Всё будет хорошо! Наверное...',
    effects: ['Поднимает мораль команды', 'Может недооценивать угрозы'],
    triggers: ['discussion', 'crisis']
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
  },
  {
    id: 'secret_guilty',
    name: 'Я виновен в катастрофе',
    description: 'Совершил роковую ошибку',
    goal: 'искупить вину или скрыть правду',
    abilities: ['Знает слабые места станции'],
    isHiddenRole: false
  }
]

const HIDDEN_ROLES: HiddenRole[] = [
  {
    id: 'role_saboteur',
    name: 'Саботажник',
    description: 'Работает на конкурентов или имеет личные мотивы',
    goal: 'Не дать капсуле улететь',
    abilities: ['Может вызывать мелкие неисправности (поломка 1 капсулы)'],
    winCondition: 'capsule_not_launched'
  },
  {
    id: 'role_xenophag',
    name: 'Агент ксенофагов',
    description: 'Заражен инопланетной формой жизни',
    goal: 'Доставить «образец» на Землю',
    abilities: ['Может заражать других игроков'],
    winCondition: 'at_least_one_infected'
  },
  {
    id: 'role_scientist',
    name: 'Ученый-экстремист',
    description: 'Готов на всё ради науки',
    goal: 'Сохранить исследовательские данные любой ценой',
    abilities: ['Может жертвовать другими ради данных'],
    winCondition: 'data_preserved'
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
  },
  {
    id: 'age_elder',
    name: 'Пожилой',
    range: '51+',
    effects: ['+2 к опыту', '-2 к скорости реакции', 'дополнительное место в капсуле']
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
  },
  {
    id: 'body_heavy',
    name: 'Полное',
    effects: ['+2 к выносливости', '-1 к скорости']
  },
  {
    id: 'body_huge',
    name: 'Огромное',
    effects: ['+3 к силе', '+2 к выносливости', '-2 к скорости', 'занимает 2 места']
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

      // Если игра еще не началась (фаза waiting), отправляем карты
      if (game.status === 'waiting') {
        const player = game.players.get(userId)
        if (player) {
          this.sendPlayerCards(game, player)
        }
      }

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

  @SubscribeMessage('START_GAME_SESSION')
  async handleStartGameSession(socket: Socket) {
    try {
      const { userId, gameId } = socket.data
      const game = this.games.get(gameId)
      
      if (!game) {
        socket.emit('ERROR', { message: 'Game not found' })
        return
      }

      // Только создатель может начать игровую сессию
      if (game.creatorId !== userId) {
        socket.emit('ERROR', { message: 'Only game creator can start the session' })
        return
      }

      // Начинаем игровую сессию
      await this.startGameSession(game)
      
    } catch (error) {
      this.logger.error('Error starting game session:', error)
      socket.emit('ERROR', { message: 'Failed to start game session' })
    }
  }

  @SubscribeMessage('REVEAL_CARD')
  handleRevealCard(socket: Socket, data: { cardType: string, cardId: string }) {
    const { userId, gameId } = socket.data
    const game = this.games.get(gameId)
    
    if (!game || game.phase !== 'discussion') {
      socket.emit('ERROR', { message: 'Cannot reveal card now' })
      return
    }

    const player = game.players.get(userId)
    if (!player) return

    // Проверяем, не раскрывал ли уже эту карту
    if (player.revealedCards.includes(data.cardId)) {
      socket.emit('ERROR', { message: 'Card already revealed' })
      return
    }

    // Добавляем карту в раскрытые
    player.revealedCards.push(data.cardId)

    // Логика раскрытия карты
    this.broadcastToGame(gameId, 'CARD_REVEALED', {
      playerId: userId,
      playerName: player.name,
      cardType: data.cardType,
      cardId: data.cardId,
      cardDetails: this.getCardDetails(data.cardType, data.cardId)
    })

    // Обновляем состояние игры
    this.broadcastGameState(gameId)
  }

  @SubscribeMessage('VOTE_PLAYER')
  handleVotePlayer(socket: Socket, data: { targetPlayerId: string }) {
    const { userId, gameId } = socket.data
    const game = this.games.get(gameId)
    
    if (!game || game.phase !== 'voting') {
      socket.emit('ERROR', { message: 'Not voting phase' })
      return
    }

    const player = game.players.get(userId)
    const targetPlayer = game.players.get(data.targetPlayerId)
    
    if (!player || !targetPlayer || !player.isAlive || !targetPlayer.isAlive) {
      socket.emit('ERROR', { message: 'Invalid vote target' })
      return
    }

    // Игрок голосует
    player.vote = data.targetPlayerId
    
    // Увеличиваем счет голосов против цели
    targetPlayer.votesAgainst = (targetPlayer.votesAgainst || 0) + 1

    // Отправляем уведомление о голосе
    this.broadcastToGame(gameId, 'PLAYER_VOTED', {
      voterId: userId,
      voterName: player.name,
      targetId: data.targetPlayerId,
      targetName: targetPlayer.name
    })

    // Проверяем, все ли живые игроки проголосовали
    const alivePlayers = Array.from(game.players.values()).filter(p => p.isAlive)
    const votedPlayers = alivePlayers.filter(p => p.vote)
    
    if (votedPlayers.length === alivePlayers.length) {
      // Все проголосовали, обрабатываем результаты
      this.processVotingResults(game)
    }

    this.broadcastGameState(gameId)
  }

  @SubscribeMessage('REQUEST_VOTE')
  handleRequestVote(socket: Socket) {
    const { userId, gameId } = socket.data
    const game = this.games.get(gameId)
    
    if (!game || game.phase !== 'discussion') {
      socket.emit('ERROR', { message: 'Can only request vote during discussion' })
      return
    }

    // Добавляем игрока в список запросивших голосование
    if (!game.voteRequests.has(userId)) {
      game.voteRequests.add(userId)
      game.voteTriggerCount++
      
      this.broadcastToGame(gameId, 'VOTE_REQUESTED', {
        playerId: userId,
        playerName: game.players.get(userId)?.name,
        voteCount: game.voteTriggerCount,
        requiredCount: Math.floor(Array.from(game.players.values()).filter(p => p.isAlive).length / 2)
      })

      // Проверяем, достигнуто ли необходимое количество
      const aliveCount = Array.from(game.players.values()).filter(p => p.isAlive).length
      if (game.voteTriggerCount >= Math.floor(aliveCount / 2)) {
        // Начинаем голосование
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
      socket.emit('ERROR', { message: 'Cannot use ability' })
      return
    }

    // Логика использования способности в зависимости от роли/карты
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
      // ... другие способности
    }

    this.broadcastGameState(gameId)
  }

  @SubscribeMessage('SOLVE_CRISIS')
  handleSolveCrisis(socket: Socket) {
    const { userId, gameId } = socket.data
    const game = this.games.get(gameId)
    
    if (!game || game.phase !== 'crisis' || !game.currentCrisis?.isActive) {
      socket.emit('ERROR', { message: 'No active crisis to solve' })
      return
    }

    const player = game.players.get(userId)
    if (!player) return

    // Проверяем, подходит ли профессия игрока для решения кризиса
    const canSolve = player.profession && 
      game.currentCrisis.priorityProfessions.includes(player.profession.id)
    
    if (canSolve) {
      // Игрок решает кризис
      game.currentCrisis.isActive = false
      game.currentCrisis.solvedBy = userId
      
      // Награждаем игрока
      player.score += 20
      
      this.broadcastToGame(gameId, 'CRISIS_SOLVED', {
        playerId: userId,
        playerName: player.name,
        crisis: game.currentCrisis.name
      })
      
      // Переходим к новому раунду
      setTimeout(() => {
        this.startNewRound(game)
      }, 5000)
    } else {
      socket.emit('ERROR', { message: 'Your profession is not suited for this crisis' })
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
      socket.emit('ERROR', { message: 'Game not found' })
      return
    }

    if (game.status !== 'active') {
      socket.emit('ERROR', { message: 'Game is not active' })
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
        socket.emit('ERROR', { message: 'Unknown action' })
        return
    }

    this.broadcastGameState(targetGameId)
  }

  // Основная игровая логика
  private async startGameSession(game: GameState) {
    // Устанавливаем фазу введения
    game.phase = 'introduction'
    game.phaseDuration = 30 // секунд на заставку
    game.status = 'active'
    
    this.broadcastGameState(game.id)
    
    // Заставка
    this.broadcastToGame(game.id, 'GAME_NARRATION', {
      title: '2247 год. Станция "Эдем"',
      text: `Научно-исследовательская станция «Эдем», находящаяся на орбите таинственной планеты Хелиос, подвергается нападению неизвестных сил. Системы жизнеобеспечения повреждены. Единственная спасательная капсула «Надежда» может вместить только ${Math.floor(game.players.size / 2)} человек. Экипаж из ${game.players.size} человек должен решить, кто выживет.`
    })
    
    // Запускаем таймер фазы
    this.startPhaseTimer(game)
    
    // Через 30 секунд начинаем подготовку
    setTimeout(() => {
      this.startPreparationPhase(game)
    }, 30000)
  }

  private startPreparationPhase(game: GameState) {
    game.phase = 'preparation'
    game.phaseDuration = 60 // 1 минута
    
    // Раздаем карты игрокам, если еще не раздали
    if (!game.deck) {
      this.dealCardsToPlayers(game)
    }
    
    this.broadcastGameState(game.id)
    this.startPhaseTimer(game)
    
    // Таймер подготовки
    setTimeout(() => {
      this.startDiscussionPhase(game)
    }, 60000)
  }

  private startDiscussionPhase(game: GameState) {
    game.phase = 'discussion'
    game.phaseDuration = game.settings.discussionTime
    game.voteTriggerCount = 0
    game.voteRequests = new Set()
    
    // Сбрасываем голоса
    Array.from(game.players.values()).forEach(player => {
      player.vote = undefined
      player.votesAgainst = 0
    })
    
    this.broadcastGameState(game.id)
    this.startPhaseTimer(game)
    
    // Таймер обсуждения
    setTimeout(() => {
      // Если никто не запросил голосование, проверяем кризис
      if (game.voteTriggerCount < Math.floor(Array.from(game.players.values()).filter(p => p.isAlive).length / 2)) {
        this.checkForCrisis(game)
      }
    }, game.settings.discussionTime * 1000)
  }

  private startVotingPhase(game: GameState) {
    game.phase = 'voting'
    game.phaseDuration = game.settings.votingTime
    game.votingResults = new Map()
    
    // Сбрасываем голоса
    Array.from(game.players.values()).forEach(player => {
      player.vote = undefined
      player.votesAgainst = 0
    })
    
    this.broadcastGameState(game.id)
    this.startPhaseTimer(game)
    
    // Таймер голосования
    setTimeout(() => {
      this.processVotingResults(game)
    }, game.settings.votingTime * 1000)
  }

  private processVotingResults(game: GameState) {
    if (!game.votingResults) return
    
    // Считаем голоса
    Array.from(game.players.values()).forEach(player => {
      if (player.vote && player.isAlive) {
        const currentVotes = game.votingResults!.get(player.vote) || 0
        game.votingResults!.set(player.vote, currentVotes + 1)
      }
    })
    
    // Находим игрока с максимальным количеством голосов
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
        
        // Увеличиваем счет выжившим
        Array.from(game.players.values())
          .filter(p => p.isAlive)
          .forEach(p => p.score += 10)
        
        this.broadcastToGame(game.id, 'PLAYER_EJECTED', {
          playerId: ejectedPlayerId,
          playerName: ejectedPlayer.name,
          votes: maxVotes
        })
        
        // Переходим к фазе раскрытия
        this.startRevealPhase(game, ejectedPlayer)
      }
    } else {
      // Ничья или никто не проголосовал
      this.broadcastToGame(game.id, 'VOTE_TIED', {
        message: 'Голосование завершилось ничьей'
      })
      
      // Проверяем кризис
      setTimeout(() => {
        this.checkForCrisis(game)
      }, 3000)
    }
  }

  private startRevealPhase(game: GameState, ejectedPlayer: GamePlayer) {
    game.phase = 'reveal'
    game.phaseDuration = 30
    
    // Раскрываем карты выбывшего игрока
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
    const alivePlayers = Array.from(game.players.values()).filter(p => p.isAlive)
    const capsuleCapacity = Math.floor(game.players.size / 2)
    
    // 1. Проверяем скрытые роли
    const hiddenRoleWinners = this.checkHiddenRoleWins(game)
    if (hiddenRoleWinners.length > 0) {
      this.endGame(game, hiddenRoleWinners, 'hidden_role_win')
      return
    }
    
    // 2. Проверяем, осталось ли место в капсуле
    if (alivePlayers.length <= capsuleCapacity) {
      // Все выжившие попадают в капсулу
      this.endGame(game, alivePlayers.map(p => p.id), 'capsule_full')
      return
    }
    
    // 3. Проверяем кризисы
    if (game.currentCrisis && !game.currentCrisis.solvedBy) {
      this.applyCrisisPenalty(game)
    } else {
      this.checkForCrisis(game)
    }
  }

  private checkForCrisis(game: GameState) {
    // Шанс возникновения кризиса зависит от сложности
    let crisisChance = 0.3 // 30% по умолчанию
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
    
    // Выбираем случайный кризис
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
    
    // Таймер на решение кризиса
    setTimeout(() => {
      if (game.currentCrisis?.isActive) {
        this.applyCrisisPenalty(game)
      }
    }, 60000)
  }

  private applyCrisisPenalty(game: GameState) {
    if (!game.currentCrisis) return
    
    const penalty = game.currentCrisis.penalty
    
    // Применяем штраф в зависимости от типа кризиса
    switch (game.currentCrisis.id) {
      case 'crisis_leak':
        // -1 место в капсуле
        game.capsuleSlots = Math.max(1, game.capsuleSlots - 1)
        this.broadcastToGame(game.id, 'CRISIS_PENALTY', {
          message: 'Утечка не устранена! Количество мест в капсуле уменьшено на 1.'
        })
        break
      case 'crisis_pathogen':
        // Заражаем случайного игрока
        const alivePlayers = Array.from(game.players.values()).filter(p => p.isAlive)
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
    
    // Переходим к новому раунду
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
    
    // Сбрасываем использованные способности
    Array.from(game.players.values()).forEach(player => {
      player.hasUsedAbility = false
    })
    
    this.broadcastGameState(game.id)
    this.startPhaseTimer(game)
    
    setTimeout(() => {
      if (game.round <= (game.maxRounds || 10)) {
        this.startDiscussionPhase(game)
      } else {
        // Игра завершена по таймауту раундов
        const survivors = Array.from(game.players.values()).filter(p => p.isAlive)
        const winners = survivors.map(p => p.id)
        
        // Если выживших больше, чем мест, выбираем случайных победителей
        if (winners.length > game.capsuleSlots) {
          // Перемешиваем и берем первых N
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
    
    // Останавливаем таймер
    if (game.timerInterval) {
      clearInterval(game.timerInterval)
      game.timerInterval = undefined
    }
    
    // Подсчитываем финальные очки
    Array.from(game.players.values()).forEach(player => {
      if (winnerIds.includes(player.id)) {
        player.score += 50 // бонус за победу
      }
      if (player.isAlive) {
        player.score += 20 // бонус за выживание
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
    // Инициализируем колоды
    game.deck = {
      professions: [...PROFESSIONS],
      healthStatuses: [...HEALTH_STATUSES],
      psychologicalTraits: [...PSYCHOLOGICAL_TRAITS],
      secrets: [...SECRETS],
      resources: [],
      hiddenRoles: [...HIDDEN_ROLES],
      roleCards: []
    }
    
    // Инициализируем капсулу
    game.capsuleSlots = Math.floor(game.players.size / 2)
    game.occupiedSlots = 0
    game.ejectedPlayers = []
    game.crisisHistory = []
    
    // Раздаем карты каждому игроку
    const playerArray = Array.from(game.players.values())
    
    playerArray.forEach((player, index) => {
      // Сбрасываем состояние
      player.isAlive = true
      player.score = 0
      player.votesAgainst = 0
      player.revealedCards = []
      player.hasUsedAbility = false
      player.isInfected = false
      player.isSuspicious = false
      
      // Профессия
      const professionIndex = Math.floor(Math.random() * game.deck.professions.length)
      player.profession = game.deck.professions[professionIndex]
      
      // Состояние здоровья
      const healthIndex = Math.floor(Math.random() * game.deck.healthStatuses.length)
      player.healthStatus = game.deck.healthStatuses[healthIndex]
      
      // Психологическая черта
      const traitIndex = Math.floor(Math.random() * game.deck.psychologicalTraits.length)
      player.psychologicalTrait = game.deck.psychologicalTraits[traitIndex]
      
      // Секрет (не всем)
      if (Math.random() < 0.3) { // 30% шанс получить секрет
        const secretIndex = Math.floor(Math.random() * game.deck.secrets.length)
        player.secret = game.deck.secrets[secretIndex]
      }
      
      // Скрытая роль (по настройкам игры)
      if (index < game.settings.hiddenRolesCount && game.deck.hiddenRoles.length > 0) {
        const roleIndex = Math.floor(Math.random() * game.deck.hiddenRoles.length)
        player.hiddenRole = game.deck.hiddenRoles[roleIndex]
        // Убираем использованную роль из колоды
        game.deck.hiddenRoles.splice(roleIndex, 1)
      }
      
      // Ролевая карта (Капитан/Старший офицер)
      if (index === 0) {
        player.roleCard = { 
          id: 'role_captain', 
          name: 'Капитан станции', 
          description: 'Имеет право вето на одно голосование за игру', 
          specialAbility: 'veto' 
        }
        player.isCaptain = true
      } else if (index === 1) {
        player.roleCard = { 
          id: 'role_officer', 
          name: 'Старший офицер', 
          description: 'Замещает капитана, дополнительный голос при ничьей', 
          specialAbility: 'extra_vote' 
        }
        player.isSeniorOfficer = true
      }
      
      // Пол
      const genderIndex = Math.floor(Math.random() * GENDERS.length)
      player.gender = GENDERS[genderIndex]
      
      // Возраст
      const ageIndex = Math.floor(Math.random() * AGES.length)
      player.age = AGES[ageIndex]
      
      // Телосложение
      const bodyIndex = Math.floor(Math.random() * BODY_TYPES.length)
      player.bodyType = BODY_TYPES[bodyIndex]
      
      // Проверяем, занимает ли телосложение дополнительное место
      if (player.bodyType?.id === 'body_huge') {
        game.occupiedSlots += 2
      } else if (player.age?.id === 'age_elder') {
        game.occupiedSlots += 1
      } else {
        game.occupiedSlots += 1
      }
    })
    
    // Отправляем карты игрокам
    playerArray.forEach(player => {
      this.sendPlayerCards(game, player)
    })
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
    }
  }

  private checkHiddenRoleWins(game: GameState): string[] {
    const winners: string[] = []
    
    Array.from(game.players.values()).forEach(player => {
      if (player.hiddenRole && player.isAlive) {
        switch (player.hiddenRole.id) {
          case 'role_saboteur':
            // Саботажник побеждает, если капсула не улетела и игра закончилась
            if (game.status === 'finished' && game.phase === 'game_over') {
              winners.push(player.id)
            }
            break
          case 'role_xenophag':
            // Агент ксенофагов побеждает, если заражен хотя бы один игрок
            const infectedPlayers = Array.from(game.players.values()).filter(p => p.isInfected)
            if (infectedPlayers.length > 0) {
              winners.push(player.id)
            }
            break
          case 'role_scientist':
            // Ученый побеждает, если выжил и имеет высокий счет
            if (player.score > 50) {
              winners.push(player.id)
            }
            break
        }
      }
    })
    
    return winners
  }

  private startPhaseTimer(game: GameState) {
    // Останавливаем предыдущий таймер
    if (game.timerInterval) {
      clearInterval(game.timerInterval)
    }
    
    // Устанавливаем время окончания фазы
    game.phaseEndTime = new Date(Date.now() + game.phaseDuration * 1000).toISOString()
    
    // Запускаем новый таймер
    game.timerInterval = setInterval(() => {
      const now = Date.now()
      const endTime = new Date(game.phaseEndTime!).getTime()
      
      if (now >= endTime) {
        clearInterval(game.timerInterval)
        game.timerInterval = undefined
        
        // Фаза завершилась, обрабатываем таймаут
        this.handlePhaseTimeout(game)
      }
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

  // Вспомогательные методы
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
    // Капитан использует право вето на текущее голосование
    game.votingResults?.clear()
    
    this.broadcastToGame(game.id, 'CAPTAIN_VETO_USED', {
      playerId: userId,
      playerName: game.players.get(userId)?.name,
      message: 'Капитан использовал право вето на голосование!'
    })
    
    // Переходим к обсуждению
    setTimeout(() => {
      this.startDiscussionPhase(game)
    }, 3000)
  }

  private handleSabotage(game: GameState, userId: string) {
    // Саботажник вызывает неисправность
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
    if (targetPlayer && targetPlayer.isAlive) {
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
    // Небинарная персона отменяет один голос против себя
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
    // Простой пропуск хода (для других типов игр)
    this.logger.log(`Skipping turn in game ${game.id}`)
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
    // Общая логика игрового действия
    const player = game.players.get(userId)
    if (player) {
      player.score += payload?.points || 1
    }
  }

  // Методы связи
  private broadcastGameState(gameId: string) {
    const game = this.games.get(gameId)
    if (!game) return
    
    this.server.to(gameId).emit('GAME_STATE', {
      gameState: this.serializeGameState(game)
    })
  }

  private broadcastToGame(gameId: string, event: string, data: any) {
    this.server.to(gameId).emit(event, data)
  }

  private serializeGameState(game: GameState) {
    return {
      id: game.id,
      lobbyId: game.lobbyId,
      status: game.status,
      phase: game.phase,
      players: Array.from(game.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        missions: p.missions,
        hours: p.hours,
        avatar: p.avatar,
        score: p.score,
        order: p.order,
        isActive: p.isActive,
        isAlive: p.isAlive,
        vote: p.vote,
        votesAgainst: p.votesAgainst,
        profession: p.profession?.name,
        isInfected: p.isInfected,
        isSuspicious: p.isSuspicious,
        isCaptain: p.isCaptain,
        isSeniorOfficer: p.isSeniorOfficer,
        revealedCards: p.revealedCards.length
      })),
      creatorId: game.creatorId,
      round: game.round,
      maxRounds: game.maxRounds,
      startedAt: game.startedAt,
      finishedAt: game.finishedAt,
      winnerId: game.winnerId,
      settings: game.settings,
      currentCrisis: game.currentCrisis,
      capsuleSlots: game.capsuleSlots,
      occupiedSlots: game.occupiedSlots,
      ejectedPlayers: game.ejectedPlayers,
      phaseEndTime: game.phaseEndTime,
      phaseDuration: game.phaseDuration,
      voteTriggerCount: game.voteTriggerCount,
      requiredVotes: Math.floor(Array.from(game.players.values()).filter(p => p.isAlive).length / 2)
    }
  }

  // Метод для создания игры из лобби
  createGameFromLobby(lobbyId: string, gameId: string, players: any[], creatorId: string, settings: any) {
    const gamePlayers = new Map<string, GamePlayer>()
    
    players.forEach((player, index) => {
      gamePlayers.set(player.id, {
        id: player.id,
        name: player.name,
        missions: player.missions || 0,
        hours: player.hours || 0,
        avatar: player.avatar,
        score: 0,
        order: index + 1,
        isActive: true,
        isAlive: true,
        votesAgainst: 0,
        revealedCards: []
      })
    })

    const gameState: GameState = {
      id: gameId,
      lobbyId,
      status: 'waiting', // Начинаем в режиме ожидания
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
        discussionTime: 180, // 3 минуты по умолчанию
        votingTime: 60, // 1 минута по умолчанию
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