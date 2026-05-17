import { GameGateway } from '../src/game/game.gateway'

type TestSocket = {
	data: Record<string, unknown>
	emit: jest.Mock
	join: jest.Mock
	leave: jest.Mock
}

const gameId = 'game-test-suite'

function makeSocket(userId: string, username = `Игрок ${userId}`): TestSocket {
	return {
		data: {
			userId,
			username,
			gameId,
		},
		emit: jest.fn(),
		join: jest.fn(),
		leave: jest.fn(),
	}
}

function makeProfession(id: string, name = id): any {
	return {
		id,
		name,
		description: '',
		pros: [],
		cons: [],
		priority: [],
	}
}

function makePlayer(id: string, professionId = 'prof_engineer'): any {
	return {
		id,
		name: `Игрок ${id}`,
		missions: 0,
		hours: 0,
		score: 0,
		order: Number(id.replace(/\D/g, '')) || 1,
		isActive: true,
		isAlive: true,
		profession: makeProfession(professionId),
		revealedCards: [],
		vote: undefined,
		votesAgainst: 0,
		hasUsedAbility: false,
		isInfected: false,
		isSuspicious: false,
	}
}

function makeGame(phase: string, playersCount = 4): any {
	const players = new Map<string, any>()

	for (let i = 1; i <= playersCount; i++) {
		const professionId = i === 2 ? 'prof_pilot' : 'prof_engineer'
		players.set(`p${i}`, makePlayer(`p${i}`, professionId))
	}

	return {
		id: gameId,
		lobbyId: 'lobby-test-suite',
		status: 'active',
		phase,
		players,
		connections: new Map(),
		creatorId: 'p1',
		round: 1,
		maxRounds: 5,
		startedAt: new Date().toISOString(),
		settings: {
			gameMode: 'standard',
			maxPlayers: playersCount,
			maxRounds: 5,
			discussionTime: 60,
			votingTime: 60,
			hiddenRolesCount: 1,
			enableCrises: true,
			difficulty: 'normal',
		},
		deck: {
			professions: [],
			healthStatuses: [],
			psychologicalTraits: [],
			secrets: [],
			resources: [],
			hiddenRoles: [],
			roleCards: [],
		},
		currentCrisis: undefined,
		votingResults: new Map<string, number>(),
		ejectedPlayers: [],
		capsuleSlots: Math.floor(playersCount / 2),
		occupiedSlots: 0,
		crisisHistory: [],
		phaseDuration: 60,
		voteTriggerCount: 0,
		voteRequests: new Set<string>(),
	}
}

describe('Игровая серверная логика', () => {
	let gateway: any

	beforeEach(() => {
		jest.useFakeTimers()

		gateway = new GameGateway(
			{ verifyAsync: jest.fn() } as any,
			{ get: jest.fn() } as any,
		) as any

		gateway.server = {
			to: jest.fn().mockReturnValue({
				emit: jest.fn(),
			}),
		}

		gateway.broadcastGameState = jest.fn()

		gateway.broadcastToGame = jest.fn()

		gateway.startPhaseTimer = jest.fn()

		gateway.startVotingPhase = jest.fn((game: any) => {
			game.phase = 'voting'
			game.phaseDuration = game.settings.votingTime
			game.votingResults = new Map<string, number>()

			Array.from(game.players.values()).forEach((player: any) => {
				player.vote = undefined
				player.votesAgainst = 0
			})

			gateway.broadcastGameState(game.id)
		})

		gateway.startRevealPhase = jest.fn((game: any, ejectedPlayer: any) => {
			game.phase = 'reveal'
			game.phaseDuration = 30

			gateway.broadcastToGame(game.id, 'PLAYER_REVEAL', {
				playerId: ejectedPlayer.id,
				playerName: ejectedPlayer.name,
			})

			gateway.broadcastGameState(game.id)
		})

		gateway.startNewRound = jest.fn((game: any) => {
			game.phase = 'intermission'
			game.phaseDuration = 10
			game.round += 1
			game.currentCrisis = undefined
			game.voteTriggerCount = 0
			game.voteRequests = new Set<string>()

			Array.from(game.players.values()).forEach((player: any) => {
				player.hasUsedAbility = false
			})

			gateway.broadcastGameState(game.id)
		})
	})

	afterEach(() => {
		jest.clearAllTimers()
		jest.useRealTimers()
		jest.clearAllMocks()
	})

	it('не учитывает повторный запрос голосования от одного игрока и запускает голосование только при достижении кворума', () => {
		const game = makeGame('discussion', 4)
		gateway.games.set(game.id, game)

		const firstPlayerSocket = makeSocket('p1')

		gateway.handleRequestVote(firstPlayerSocket as any)
		gateway.handleRequestVote(firstPlayerSocket as any)

		expect(game.voteTriggerCount).toBe(1)
		expect(game.voteRequests.size).toBe(1)
		expect(game.phase).toBe('discussion')

		gateway.handleRequestVote(makeSocket('p2') as any)

		expect(game.voteTriggerCount).toBe(2)
		expect(game.phase).toBe('voting')

		expect(gateway.broadcastToGame).toHaveBeenCalledWith(
			game.id,
			'VOTE_REQUESTED',
			expect.objectContaining({
				playerId: 'p2',
				voteCount: 2,
				requiredCount: 2,
			}),
		)

		expect(gateway.startVotingPhase).toHaveBeenCalledWith(game)
	})

	it('подсчитывает голоса и исключает игрока, набравшего большинство голосов', () => {
		const game = makeGame('voting', 3)
		gateway.games.set(game.id, game)

		gateway.handleVotePlayer(makeSocket('p1') as any, {
			targetPlayerId: 'p2',
		})

		gateway.handleVotePlayer(makeSocket('p2') as any, {
			targetPlayerId: 'p3',
		})

		gateway.handleVotePlayer(makeSocket('p3') as any, {
			targetPlayerId: 'p2',
		})

		expect(game.players.get('p2')?.isAlive).toBe(false)
		expect(game.ejectedPlayers).toContain('p2')
		expect(game.phase).toBe('reveal')

		expect(game.players.get('p1')?.score).toBe(10)
		expect(game.players.get('p3')?.score).toBe(10)

		expect(gateway.broadcastToGame).toHaveBeenCalledWith(
			game.id,
			'PLAYER_EJECTED',
			expect.objectContaining({
				playerId: 'p2',
				playerName: 'Игрок p2',
				votes: 2,
			}),
		)

		expect(gateway.startRevealPhase).toHaveBeenCalledWith(
			game,
			game.players.get('p2'),
		)
	})

	it('отклоняет попытку голосования вне фазы voting', () => {
		const game = makeGame('discussion', 3)
		gateway.games.set(game.id, game)

		const socket = makeSocket('p1')

		gateway.handleVotePlayer(socket as any, {
			targetPlayerId: 'p2',
		})

		expect(socket.emit).toHaveBeenCalledWith('ERROR', {
			message: 'Сейчас не фаза голосования',
		})

		expect(game.players.get('p1')?.vote).toBeUndefined()
		expect(game.players.get('p2')?.votesAgainst).toBe(0)
	})

	it('решает активный кризис игроком с подходящей профессией и начисляет очки', () => {
		const game = makeGame('crisis', 3)

		game.currentCrisis = {
			id: 'crisis-reactor',
			type: 'technological',
			name: 'Перегрев реактора',
			description: 'Необходимо восстановить систему охлаждения реактора.',
			priorityProfessions: ['prof_engineer'],
			penalty: 'Потеря ресурсов станции',
			isActive: true,
		}

		gateway.games.set(game.id, game)

		gateway.handleSolveCrisis(makeSocket('p1') as any)

		expect(game.currentCrisis.isActive).toBe(false)
		expect(game.currentCrisis.solvedBy).toBe('p1')
		expect(game.players.get('p1')?.score).toBe(20)

		expect(gateway.broadcastToGame).toHaveBeenCalledWith(
			game.id,
			'CRISIS_SOLVED',
			expect.objectContaining({
				playerId: 'p1',
				playerName: 'Игрок p1',
				crisis: 'Перегрев реактора',
			}),
		)

		jest.advanceTimersByTime(5000)

		expect(gateway.startNewRound).toHaveBeenCalledWith(game)
	})

	it('не решает кризис, если профессия игрока не входит в список приоритетных', () => {
		const game = makeGame('crisis', 3)

		game.currentCrisis = {
			id: 'crisis-reactor',
			type: 'technological',
			name: 'Перегрев реактора',
			description: 'Необходимо восстановить систему охлаждения реактора.',
			priorityProfessions: ['prof_engineer'],
			penalty: 'Потеря ресурсов станции',
			isActive: true,
		}

		gateway.games.set(game.id, game)

		const pilotSocket = makeSocket('p2')

		gateway.handleSolveCrisis(pilotSocket as any)

		expect(pilotSocket.emit).toHaveBeenCalledWith('ERROR', {
			message: 'Ваша профессия не подходит для решения этого кризиса',
		})

		expect(game.currentCrisis.isActive).toBe(true)
		expect(game.currentCrisis.solvedBy).toBeUndefined()
		expect(game.players.get('p2')?.score).toBe(0)
	})
})
