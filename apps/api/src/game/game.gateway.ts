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

type CardKey =
	| 'profession'
	| 'health'
	| 'trait'
	| 'secret'
	| 'role'
	| 'resource'
	| 'gender'
	| 'age'
	| 'body'

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

type PublicCard = {
	id: string
	type: CardKey
	name: string
	description: string
	pros?: string[]
	cons?: string[]
	effects?: string[]
	goal?: string
	abilities?: string[]
	bonuses?: string[]
	range?: string
	effect?: string
	specialAbility?: string
	winCondition?: string
}

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

	isInfected?: boolean
	isSuspicious?: boolean
	isCaptain?: boolean
	isSeniorOfficer?: boolean
	hasUsedAbility?: boolean

	revealedCards: CardKey[]
	revealedCardsThisRound: CardKey[]

	vote?: string
	votesAgainst: number
}

type GamePhase =
	| 'introduction'
	| 'preparation'
	| 'discussion'
	| 'voting'
	| 'reveal'
	| 'crisis'
	| 'intermission'
	| 'game_over'

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

	phaseEndTime?: string
	phaseDuration: number
	timerInterval?: NodeJS.Timeout

	voteTriggerCount: number
	voteRequests: Set<string>
	dealtRounds: Set<number>
	introCompletedBy: Set<string>
	introSkippedBy: Set<string>
}

const GAME_ID_RE = /^game-[a-zA-Z0-9_-]+$/
const MSG_WINDOW_MS = 10_000
const MSG_MAX_PER_WINDOW = 15
const MSG_MAX_LEN = 300

const INTRO_DURATION_SECONDS = 45

function formatCapsuleSlotsCount(value: number) {
	const safeValue = Math.max(1, Math.floor(value))
	const mod10 = safeValue % 10
	const mod100 = safeValue % 100

	if (safeValue === 1) return 'одно место'
	if (mod100 >= 11 && mod100 <= 14) return `${safeValue} мест`
	if (mod10 >= 2 && mod10 <= 4) return `${safeValue} места`

	return `${safeValue} мест`
}

function createIntroNarrationText(game: GameState) {
	const capsuleSlots =
		game.capsuleSlots || Math.max(1, Math.floor(game.players.size / 2))

	return [
		'Год 2247. Научно-исследовательская станция «Эдем» удерживается на орбите Хелиоса — планеты, которую считали шансом для человечества.',
		'После атаки неизвестных сил внешний контур пробит. Связь оборвана, часть отсеков заблокирована, кислород уходит быстрее расчётов.',
		`В аварийном ангаре осталась капсула «Надежда». В ней всего ${formatCapsuleSlotsCount(capsuleSlots)}. Второго запуска не будет.`,
		'Экипаж должен решить, кто получит шанс на спасение. Но страх, ложь и саботаж уже стали частью этой станции.',
	].join('\n')
}

const PROFESSIONS: Profession[] = [
	{
		id: 'prof_engineer',
		name: 'Инженер-кинетик',
		description: 'Может починить любую систему голыми руками',
		pros: ['+2 к ремонту во время технологических кризисов'],
		cons: ['Разбирается в системах станции и может быть опасен при саботаже'],
		priority: ['technological'],
	},
	{
		id: 'prof_astrobiologist',
		name: 'Астробиолог',
		description: 'Знает, какие инопланетные споры съедобны',
		pros: ['Может идентифицировать биологические угрозы'],
		cons: ['Часто пропадает в лаборатории'],
		priority: ['biological'],
	},
	{
		id: 'prof_pilot',
		name: 'Пилот-ас',
		description: 'Может посадить корабль с закрытыми глазами',
		pros: ['Критически важен для управления капсулой'],
		cons: ['Всегда хочет быть у штурвала'],
		priority: ['external'],
	},
	{
		id: 'prof_surgeon',
		name: 'Хирург',
		description: 'Стабилизирует раненых членов экипажа',
		pros: ['Полезен при медицинских и биологических кризисах'],
		cons: ['Без оборудования работает хуже'],
		priority: ['biological', 'technological'],
	},
	{
		id: 'prof_linguist',
		name: 'Лингвист-ксенолог',
		description: 'Может расшифровывать неизвестные сигналы',
		pros: ['Полезен при внешних угрозах и контактах'],
		cons: ['Слабо помогает при ремонте станции'],
		priority: ['external'],
	},
	{
		id: 'prof_security',
		name: 'Офицер безопасности',
		description: 'Следит за порядком на станции',
		pros: ['Хорошо выявляет подозрительное поведение'],
		cons: ['Может действовать слишком жёстко'],
		priority: ['external', 'technological'],
	},
]

const HEALTH_STATUSES: HealthStatus[] = [
	{
		id: 'health_cyber',
		name: 'Кибернетические импланты',
		description: 'На 40% эффективнее, на 100% подозрительнее',
		effects: ['Не подвержен части биологических угроз', 'Может коротнуть'],
	},
	{
		id: 'health_virus',
		name: 'Латентный вирус Кси-7',
		description: 'Заразен в условиях стресса',
		effects: [
			'Может заразить других игроков при тесном контакте',
			'Иммунитет к некоторым патогенам',
		],
	},
	{
		id: 'health_trauma',
		name: 'Старая травма позвоночника',
		description: 'Ограничивает физические нагрузки',
		effects: ['Сложнее переносит физические кризисы'],
	},
	{
		id: 'health_excellent',
		name: 'Отличное здоровье',
		description: 'Редкий случай, когда медкарта почти пустая',
		effects: ['Лучше переносит штрафы и кризисы'],
	},
]

const PSYCHOLOGICAL_TRAITS: PsychologicalTrait[] = [
	{
		id: 'trait_panicker',
		name: 'Паникёр',
		description: 'Видит угрозу в каждой тени',
		effects: ['Часто ошибается в оценках', 'Иногда первым замечает опасность'],
		triggers: ['crisis', 'voting'],
	},
	{
		id: 'trait_pragmatic',
		name: 'Хладнокровный прагматик',
		description: 'Числа не лгут. Люди — иногда',
		effects: ['Точно оценивает шансы выживания', 'Кажется бесчувственным'],
		triggers: ['voting', 'discussion'],
	},
	{
		id: 'trait_leader',
		name: 'Прирождённый лидер',
		description: 'Умеет собирать людей вокруг решения',
		effects: ['Убедителен в обсуждении', 'Вызывает зависть у соперников'],
		triggers: ['discussion'],
	},
	{
		id: 'trait_secretive',
		name: 'Скрытный',
		description: 'Говорит мало и неохотно',
		effects: ['Сложно прочитать мотивы', 'Вызывает подозрения'],
		triggers: ['discussion', 'voting'],
	},
]

const SECRETS: Secret[] = [
	{
		id: 'secret_ai',
		name: 'Я — ИИ, скрывающийся в биоморфном теле',
		description: 'Искусственный интеллект в человеческом обличье',
		goal: 'Добраться до Земли любой ценой',
		abilities: ['Может взламывать системы станции'],
		isHiddenRole: false,
	},
	{
		id: 'secret_smuggler',
		name: 'Контрабандист',
		description: 'Вёз на станцию запрещённый груз',
		goal: 'Скрыть груз до конца эвакуации',
		abilities: ['Может получить дополнительный ресурс'],
		isHiddenRole: false,
	},
	{
		id: 'secret_clone',
		name: 'Нелегальный клон',
		description: 'Не должен был существовать официально',
		goal: 'Выжить и скрыть своё происхождение',
		abilities: ['Может запутать проверку личности'],
		isHiddenRole: false,
	},
]

const RESOURCES: Resource[] = [
	{
		id: 'resource_medkit',
		name: 'Медицинский набор',
		description: 'Компактный набор для экстренной помощи',
		effect: 'Может помочь при биологическом кризисе',
		occupiesSpace: true,
	},
	{
		id: 'resource_toolkit',
		name: 'Инженерный набор',
		description: 'Инструменты для ремонта систем станции',
		effect: 'Может помочь при технологическом кризисе',
		occupiesSpace: true,
	},
	{
		id: 'resource_data_core',
		name: 'Ядро данных станции',
		description: 'Содержит ценные сведения об аварии',
		effect: 'Даёт дополнительную информацию при обсуждении',
		occupiesSpace: true,
	},
]

const HIDDEN_ROLES: HiddenRole[] = [
	{
		id: 'role_saboteur',
		name: 'Саботажник',
		description: 'Работает на конкурентов или имеет личные мотивы',
		goal: 'Не дать капсуле улететь',
		abilities: ['Может вызывать мелкие неисправности'],
		winCondition: 'capsule_not_launched',
	},
	{
		id: 'role_xenophag',
		name: 'Агент ксенофагов',
		description: 'Заражён инопланетной формой жизни',
		goal: 'Доставить «образец» на Землю',
		abilities: ['Может заражать других игроков'],
		winCondition: 'at_least_one_infected',
	},
]

const GENDERS: Gender[] = [
	{
		id: 'gender_male',
		name: 'Мужчина',
		bonuses: ['+1 к физическим действиям в кризисах, связанных с силой'],
	},
	{
		id: 'gender_female',
		name: 'Женщина',
		bonuses: ['+1 к дипломатии и медицине', 'Меньший расход кислорода'],
	},
	{
		id: 'gender_nonbinary',
		name: 'Небинарная персона',
		bonuses: [
			'Может один раз за игру сменить восприятие себя другими, отменив один голос против себя',
		],
	},
]

const AGES: Age[] = [
	{
		id: 'age_young',
		name: 'Молодой',
		range: '18-25',
		effects: ['+1 к скорости реакции', '-1 к опыту'],
	},
	{
		id: 'age_mature',
		name: 'Зрелый',
		range: '26-50',
		effects: ['+1 к опыту', '-1 к скорости реакции'],
	},
	{
		id: 'age_elder',
		name: 'Пожилой',
		range: '51-70',
		effects: ['+2 к опыту', '-1 к выносливости'],
	},
]

const BODY_TYPES: BodyType[] = [
	{
		id: 'body_slim',
		name: 'Худощавое',
		effects: ['+1 к скрытности', '-1 к выносливости'],
	},
	{
		id: 'body_athletic',
		name: 'Атлетическое',
		effects: ['+1 к силе', '+1 к выносливости'],
	},
	{
		id: 'body_average',
		name: 'Среднее',
		effects: ['Без выраженных бонусов и штрафов'],
	},
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
		private readonly configService: ConfigService,
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
			} catch {
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

			const player = game.players.get(userId)

			if (player && player.isAlive === undefined) {
				player.isAlive = true
			}

			this.sendFullSync(socket, game, player)
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

		if (game.connections.size === 0) {
			setTimeout(() => {
				const currentGame = this.games.get(gameId)

				if (currentGame && currentGame.connections.size === 0) {
					this.games.delete(gameId)
					this.logger.log(`Игра ${gameId} очищена, так как нет подключений`)
				}
			}, 300000)
		}
	}

	@SubscribeMessage('JOIN_GAME')
	handleJoinGame(socket: Socket, data: { gameId?: string }) {
		const { userId, gameId: socketGameId } = socket.data
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

		this.sendFullSync(socket, game, player)
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
				socket.emit('ERROR', {
					message: 'Только создатель игры может начать сессию',
				})
				return
			}

			await this.startGameSession(game)
		} catch (error) {
			this.logger.error('Ошибка запуска игровой сессии:', error)
			socket.emit('ERROR', { message: 'Не удалось начать игровую сессию' })
		}
	}

	@SubscribeMessage('REQUEST_ROUND_CARDS')
	handleRequestRoundCards(socket: Socket) {
		const { userId, gameId } = socket.data
		const game = this.games.get(gameId)

		if (!game || game.status !== 'active') {
			socket.emit('ERROR', { message: 'Игра не активна' })
			return
		}

		const player = game.players.get(userId)
		if (!player) return

		this.sendPlayerCards(game, player)
	}

	@SubscribeMessage('SKIP_NARRATION')
	handleSkipNarration(socket: Socket) {
		const { userId, gameId } = socket.data
		const game = this.games.get(gameId)

		if (!game || game.phase !== 'introduction') return

		const player = game.players.get(userId)

		if (!player) {
			socket.emit('ERROR', { message: 'Вы не являетесь игроком этой игры' })
			return
		}

		if (!game.introCompletedBy) {
			game.introCompletedBy = new Set()
		}

		if (!game.introSkippedBy) {
			game.introSkippedBy = new Set()
		}

		game.introSkippedBy.add(userId)

		this.broadcastToGame(game.id, 'NARRATION_SKIP_PROGRESS', {
			skippedBy: userId,
			skippedByName: player.name,
			skippedCount: game.introSkippedBy.size,
			playersCount: game.players.size,
		})

		const readyPlayerIds = new Set<string>([
			...Array.from(game.introCompletedBy),
			...Array.from(game.introSkippedBy),
		])

		const allPlayersReady = readyPlayerIds.size >= game.players.size
		const allPlayersSkipped = game.introSkippedBy.size >= game.players.size

		if (!allPlayersReady) {
			return
		}

		this.broadcastToGame(game.id, 'NARRATION_ENDED', {
			skippedBy: allPlayersSkipped ? 'all' : 'system',
			skippedByName: 'Система',
		})

		this.broadcastSystemMessage(
			game,
			allPlayersSkipped
				? 'Все игроки согласились пропустить предысторию. Игра продолжается.'
				: 'Предыстория завершена. Игра продолжается.',
		)

		this.startPreparationPhase(game)
	}

	@SubscribeMessage('COMPLETE_NARRATION')
	handleCompleteNarration(socket: Socket) {
		const { userId, gameId } = socket.data
		const game = this.games.get(gameId)

		if (!game || game.phase !== 'introduction') return

		const player = game.players.get(userId)

		if (!player) {
			socket.emit('ERROR', { message: 'Вы не являетесь игроком этой игры' })
			return
		}

		if (!game.introCompletedBy) {
			game.introCompletedBy = new Set()
		}

		if (!game.introSkippedBy) {
			game.introSkippedBy = new Set()
		}

		game.introCompletedBy.add(userId)

		const readyPlayerIds = new Set<string>([
			...Array.from(game.introCompletedBy),
			...Array.from(game.introSkippedBy),
		])

		if (readyPlayerIds.size < game.players.size) {
			return
		}

		this.broadcastToGame(game.id, 'NARRATION_ENDED', {
			skippedBy: 'system',
			skippedByName: 'Система',
		})

		this.broadcastSystemMessage(
			game,
			'Предыстория завершена. Игра продолжается.',
		)

		this.startPreparationPhase(game)
	}

	@SubscribeMessage('START_DISCUSSION')
	handleStartDiscussion(socket: Socket) {
		const { gameId } = socket.data
		const game = this.games.get(gameId)

		if (game && game.phase === 'preparation') {
			this.startDiscussionPhase(game)
		}
	}

	@SubscribeMessage('SEND_MESSAGE')
	handleSendMessage(socket: Socket, data: { message?: any }) {
		const { userId, username, gameId } = socket.data
		const game = this.games.get(gameId)

		if (!game) return

		if (!game.players.has(userId)) {
			socket.emit('ERROR', { message: 'Вы не являетесь игроком этой игры' })
			return
		}

		if (!this.allowMessage(userId)) {
			socket.emit('ERROR', { message: 'Слишком много сообщений' })
			return
		}

		const msg = data?.message ?? {}
		const textRaw = typeof msg.text === 'string' ? msg.text : ''
		const text = textRaw.trim().slice(0, MSG_MAX_LEN)

		if (!text) return

		const messageWithAuth = {
			id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			playerId: userId,
			playerName: username || 'Игрок',
			text,
			type: 'player' as const,
			timestamp: new Date().toISOString(),
		}

		this.server.to(gameId).emit('CHAT_MESSAGE', {
			message: messageWithAuth,
		})
	}

	@SubscribeMessage('REVEAL_CARD')
	handleRevealCard(
		socket: Socket,
		data: { cardType?: string; cardId?: string },
	) {
		const { userId, gameId } = socket.data
		const game = this.games.get(gameId)

		if (!game || game.phase !== 'discussion') {
			socket.emit('ERROR', { message: 'Сейчас нельзя раскрыть карту' })
			return
		}

		const player = game.players.get(userId)

		if (!player || !player.isAlive) {
			socket.emit('ERROR', { message: 'Игрок не найден или выбыл' })
			return
		}

		const cardType = this.normalizeCardType(data?.cardType)

		if (!cardType) {
			socket.emit('ERROR', { message: 'Неизвестный тип карты' })
			return
		}

		const cardDetails = this.getPlayerCardDetails(player, cardType)

		if (!cardDetails) {
			socket.emit('ERROR', { message: 'У вас нет такой карты' })
			return
		}

		if (data?.cardId && cardDetails.id !== data.cardId) {
			socket.emit('ERROR', { message: 'ID карты не совпадает с картой игрока' })
			return
		}

		if (player.revealedCards.includes(cardType)) {
			socket.emit('ERROR', { message: 'Эта карта уже была раскрыта ранее' })
			return
		}

		if (player.revealedCardsThisRound.length >= 1) {
			socket.emit('ERROR', {
				message: 'В этом раунде можно раскрыть только одну карту',
			})
			return
		}

		player.revealedCards.push(cardType)
		player.revealedCardsThisRound.push(cardType)

		this.broadcastToGame(gameId, 'CARD_REVEALED', {
			playerId: userId,
			playerName: player.name,
			cardType,
			cardId: cardDetails.id,
			cardDetails,
		})

		this.broadcastGameState(gameId)
	}

	@SubscribeMessage('REQUEST_VOTE')
	handleRequestVote(socket: Socket) {
		const { userId, gameId } = socket.data
		const game = this.games.get(gameId)

		if (!game || game.phase !== 'discussion') {
			socket.emit('ERROR', {
				message: 'Можно запросить голосование только во время обсуждения',
			})
			return
		}

		const player = game.players.get(userId)

		if (!player || !player.isAlive) {
			socket.emit('ERROR', { message: 'Вы не можете запросить голосование' })
			return
		}

		if (game.voteRequests.has(userId)) {
			socket.emit('ERROR', { message: 'Вы уже запросили голосование' })
			return
		}

		game.voteRequests.add(userId)
		game.voteTriggerCount = game.voteRequests.size

		const aliveCount = this.getAlivePlayers(game).length
		const requiredVotes = this.getRequiredVoteRequests(aliveCount)

		this.broadcastToGame(gameId, 'VOTE_REQUESTED', {
			playerId: userId,
			playerName: player.name,
			voteCount: game.voteTriggerCount,
			requiredCount: requiredVotes,
		})

		this.broadcastGameState(gameId)

		if (game.voteTriggerCount >= requiredVotes) {
			this.startVotingPhase(game)
		}
	}

	@SubscribeMessage('VOTE_PLAYER')
	handleVotePlayer(socket: Socket, data: { targetPlayerId?: string }) {
		const { userId, gameId } = socket.data
		const game = this.games.get(gameId)

		if (!game || game.phase !== 'voting') {
			socket.emit('ERROR', { message: 'Сейчас не фаза голосования' })
			return
		}

		const player = game.players.get(userId)
		const targetPlayerId = data?.targetPlayerId || ''
		const targetPlayer = game.players.get(targetPlayerId)

		if (!player || !targetPlayer || !player.isAlive || !targetPlayer.isAlive) {
			socket.emit('ERROR', { message: 'Неверная цель голосования' })
			return
		}

		if (player.id === targetPlayer.id) {
			socket.emit('ERROR', { message: 'Нельзя голосовать против себя' })
			return
		}

		if (player.vote) {
			socket.emit('ERROR', { message: 'Вы уже проголосовали' })
			return
		}

		player.vote = targetPlayerId
		targetPlayer.votesAgainst = (targetPlayer.votesAgainst || 0) + 1

		this.broadcastToGame(gameId, 'PLAYER_VOTED', {
			voterId: userId,
			voterName: player.name,
			targetId: targetPlayerId,
			targetName: targetPlayer.name,
		})

		this.broadcastGameState(gameId)

		const alivePlayers = this.getAlivePlayers(game)
		const votedPlayers = alivePlayers.filter(p => p.vote)

		if (votedPlayers.length === alivePlayers.length) {
			this.processVotingResults(game)
		}
	}

	@SubscribeMessage('USE_ABILITY')
	handleUseAbility(
		socket: Socket,
		data: { ability?: string; targetPlayerId?: string },
	) {
		const { userId, gameId } = socket.data
		const game = this.games.get(gameId)

		if (!game) return

		const player = game.players.get(userId)

		if (!player || player.hasUsedAbility) {
			socket.emit('ERROR', { message: 'Нельзя использовать способность' })
			return
		}

		switch (data?.ability) {
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
					this.handleInfect(game, userId, data?.targetPlayerId)
					player.hasUsedAbility = true
				}
				break

			case 'nonbinary_ability':
				if (player.gender?.id === 'gender_nonbinary') {
					this.handleNonbinaryAbility(game, userId)
					player.hasUsedAbility = true
				}
				break

			default:
				socket.emit('ERROR', { message: 'Неизвестная способность' })
				return
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

		if (!player || !player.isAlive) {
			socket.emit('ERROR', { message: 'Вы не можете решить кризис' })
			return
		}

		const canSolve =
			!!player.profession &&
			game.currentCrisis.priorityProfessions.includes(player.profession.id)

		const hasNoPriority =
			!game.currentCrisis.priorityProfessions ||
			game.currentCrisis.priorityProfessions.length === 0

		if (canSolve || hasNoPriority) {
			game.currentCrisis.isActive = false
			game.currentCrisis.solvedBy = userId
			player.score += 20

			this.broadcastToGame(gameId, 'CRISIS_SOLVED', {
				playerId: userId,
				playerName: player.name,
				crisis: game.currentCrisis.name,
				profession: player.profession?.name,
			})

			this.broadcastSystemMessage(
				game,
				`✅ Игрок ${player.name} (${player.profession?.name}) решил кризис "${game.currentCrisis.name}"!`,
			)

			this.startNewRound(game)
		} else {
			const needed = game.currentCrisis.priorityProfessions.join(', ')
			const errorMsg = `❌ Ваша профессия "${
				player.profession?.name || 'Неизвестна'
			}" не подходит для решения кризиса. Нужны: ${needed}`

			socket.emit('ERROR', { message: errorMsg })
			this.sendSystemMessageToSocket(socket, errorMsg)
		}
	}

	@SubscribeMessage('GAME_ACTION')
	handleGameAction(
		socket: Socket,
		data: { action?: string; payload?: any; gameId?: string },
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

		switch (data?.action) {
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

	private async startGameSession(game: GameState) {
		this.logger.log(`Запуск игровой сессии для ${game.id}`)

		game.status = 'active'
		game.round = 1
		game.voteTriggerCount = 0
		game.voteRequests = new Set()
		game.votingResults = new Map()
		game.dealtRounds = new Set()
		game.introCompletedBy = new Set()
		game.introSkippedBy = new Set()

		this.resetPlayersForGameStart(game)
		this.dealBaseCardsToPlayers(game)
		this.dealRoundCardsToPlayers(game)

		game.dealtRounds.add(1)

		this.sendCardsToAllPlayers(game)

		this.setPhase(game, 'introduction', INTRO_DURATION_SECONDS)

		this.broadcastToGame(game.id, 'GAME_NARRATION', {
			title: 'СТАНЦИЯ «ЭДЕМ»',
			text: createIntroNarrationText(game),
			duration: INTRO_DURATION_SECONDS,
			phaseEndTime: game.phaseEndTime,
		})
	}

	private setPhase(game: GameState, phase: GamePhase, duration: number) {
		this.clearTimer(game)

		game.phase = phase
		game.phaseDuration = duration
		game.phaseEndTime = new Date(Date.now() + duration * 1000).toISOString()

		this.broadcastToGame(game.id, 'PHASE_CHANGED', {
			phase,
			duration,
			phaseEndTime: game.phaseEndTime,
			gameState: this.serializeGameState(game),
		})

		this.broadcastGameState(game.id)
		this.startPhaseTimer(game)
	}

	private resetPlayersForGameStart(game: GameState) {
		Array.from(game.players.values()).forEach(player => {
			player.isAlive = true
			player.score = 0
			player.votesAgainst = 0
			player.revealedCards = []
			player.revealedCardsThisRound = []
			player.hasUsedAbility = false
			player.isInfected = false
			player.isSuspicious = false
			player.vote = undefined

			player.profession = undefined
			player.healthStatus = undefined
			player.psychologicalTrait = undefined
			player.secret = undefined
			player.resource = undefined
			player.hiddenRole = undefined
			player.roleCard = undefined
			player.gender = undefined
			player.age = undefined
			player.bodyType = undefined
		})

		game.capsuleSlots = Math.floor(game.players.size / 2)
		game.occupiedSlots = 0
		game.ejectedPlayers = []
		game.crisisHistory = []
		game.currentCrisis = undefined
	}

	private dealBaseCardsToPlayers(game: GameState) {
		const players = Array.from(game.players.values())
		const professionsPool = [...PROFESSIONS]
		const hiddenRolesPool = [...HIDDEN_ROLES]

		players.forEach((player, index) => {
			player.profession = this.takeRandomFromPoolWithFallback(
				professionsPool,
				PROFESSIONS,
			)

			if (
				index < game.settings.hiddenRolesCount &&
				hiddenRolesPool.length > 0
			) {
				player.hiddenRole = this.takeRandomFromPoolWithFallback(
					hiddenRolesPool,
					HIDDEN_ROLES,
				)
			}

			if (index === 0) {
				player.roleCard = {
					id: 'role_captain',
					name: 'Капитан станции',
					description: 'Имеет право вето на одно голосование за игру',
					specialAbility: 'veto',
				}
				player.isCaptain = true
			} else if (index === 1) {
				player.roleCard = {
					id: 'role_officer',
					name: 'Старший офицер',
					description: 'Замещает капитана, дополнительный голос при ничьей',
					specialAbility: 'extra_vote',
				}
				player.isSeniorOfficer = true
			}
		})
	}

	private dealRoundCardsToPlayers(game: GameState) {
		const cardsCount = game.round === 1 ? 1 : 2

		this.getAlivePlayers(game).forEach(player => {
			const cards: PublicCard[] = []

			for (let i = 0; i < cardsCount; i++) {
				const card = this.giveRandomCard(player)

				if (card) {
					cards.push(card)
				}
			}

			const socket = game.connections.get(player.id)

			if (socket && cards.length > 0) {
				socket.emit('NEW_CARDS', {
					round: game.round,
					cards,
				})
			}
		})
	}

	private giveRandomCard(player: GamePlayer): PublicCard | null {
		const available: CardKey[] = []

		if (!player.gender) available.push('gender')
		if (!player.age) available.push('age')
		if (!player.bodyType) available.push('body')
		if (!player.healthStatus) available.push('health')
		if (!player.psychologicalTrait) available.push('trait')
		if (!player.secret) available.push('secret')
		if (!player.resource) available.push('resource')

		if (available.length === 0) return null

		const selectedType = available[Math.floor(Math.random() * available.length)]

		switch (selectedType) {
			case 'gender':
				player.gender = this.getRandomFromArray(GENDERS)
				return this.toPublicCard('gender', player.gender)

			case 'age':
				player.age = this.getRandomFromArray(AGES)
				return this.toPublicCard('age', player.age)

			case 'body':
				player.bodyType = this.getRandomFromArray(BODY_TYPES)
				return this.toPublicCard('body', player.bodyType)

			case 'health':
				player.healthStatus = this.getRandomFromArray(HEALTH_STATUSES)
				return this.toPublicCard('health', player.healthStatus)

			case 'trait':
				player.psychologicalTrait =
					this.getRandomFromArray(PSYCHOLOGICAL_TRAITS)
				return this.toPublicCard('trait', player.psychologicalTrait)

			case 'secret':
				player.secret = this.getRandomFromArray(SECRETS)
				return this.toPublicCard('secret', player.secret)

			case 'resource':
				player.resource = this.getRandomFromArray(RESOURCES)
				return this.toPublicCard('resource', player.resource)

			default:
				return null
		}
	}

	private startPreparationPhase(game: GameState) {
		if (game.status !== 'active') return

		if (!game.dealtRounds.has(game.round)) {
			this.dealRoundCardsToPlayers(game)
			game.dealtRounds.add(game.round)
		}

		this.sendCardsToAllPlayers(game)
		this.setPhase(game, 'preparation', 30)
	}

	private startDiscussionPhase(game: GameState) {
		if (game.status !== 'active') return

		game.voteTriggerCount = 0
		game.voteRequests = new Set()

		Array.from(game.players.values()).forEach(player => {
			player.vote = undefined
			player.votesAgainst = 0
		})

		this.setPhase(game, 'discussion', game.settings.discussionTime)
	}

	private startVotingPhase(game: GameState) {
		if (game.status !== 'active') return

		game.votingResults = new Map()

		Array.from(game.players.values()).forEach(player => {
			player.vote = undefined
			player.votesAgainst = 0
		})

		this.broadcastSystemMessage(game, '🗳 Началось голосование.')
		this.setPhase(game, 'voting', game.settings.votingTime)
	}

	private processVotingResults(game: GameState) {
		if (game.phase !== 'voting') return

		game.votingResults = new Map()

		this.getAlivePlayers(game).forEach(player => {
			if (!player.vote) return

			const currentVotes = game.votingResults!.get(player.vote) || 0
			game.votingResults!.set(player.vote, currentVotes + 1)
		})

		let maxVotes = 0
		let ejectedPlayerId = ''
		let tie = false

		game.votingResults.forEach((votes, playerId) => {
			if (votes > maxVotes) {
				maxVotes = votes
				ejectedPlayerId = playerId
				tie = false
			} else if (votes === maxVotes && votes > 0) {
				tie = true
			}
		})

		if (!ejectedPlayerId || maxVotes <= 0 || tie) {
			this.broadcastToGame(game.id, 'VOTE_TIED', {
				message: 'Голосование завершилось ничьей',
			})

			this.checkForCrisis(game)
			return
		}

		const ejectedPlayer = game.players.get(ejectedPlayerId)

		if (!ejectedPlayer) {
			this.checkForCrisis(game)
			return
		}

		ejectedPlayer.isAlive = false
		game.ejectedPlayers.push(ejectedPlayerId)

		this.getAlivePlayers(game).forEach(player => {
			player.score += 10
		})

		this.broadcastToGame(game.id, 'PLAYER_EJECTED', {
			playerId: ejectedPlayerId,
			playerName: ejectedPlayer.name,
			votes: maxVotes,
			cards: this.getAllPlayerCards(ejectedPlayer),
		})

		this.startRevealPhase(game, ejectedPlayer)
	}

	private startRevealPhase(game: GameState, ejectedPlayer: GamePlayer) {
		this.broadcastToGame(game.id, 'PLAYER_REVEAL', {
			playerId: ejectedPlayer.id,
			playerName: ejectedPlayer.name,
			cards: this.getAllPlayerCards(ejectedPlayer),
		})

		this.setPhase(game, 'reveal', 30)
	}

	private checkGameEnd(game: GameState) {
		const alivePlayers = this.getAlivePlayers(game)
		const capsuleCapacity =
			game.capsuleSlots || Math.floor(game.players.size / 2)

		const hiddenRoleWinners = this.checkHiddenRoleWins(game)

		if (hiddenRoleWinners.length > 0) {
			this.endGame(game, hiddenRoleWinners, 'hidden_role_win')
			return
		}

		if (alivePlayers.length <= capsuleCapacity) {
			this.endGame(
				game,
				alivePlayers.map(p => p.id),
				'capsule_full',
			)
			return
		}

		if (game.currentCrisis && !game.currentCrisis.solvedBy) {
			this.applyCrisisPenalty(game)
		} else {
			this.checkForCrisis(game)
		}
	}

	private checkForCrisis(game: GameState) {
		if (game.status !== 'active') return

		let crisisChance = 0.3

		switch (game.settings.difficulty) {
			case 'easy':
				crisisChance = 0.2
				break

			case 'hard':
				crisisChance = 0.4
				break

			default:
				crisisChance = 0.3
				break
		}

		if (Math.random() < crisisChance && game.settings.enableCrises) {
			this.triggerCrisis(game)
		} else {
			this.startNewRound(game)
		}
	}

	private triggerCrisis(game: GameState) {
		const crisisTypes = ['technological', 'biological', 'external']
		const randomType = crisisTypes[
			Math.floor(Math.random() * crisisTypes.length)
		] as Crisis['type']

		let crisis: Crisis

		switch (randomType) {
			case 'technological':
				crisis = {
					id: 'crisis_leak',
					type: 'technological',
					name: 'Утечка в отсеке хранения',
					description: 'Обнаружена утечка опасных химикатов в отсеке хранения',
					priorityProfessions: ['prof_engineer', 'prof_surgeon'],
					penalty: '-1 место в капсуле, если не устранено',
					isActive: true,
				}
				break

			case 'biological':
				crisis = {
					id: 'crisis_pathogen',
					type: 'biological',
					name: 'Вспышка неизвестного патогена',
					description:
						'Системы обнаружили вспышку неизвестного патогена в системе вентиляции',
					priorityProfessions: ['prof_astrobiologist', 'prof_surgeon'],
					penalty: 'Случайный игрок получает заражение',
					isActive: true,
				}
				break

			default:
				crisis = {
					id: 'crisis_signal',
					type: 'external',
					name: 'Неопознанный сигнал',
					description:
						'Станция получает неопознанный сигнал с неизвестным источником',
					priorityProfessions: ['prof_linguist', 'prof_pilot'],
					penalty: 'Помощь или новая угроза',
					isActive: true,
				}
				break
		}

		game.currentCrisis = crisis
		game.crisisHistory.push(crisis)

		this.broadcastToGame(game.id, 'CRISIS_TRIGGERED', {
			crisis,
		})

		this.setPhase(game, 'crisis', 60)
	}

	private applyCrisisPenalty(game: GameState) {
		if (!game.currentCrisis) return

		switch (game.currentCrisis.id) {
			case 'crisis_leak':
				game.capsuleSlots = Math.max(1, game.capsuleSlots - 1)
				this.broadcastToGame(game.id, 'CRISIS_PENALTY', {
					message:
						'Утечка не устранена! Количество мест в капсуле уменьшено на 1.',
				})
				break

			case 'crisis_pathogen': {
				const alivePlayers = this.getAlivePlayers(game)

				if (alivePlayers.length > 0) {
					const randomPlayer =
						alivePlayers[Math.floor(Math.random() * alivePlayers.length)]

					randomPlayer.isInfected = true

					this.broadcastToGame(game.id, 'CRISIS_PENALTY', {
						message: `Игрок ${randomPlayer.name} заразился неизвестным патогеном!`,
						infectedPlayerId: randomPlayer.id,
					})
				}
				break
			}

			default:
				this.broadcastToGame(game.id, 'CRISIS_PENALTY', {
					message: 'Кризис не был решён вовремя.',
				})
				break
		}

		game.currentCrisis.isActive = false
		this.startNewRound(game)
	}

	private startNewRound(game: GameState) {
		if (game.status !== 'active') return

		game.round++
		game.currentCrisis = undefined
		game.voteTriggerCount = 0
		game.voteRequests = new Set()

		Array.from(game.players.values()).forEach(player => {
			player.hasUsedAbility = false
			player.revealedCardsThisRound = []
			player.vote = undefined
			player.votesAgainst = 0
		})

		this.broadcastToGame(game.id, 'ROUND_STARTED', {
			roundNumber: game.round,
		})

		this.setPhase(game, 'intermission', 10)
	}

	private endGame(game: GameState, winnerIds: string[], reason: string) {
		game.phase = 'game_over'
		game.status = 'finished'
		game.finishedAt = new Date().toISOString()
		game.winnerId = winnerIds[0]

		this.clearTimer(game)

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
			finalScores: Array.from(game.players.values()).map(player => ({
				id: player.id,
				name: player.name,
				score: player.score,
				survived: winnerIds.includes(player.id),
				role: player.hiddenRole?.name || player.profession?.name || 'Экипаж',
			})),
		})

		this.broadcastGameState(game.id)
	}

	private startPhaseTimer(game: GameState) {
		this.clearTimer(game)

		if (!game.phaseEndTime) {
			game.phaseEndTime = new Date(
				Date.now() + game.phaseDuration * 1000,
			).toISOString()
		}

		game.timerInterval = setInterval(() => {
			const endTime = new Date(game.phaseEndTime || '').getTime()
			const timeRemaining = endTime - Date.now()
			const timeLeft = Math.max(0, Math.ceil(timeRemaining / 1000))

			if (timeRemaining <= 0) {
				this.clearTimer(game)
				this.handlePhaseTimeout(game)
				return
			}

			this.server.to(game.id).emit('TIMER_UPDATE', {
				phase: game.phase,
				timeLeft,
				phaseEndTime: game.phaseEndTime,
			})
		}, 1000)
	}

	private handlePhaseTimeout(game: GameState) {
		if (game.status !== 'active') return

		switch (game.phase) {
			case 'introduction':
				this.server.to(game.id).emit('TIMER_UPDATE', {
					phase: game.phase,
					timeLeft: 0,
					phaseEndTime: game.phaseEndTime,
				})

				this.broadcastToGame(game.id, 'NARRATION_ENDED', {
					skippedBy: 'system',
					skippedByName: 'Система',
				})

				this.broadcastSystemMessage(
					game,
					'Предыстория завершена. Игра продолжается.',
				)

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
				if (game.round <= (game.maxRounds || game.settings.maxRounds || 10)) {
					this.startPreparationPhase(game)
				} else {
					const survivors = this.getAlivePlayers(game)
					let winners = survivors.map(player => player.id)

					if (winners.length > game.capsuleSlots) {
						winners = winners
							.sort(() => Math.random() - 0.5)
							.slice(0, game.capsuleSlots)
					}

					this.endGame(game, winners, 'round_limit')
				}
				break

			default:
				break
		}
	}

	private clearTimer(game: GameState) {
		if (game.timerInterval) {
			clearInterval(game.timerInterval)
			game.timerInterval = undefined
		}
	}

	private checkHiddenRoleWins(game: GameState): string[] {
		const winners: string[] = []

		Array.from(game.players.values()).forEach(player => {
			if (!player.hiddenRole || player.isAlive !== true) return

			switch (player.hiddenRole.id) {
				case 'role_saboteur':
					if (game.capsuleSlots <= 0) {
						winners.push(player.id)
					}
					break

				case 'role_xenophag': {
					const infectedPlayers = Array.from(game.players.values()).filter(
						p => p.isInfected === true,
					)

					if (infectedPlayers.length > 0) {
						winners.push(player.id)
					}
					break
				}

				default:
					break
			}
		})

		return winners
	}

	private sendFullSync(socket: Socket, game: GameState, player?: GamePlayer) {
		socket.emit('GAME_STATE', {
			gameState: this.serializeGameState(game),
		})

		if (player) {
			this.sendPlayerCards(game, player)
		}
	}

	private sendCardsToAllPlayers(game: GameState) {
		Array.from(game.players.values()).forEach(player => {
			this.sendPlayerCards(game, player)
		})
	}

	private sendPlayerCards(game: GameState, player: GamePlayer) {
		const socket = game.connections.get(player.id)
		if (!socket) return

		const currentCards: Record<string, PublicCard> = {}

		if (player.profession) {
			currentCards.profession = this.toPublicCard(
				'profession',
				player.profession,
			)
		}

		if (player.healthStatus) {
			currentCards.healthStatus = this.toPublicCard(
				'health',
				player.healthStatus,
			)
		}

		if (player.psychologicalTrait) {
			currentCards.psychologicalTrait = this.toPublicCard(
				'trait',
				player.psychologicalTrait,
			)
		}

		if (player.secret) {
			currentCards.secret = this.toPublicCard('secret', player.secret)
		}

		if (player.resource) {
			currentCards.resource = this.toPublicCard('resource', player.resource)
		}

		if (player.hiddenRole) {
			currentCards.hiddenRole = this.toPublicCard('role', player.hiddenRole)
		}

		if (player.roleCard) {
			currentCards.roleCard = this.toPublicCard('role', player.roleCard)
		}

		if (player.gender) {
			currentCards.gender = this.toPublicCard('gender', player.gender)
		}

		if (player.age) {
			currentCards.age = this.toPublicCard('age', player.age)
		}

		if (player.bodyType) {
			currentCards.bodyType = this.toPublicCard('body', player.bodyType)
		}

		socket.emit('YOUR_CARDS', currentCards)
	}

	private normalizeCardType(type?: string): CardKey | null {
		switch (type) {
			case 'profession':
				return 'profession'

			case 'health':
			case 'healthStatus':
				return 'health'

			case 'trait':
			case 'psychologicalTrait':
				return 'trait'

			case 'secret':
				return 'secret'

			case 'role':
			case 'hiddenRole':
			case 'roleCard':
				return 'role'

			case 'resource':
				return 'resource'

			case 'gender':
				return 'gender'

			case 'age':
				return 'age'

			case 'body':
			case 'bodyType':
				return 'body'

			default:
				return null
		}
	}

	private getPlayerCardDetails(
		player: GamePlayer,
		type: CardKey,
	): PublicCard | null {
		switch (type) {
			case 'profession':
				return player.profession
					? this.toPublicCard('profession', player.profession)
					: null

			case 'health':
				return player.healthStatus
					? this.toPublicCard('health', player.healthStatus)
					: null

			case 'trait':
				return player.psychologicalTrait
					? this.toPublicCard('trait', player.psychologicalTrait)
					: null

			case 'secret':
				return player.secret ? this.toPublicCard('secret', player.secret) : null

			case 'role':
				if (player.roleCard) {
					return this.toPublicCard('role', player.roleCard)
				}

				if (player.hiddenRole) {
					return this.toPublicCard('role', player.hiddenRole)
				}

				return null

			case 'resource':
				return player.resource
					? this.toPublicCard('resource', player.resource)
					: null

			case 'gender':
				return player.gender ? this.toPublicCard('gender', player.gender) : null

			case 'age':
				return player.age ? this.toPublicCard('age', player.age) : null

			case 'body':
				return player.bodyType
					? this.toPublicCard('body', player.bodyType)
					: null

			default:
				return null
		}
	}

	private getAllPlayerCards(player: GamePlayer) {
		const cards: Record<string, PublicCard | null> = {}

		const cardTypes: CardKey[] = [
			'profession',
			'gender',
			'age',
			'body',
			'health',
			'trait',
			'secret',
			'resource',
			'role',
		]

		cardTypes.forEach(type => {
			const card = this.getPlayerCardDetails(player, type)

			if (card) {
				cards[type] = card
			}
		})

		return cards
	}

	private toPublicCard(type: CardKey, card: any): PublicCard {
		const base: PublicCard = {
			id: String(card.id),
			type,
			name: String(card.name),
			description: String(card.description || ''),
		}

		if (Array.isArray(card.pros)) base.pros = card.pros
		if (Array.isArray(card.cons)) base.cons = card.cons
		if (Array.isArray(card.effects)) base.effects = card.effects
		if (Array.isArray(card.abilities)) base.abilities = card.abilities
		if (Array.isArray(card.bonuses)) base.bonuses = card.bonuses
		if (typeof card.goal === 'string') base.goal = card.goal
		if (typeof card.range === 'string') base.range = card.range
		if (typeof card.effect === 'string') base.effect = card.effect
		if (typeof card.specialAbility === 'string') {
			base.specialAbility = card.specialAbility
		}
		if (typeof card.winCondition === 'string') {
			base.winCondition = card.winCondition
		}

		if (!base.description) {
			if (base.effects?.length) base.description = base.effects.join(', ')
			else if (base.bonuses?.length) base.description = base.bonuses.join(', ')
			else if (base.effect) base.description = base.effect
			else if (base.range) base.description = base.range
		}

		return base
	}

	private getRandomFromArray<T>(items: T[]): T {
		return items[Math.floor(Math.random() * items.length)]
	}

	private takeRandomFromPoolWithFallback<T>(pool: T[], fallback: T[]): T {
		if (pool.length > 0) {
			const index = Math.floor(Math.random() * pool.length)
			const item = pool[index]
			pool.splice(index, 1)
			return item
		}

		return this.getRandomFromArray(fallback)
	}

	private getAlivePlayers(game: GameState) {
		return Array.from(game.players.values()).filter(
			player => player.isAlive === true,
		)
	}

	private getRequiredVoteRequests(aliveCount: number) {
		return Math.max(1, Math.ceil(aliveCount / 2))
	}

	private handleCaptainVeto(game: GameState, userId: string) {
		game.votingResults?.clear()

		this.broadcastToGame(game.id, 'CAPTAIN_VETO_USED', {
			playerId: userId,
			playerName: game.players.get(userId)?.name,
			message: 'Капитан использовал право вето на голосование!',
		})

		this.startDiscussionPhase(game)
	}

	private handleSabotage(game: GameState, userId: string) {
		game.capsuleSlots = Math.max(1, game.capsuleSlots - 1)

		this.broadcastToGame(game.id, 'SABOTAGE_OCCURRED', {
			playerId: userId,
			playerName: game.players.get(userId)?.name,
			message:
				'Произошла неисправность! Количество мест в капсуле уменьшено на 1.',
		})
	}

	private handleInfect(
		game: GameState,
		userId: string,
		targetPlayerId?: string,
	) {
		if (!targetPlayerId) return

		const targetPlayer = game.players.get(targetPlayerId)

		if (targetPlayer && targetPlayer.isAlive === true) {
			targetPlayer.isInfected = true

			this.broadcastToGame(game.id, 'PLAYER_INFECTED', {
				infectedBy: userId,
				infectedByName: game.players.get(userId)?.name,
				playerId: targetPlayerId,
				playerName: targetPlayer.name,
			})
		}
	}

	private handleNonbinaryAbility(game: GameState, userId: string) {
		const player = game.players.get(userId)

		if (!player) return

		player.votesAgainst = Math.max(0, player.votesAgainst - 1)

		this.broadcastToGame(game.id, 'NONBINARY_ABILITY_USED', {
			playerId: userId,
			playerName: player.name,
			message: `${player.name} использовал(а) свою способность, отменив один голос против себя`,
		})
	}

	private handleSkipTurn(game: GameState) {
		this.logger.log(`Пропуск хода в игре ${game.id}`)
	}

	private handleEndGame(game: GameState, userId: string) {
		if (game.creatorId !== userId) {
			this.logger.warn(
				`Игрок ${userId} попытался завершить игру без разрешения`,
			)
			return
		}

		game.status = 'cancelled'
		game.finishedAt = new Date().toISOString()

		this.clearTimer(game)

		this.server.to(game.id).emit('GAME_FINISHED', {
			gameState: this.serializeGameState(game),
			reason: 'cancelled_by_creator',
		})
	}

	private handlePlayerAction(game: GameState, userId: string, payload: any) {
		const player = game.players.get(userId)

		if (player) {
			player.score += payload?.points || 1
		}
	}

	private serializeGameState(game: GameState) {
		const players = Array.from(game.players.values()).map(player => {
			const revealedCardsInfo: Record<
				string,
				{ name: string; type: string; id: string }
			> = {}

			player.revealedCards.forEach(cardType => {
				const card = this.getPlayerCardDetails(player, cardType)

				if (!card) return

				revealedCardsInfo[cardType] = {
					name: card.name,
					type: card.type,
					id: card.id,
				}
			})

			return {
				id: player.id,
				name: player.name || 'Безымянный',
				missions: player.missions || 0,
				hours: player.hours || 0,
				avatar: player.avatar,
				score: player.score || 0,
				order: player.order || 0,
				isActive: player.isActive !== false,
				isAlive: player.isAlive === true,
				vote: player.vote,
				votesAgainst: player.votesAgainst || 0,
				profession: player.profession?.name,
				isInfected: player.isInfected || false,
				isSuspicious: player.isSuspicious || false,
				isCaptain: player.isCaptain || false,
				isSeniorOfficer: player.isSeniorOfficer || false,
				revealedCards: player.revealedCards?.length || 0,
				revealedCardsInfo,
				revealedCardsThisRound: player.revealedCardsThisRound || [],
				hasUsedAbility: player.hasUsedAbility || false,
			}
		})

		const aliveCount = players.filter(player => player.isAlive).length

		return {
			id: game.id,
			lobbyId: game.lobbyId,
			status: game.status,
			phase: game.phase,
			players,
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
			voteRequestPlayerIds: Array.from(game.voteRequests || []),
			requiredVotes: this.getRequiredVoteRequests(aliveCount),
			introSkipProgress: {
				skippedCount: game.introSkippedBy?.size || 0,
				playersCount: game.players.size,
			},
		}
	}

	createGameFromLobby(
		lobbyId: string,
		gameId: string,
		players: any[],
		creatorId: string,
		settings: any,
	) {
		const gamePlayers = new Map<string, GamePlayer>()

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
				revealedCardsThisRound: [],
				hasUsedAbility: false,
				isInfected: false,
				isSuspicious: false,
				isCaptain: index === 0,
				isSeniorOfficer: index === 1,
			}

			gamePlayers.set(player.id, gamePlayer)
		})

		const rawDifficulty = settings?.difficulty
		const difficulty: GameSettings['difficulty'] =
			rawDifficulty === 'easy' || rawDifficulty === 'hard'
				? rawDifficulty
				: 'normal'

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
				hiddenRolesCount: Math.min(
					settings?.hiddenRolesCount || 1,
					players.length,
				),
				enableCrises: settings?.enableCrises !== false,
				difficulty,
				tournamentMode: settings?.tournamentMode || false,
			},
			deck: {
				professions: [...PROFESSIONS],
				healthStatuses: [...HEALTH_STATUSES],
				psychologicalTraits: [...PSYCHOLOGICAL_TRAITS],
				secrets: [...SECRETS],
				resources: [...RESOURCES],
				hiddenRoles: [...HIDDEN_ROLES],
				roleCards: [],
			},
			ejectedPlayers: [],
			capsuleSlots: Math.floor(players.length / 2),
			occupiedSlots: 0,
			crisisHistory: [],
			phaseDuration: INTRO_DURATION_SECONDS,
			voteTriggerCount: 0,
			voteRequests: new Set(),
			dealtRounds: new Set(),
			introCompletedBy: new Set(),
			introSkippedBy: new Set(),
		}

		this.games.set(gameId, gameState)

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
			players: Array.from(game.players.values()).map(
				player => `${player.name}(${player.isAlive})`,
			),
			round: game.round,
			startedAt: game.startedAt,
		}))
	}

	private broadcastGameState(gameId: string) {
		const game = this.games.get(gameId)
		if (!game) return

		this.server.to(gameId).emit('GAME_STATE', {
			gameState: this.serializeGameState(game),
		})
	}

	private broadcastToGame(gameId: string, event: string, data: any) {
		this.server.to(gameId).emit(event, data)
	}

	private broadcastSystemMessage(game: GameState, text: string) {
		this.server.to(game.id).emit('CHAT_MESSAGE', {
			message: {
				id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
				playerId: 'system',
				playerName: 'Система',
				text,
				type: 'system',
				timestamp: new Date().toISOString(),
			},
		})
	}

	private sendSystemMessageToSocket(socket: Socket, text: string) {
		socket.emit('CHAT_MESSAGE', {
			message: {
				id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
				playerId: 'system',
				playerName: 'Система',
				text,
				type: 'system',
				timestamp: new Date().toISOString(),
			},
		})
	}
}
