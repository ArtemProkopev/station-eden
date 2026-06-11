// apps/web/src/app/game/[gameId]/components/hooks/useGameSession.ts
import { useProfile } from '@/app/profile/hooks/useProfile'
import { useWebSocket } from '@/hooks/useWebSocket'
import {
	AbilityInfo,
	AbilityType,
	CardDetails,
	CardType,
	CrisisInfo,
	ExtendedGamePlayer,
	ExtendedGameState,
	GameChatMessage,
	PlayerCardInfo,
	WsMessage,
} from '@station-eden/shared'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	formatCount,
	getCardTypeDisplayName,
	getServerCardType,
} from '../utils/game.utils'
import { useCardReveal } from './useCardReveal'
import { useGameChat } from './useGameChat'
import { useGameTimer } from './useGameTimer'

const safeNumber = (value: unknown, defaultValue = 1): number => {
	if (typeof value === 'number') return value

	if (typeof value === 'string') {
		const parsed = parseInt(value, 10)
		return Number.isNaN(parsed) ? defaultValue : parsed
	}

	return defaultValue
}

type GameResults = {
	winners: string[]
	reason?: string
	scores?: unknown
	finalScores?: Array<{
		id: string
		name: string
		score: number
		survived: boolean
		role: string
	}>
}

type ServerCardPayload = Record<string, CardDetails | undefined>

type RevealedCardPayload = Partial<CardDetails> & { cardId?: string }

type NormalizedRevealedCard = CardDetails & { type: string }

const optionalStringArray = (value: unknown): string[] | undefined => {
	return Array.isArray(value) ? value.map(String) : undefined
}

const normalizeRevealedCard = (
	cardType: string,
	card: RevealedCardPayload,
	fallbackName = cardType,
): NormalizedRevealedCard => {
	return {
		id: String(card.id ?? card.cardId ?? cardType),
		name: String(card.name ?? fallbackName),
		description: String(card.description ?? ''),
		type: String(card.type || cardType),
		pros: optionalStringArray(card.pros),
		cons: optionalStringArray(card.cons),
		effects: optionalStringArray(card.effects),
		abilities: optionalStringArray(card.abilities),
		bonuses: optionalStringArray(card.bonuses),
		goal: typeof card.goal === 'string' ? card.goal : undefined,
		range: typeof card.range === 'string' ? card.range : undefined,
		effect: typeof card.effect === 'string' ? card.effect : undefined,
		specialAbility:
			typeof card.specialAbility === 'string' ? card.specialAbility : undefined,
		winCondition:
			typeof card.winCondition === 'string' ? card.winCondition : undefined,
	}
}

type IntroSkipProgress = {
	skippedCount: number
	playersCount: number
}

export function useGameSession(gameId: string) {
	const { profile, loadUserData } = useProfile()

	const {
		phaseTimeLeft,
		startTimer,
		stopTimer,
		syncTimerWithServer,
		setPhaseTimeLeft,
	} = useGameTimer()

	const {
		chatMessages,
		newMessage,
		chatContainerRef,
		addToChat,
		setChatMessages,
		handleMessageChange,
		setNewMessage,
	} = useGameChat()

	const {
		revealingCards,
		revealedCards,
		currentRevealIndex,
		isRevealing,
		revealedPlayer,
		setRevealedPlayer,
		startReveal,
		resetReveal,
	} = useCardReveal(addToChat)

	const [gameState, setGameState] = useState<ExtendedGameState | null>(null)
	const [myCards, setMyCards] = useState<Record<string, CardDetails>>({})
	const [selectedVote, setSelectedVote] = useState<string>('')
	const [narration, setNarration] = useState<{
		title: string
		text: string
	} | null>(null)
	const [activeCrisis, setActiveCrisis] = useState<CrisisInfo | null>(null)
	const [showMyCards, setShowMyCards] = useState(false)
	const [showCardsTable, setShowCardsTable] = useState(false)
	const [gameResults, setGameResults] = useState<GameResults | null>(null)

	const [allPlayersCards, setAllPlayersCards] = useState<PlayerCardInfo[]>([])
	const [myRevealedCardsThisRound, setMyRevealedCardsThisRound] = useState<
		string[]
	>([])
	const [myAllRevealedCards, setMyAllRevealedCards] = useState<
		Record<string, { name: string; type: string }>
	>({})
	const [cardsReceivedThisRound, setCardsReceivedThisRound] =
		useState<number>(0)
	const [canSkipNarration, setCanSkipNarration] = useState<boolean>(false)
	const [introEndCounter, setIntroEndCounter] = useState(0)
	const [introSkipProgress, setIntroSkipProgress] = useState<IntroSkipProgress>(
		{
			skippedCount: 0,
			playersCount: 0,
		},
	)
	const [newCardsThisRound, setNewCardsThisRound] = useState<CardDetails[]>([])
	const [playerAbilities, setPlayerAbilities] = useState<AbilityInfo[]>([])
	const [usedAbilities, setUsedAbilities] = useState<Set<string>>(new Set())

	const currentRoundRef = useRef<number>(0)
	const sendRef = useRef<((msg: unknown) => void) | null>(null)
	const isConnectedRef = useRef<boolean>(false)
	const loadedProfileRef = useRef(false)
	const joinedRef = useRef(false)

	useEffect(() => {
		if (loadedProfileRef.current) return

		loadedProfileRef.current = true
		loadUserData().catch(() => {})
	}, [loadUserData])

	const userId = profile.status === 'ok' ? profile.data?.id : undefined
	const username =
		profile.status === 'ok' ? profile.data?.username || 'Игрок' : 'Игрок'

	const wsBase = process.env.NEXT_PUBLIC_WS_BASE || 'https://api.stationeden.ru'
	const wsUrl = wsBase.replace(/\/$/, '')

	const isProfileReady = profile.status === 'ok' || profile.status === 'unauth'
	const canConnect = isProfileReady && profile.status === 'ok'
	const socketQuery = useMemo(() => ({ gameId }), [gameId])

	const getTypeName = useCallback((cardType: string) => {
		return getCardTypeDisplayName(cardType)
	}, [])

	const getCardDisplayName = useCallback(
		(cardType: string, cardId: string): string => {
			const card = myCards[cardType as CardType]
			return card?.name || cardId
		},
		[myCards],
	)

	const updateCardsTable = useCallback((game: ExtendedGameState) => {
		if (!game?.players) return

		const playersInfo: PlayerCardInfo[] = (game.players || []).map(player => {
			const extPlayer = player as ExtendedGamePlayer & {
				revealedCardsInfo?: Record<string, RevealedCardPayload>
			}

			const revealedCardsMap: Record<string, CardDetails> = {}

			Object.entries(extPlayer.revealedCardsInfo || {}).forEach(
				([cardType, card]) => {
					if (!card || typeof card !== 'object') return

					revealedCardsMap[cardType] = normalizeRevealedCard(cardType, card)
				},
			)

			return {
				playerId: player.id,
				playerName: player.name,
				revealedCards: revealedCardsMap,
			}
		})

		setAllPlayersCards(playersInfo)
	}, [])

	const restoreMyRevealState = useCallback(
		(game: ExtendedGameState) => {
			if (!game?.players || !userId) return

			const currentPlayer = game.players.find(
				player => player.id === userId,
			) as
				| (ExtendedGamePlayer & {
						revealedCardsInfo?: Record<
							string,
							{ name: string; type: string; id?: string }
						>
						revealedCardsThisRound?: string[]
				  })
				| undefined

			if (!currentPlayer) return

			const restoredRevealedCards: Record<
				string,
				{ name: string; type: string }
			> = {}

			Object.entries(currentPlayer.revealedCardsInfo || {}).forEach(
				([cardType, cardInfo]) => {
					restoredRevealedCards[cardType] = {
						name: cardInfo.name,
						type: cardInfo.type || cardType,
					}
				},
			)

			setMyAllRevealedCards(restoredRevealedCards)

			if (Array.isArray(currentPlayer.revealedCardsThisRound)) {
				setMyRevealedCardsThisRound(currentPlayer.revealedCardsThisRound)
			}
		},
		[userId],
	)

	const resetForNewRound = useCallback(() => {
		setNewCardsThisRound([])
		setCardsReceivedThisRound(0)
		setMyRevealedCardsThisRound([])
		setSelectedVote('')
		// Не сбрасываем usedAbilities - они на всю игру
	}, [])

	const buildCardsFromPayload = useCallback((payload: ServerCardPayload) => {
		const cards: Record<string, CardDetails> = {}

		const addCard = (card: CardDetails | undefined, cardType: CardType) => {
			if (!card) return

			cards[cardType] = {
				...card,
				type: cardType,
			}
		}

		addCard(payload.profession, 'profession')
		addCard(payload.healthStatus, 'health')
		addCard(payload.psychologicalTrait, 'trait')
		addCard(payload.secret, 'secret')
		addCard(payload.resource, 'resource')
		addCard(payload.hiddenRole, 'role')
		addCard(payload.gender, 'gender')
		addCard(payload.age, 'age')
		addCard(payload.bodyType, 'body')

		return cards
	}, [])

	const clearNarration = useCallback(() => {
		setNarration(null)
		setCanSkipNarration(false)
	}, [])

	const updatePlayerAbilities = useCallback(() => {
		if (!myCards || !userId || !gameState) return

		const abilities: AbilityInfo[] = []
		const currentPhase = gameState.phase
		const isDiscussionPhase = currentPhase === 'discussion'
		const isVotingPhase = currentPhase === 'voting'

		// Проверяем скрытую роль
		const hiddenRole = myCards.role
		if (hiddenRole) {
			switch (hiddenRole.id) {
				case 'role_saboteur':
					if (!usedAbilities.has('sabotage')) {
						abilities.push({
							id: 'sabotage' as AbilityType,
							name: 'Саботаж',
							description: 'Уменьшить количество мест в капсуле и подставить другого игрока',
							available: isDiscussionPhase,
							used: false,
						})
					}
					break
				case 'role_xenophag':
					if (!usedAbilities.has('infect')) {
						abilities.push({
							id: 'infect' as AbilityType,
							name: 'Заражение',
							description: 'Заразить выбранного игрока',
							available: isDiscussionPhase,
							used: false,
							targetType: 'other',
						})
					}
					break
				case 'role_false_witness':
					if (!usedAbilities.has('frame')) {
						abilities.push({
							id: 'frame' as AbilityType,
							name: 'Подставить',
							description: 'Сделать выбранного игрока подозрительным',
							available: isDiscussionPhase,
							used: false,
							targetType: 'other',
						})
					}
					break
				case 'role_mad_scientist':
					if (!usedAbilities.has('mad_scientist_crisis')) {
						abilities.push({
							id: 'mad_scientist_crisis' as AbilityType,
							name: 'Эксперимент',
							description: 'Создать кризис для исследования',
							available: isDiscussionPhase,
							used: false,
						})
					}
					break
			}
		}

		const secret = myCards.secret
		if (secret && secret.id === 'secret_alien_spy') {
			if (!usedAbilities.has('alien_spy_disguise')) {
				abilities.push({
					id: 'alien_spy_disguise' as AbilityType,
					name: 'Смена внешности',
					description: 'Притвориться другой профессией',
					available: isDiscussionPhase,
					used: false,
					targetType: 'profession',
				})
			}
			if (!usedAbilities.has('alien_spy_request_help')) {
				abilities.push({
					id: 'alien_spy_request_help' as AbilityType,
					name: 'Просьба о помощи',
					description: 'Попросить другого игрока помочь скрыться',
					available: isDiscussionPhase,
					used: false,
					targetType: 'other',
				})
			}
		}

		const profession = myCards.profession
		if (profession) {
			switch (profession.id) {
				case 'prof_genetic_engineer':
					if (!usedAbilities.has('genetic_modification')) {
						abilities.push({
							id: 'genetic_modification' as AbilityType,
							name: 'Генная модификация',
							description: 'Изменить свои гены (риск мутации)',
							available: isDiscussionPhase,
							used: false,
							targetType: 'self',
						})
					}
					break
				case 'prof_blogger':
					if (!usedAbilities.has('blogger_stream')) {
						abilities.push({
							id: 'blogger_stream' as AbilityType,
							name: 'Запись стрима',
							description: 'Получить подсказку от зрителей',
							available: isDiscussionPhase,
							used: false,
							targetType: 'self',
						})
					}
					break
				case 'prof_ex_boss':
					if (!usedAbilities.has('ex_boss_connection')) {
						abilities.push({
							id: 'ex_boss_connection' as AbilityType,
							name: 'Старые связи',
							description: 'Получить информацию или помощь',
							available: isDiscussionPhase,
							used: false,
							targetType: 'self',
						})
					}
					break
				case 'prof_ecologist':
					if (!usedAbilities.has('ecologist_recycling') && myCards.resource) {
						abilities.push({
							id: 'ecologist_recycling' as AbilityType,
							name: 'Переработка',
							description: 'Переработать ресурс в кислород',
							available: isDiscussionPhase,
							used: false,
							targetType: 'self',
						})
					}
					break
				case 'prof_xenopsychologist':
					if (!usedAbilities.has('xenopsychologist_detect')) {
						abilities.push({
							id: 'xenopsychologist_detect' as AbilityType,
							name: 'Выявление',
							description: 'Попытаться выявить заражённого',
							available: isDiscussionPhase,
							used: false,
							targetType: 'self',
						})
					}
					break
				case 'prof_crypto_trader':
					if (!usedAbilities.has('crypto_trader_exchange') && myCards.resource) {
						abilities.push({
							id: 'crypto_trader_exchange' as AbilityType,
							name: 'Обмен',
							description: 'Обменяться ресурсами с другим игроком',
							available: isDiscussionPhase,
							used: false,
							targetType: 'other',
						})
					}
					break
			}
		}

		const resource = myCards.resource
		if (resource && resource.id === 'resource_nano_medkit') {
			if (!usedAbilities.has('nano_medkit_use')) {
				abilities.push({
					id: 'nano_medkit_use' as AbilityType,
					name: 'Аптечка с наноботами',
					description: 'Вылечить все негативные эффекты у цели',
					available: isDiscussionPhase,
					used: false,
					targetType: 'other',
				})
			}
		}

		const gender = myCards.gender
		if (gender && gender.id === 'gender_nonbinary') {
			if (!usedAbilities.has('nonbinary_ability')) {
				abilities.push({
					id: 'nonbinary_ability' as AbilityType,
					name: 'Смена восприятия',
					description: 'Отменить один голос против себя',
					available: isVotingPhase,
					used: false,
					targetType: 'self',
				})
			}
		}

		setPlayerAbilities(abilities)
	}, [myCards, gameState?.phase, userId, usedAbilities])

	useEffect(() => {
		updatePlayerAbilities()
	}, [updatePlayerAbilities])

	const handleWebSocketMessage = useCallback(
		(data: unknown) => {
			if (!data || typeof data !== 'object') return

			const msg = data as WsMessage & Record<string, unknown>
			const send = sendRef.current
			const isConnected = isConnectedRef.current

			switch (msg.type) {
				case 'GAME_STATE': {
					const game = (msg.gameState as ExtendedGameState) || null

					if (game?.round !== undefined) {
						game.round = safeNumber(game.round, 1)
					}

					setGameState(game)

					if (game) {
						updateCardsTable(game)
						syncTimerWithServer(game)
						restoreMyRevealState(game)

						if (game.phase === 'introduction') {
							setIntroEndCounter(0)

							const skipProgress = (game as Record<string, unknown>)
								.introSkipProgress as
								| { skippedCount?: unknown; playersCount?: unknown }
								| undefined

							setIntroSkipProgress({
								skippedCount: safeNumber(skipProgress?.skippedCount, 0),
								playersCount: safeNumber(
									skipProgress?.playersCount,
									(game.players || []).length,
								),
							})

							setTimeout(() => setCanSkipNarration(true), 3000)
						} else {
							clearNarration()
						}

						if (game.phase !== 'crisis' && activeCrisis) {
							setActiveCrisis(null)
						}
					}

					break
				}

				case 'PHASE_CHANGED': {
					const phase = String(msg.phase || '')
					const duration = safeNumber(msg.duration, 30)
					const phaseEndTime = String(msg.phaseEndTime || '')

					const incomingGameState = msg.gameState as
						| ExtendedGameState
						| undefined

					if (incomingGameState) {
						if (incomingGameState.round !== undefined) {
							incomingGameState.round = safeNumber(incomingGameState.round, 1)
						}

						setGameState(incomingGameState)
						updateCardsTable(incomingGameState)
						restoreMyRevealState(incomingGameState)
						syncTimerWithServer(incomingGameState)
					} else {
						setGameState(prev => {
							if (!prev) return prev

							const next = {
								...prev,
								phase,
								phaseDuration: duration,
								phaseEndTime,
							} as ExtendedGameState

							updateCardsTable(next)
							restoreMyRevealState(next)
							syncTimerWithServer(next)

							return next
						})
					}

					if (phase !== 'introduction') {
						clearNarration()
					} else {
						setIntroEndCounter(0)

						const sourceGame = incomingGameState
						const skipProgress = sourceGame
							? ((sourceGame as Record<string, unknown>).introSkipProgress as
									| { skippedCount?: unknown; playersCount?: unknown }
									| undefined)
							: undefined

						setIntroSkipProgress({
							skippedCount: safeNumber(skipProgress?.skippedCount, 0),
							playersCount: safeNumber(
								skipProgress?.playersCount,
								Array.isArray(sourceGame?.players)
									? sourceGame.players.length
									: 0,
							),
						})

						setTimeout(() => setCanSkipNarration(true), 3000)
					}

					setPhaseTimeLeft(duration)
					startTimer(duration)

					break
				}

				case 'NARRATION_ENDED': {
					clearNarration()
					stopTimer()
					setIntroEndCounter(current => current + 1)
					setIntroSkipProgress({
						skippedCount: 0,
						playersCount: 0,
					})
					break
				}

				case 'NARRATION_SKIP_PROGRESS': {
					setIntroSkipProgress({
						skippedCount: safeNumber(msg.skippedCount, 0),
						playersCount: safeNumber(msg.playersCount, 0),
					})
					break
				}

				case 'YOUR_CARDS': {
					const cards = buildCardsFromPayload(msg as ServerCardPayload)
					setMyCards(cards)
					break
				}

				case 'NEW_CARDS': {
					const newCardsData = msg.cards as CardDetails[]
					const roundNumber = safeNumber(msg.round, gameState?.round || 1)

					if (!Array.isArray(newCardsData) || newCardsData.length === 0) {
						break
					}

					const cardsWithTypes: CardDetails[] = newCardsData.map(card => ({
						...card,
						type: card.type || 'unknown',
					}))

					setMyCards(prev => {
						const updated = { ...prev }

						cardsWithTypes.forEach(card => {
							const cardType = (card.type || 'unknown') as CardType
							updated[cardType] = card
						})

						return updated
					})

					setNewCardsThisRound(prev => [...prev, ...cardsWithTypes])
					setCardsReceivedThisRound(prev => prev + cardsWithTypes.length)

					const cardsText = formatCount(cardsWithTypes.length, [
						'новую карту',
						'новые карты',
						'новых карт',
					])

					addToChat(
						'Система',
						`Раунд ${roundNumber}: вы получили ${cardsText}!`,
						true,
					)

					break
				}

				case 'ROUND_STARTED': {
					const roundNumber = safeNumber(
						msg.roundNumber,
						gameState?.round ? gameState.round + 1 : 1,
					)

					addToChat('Система', `Начался раунд ${roundNumber}.`, true)
					resetForNewRound()
					setGameState(prev => (prev ? { ...prev, round: roundNumber } : prev))
					break
				}

				case 'GAME_NARRATION': {
					if (
						gameState &&
						gameState.phase &&
						gameState.phase !== 'introduction'
					) {
						clearNarration()
						break
					}

					const title = String(msg.title ?? '')
					const text = String(msg.text ?? '')
					const duration = typeof msg.duration === 'number' ? msg.duration : 30

					setNarration({ title, text })
					setPhaseTimeLeft(duration)
					startTimer(duration)
					setTimeout(() => setCanSkipNarration(true), 3000)

					break
				}

				case 'CRISIS_TRIGGERED': {
					const crisis = (msg.crisis as CrisisInfo) || null

					setActiveCrisis(crisis)

					if (crisis?.isActive) {
						setPhaseTimeLeft(60)
						startTimer(60)
					}

					break
				}

				case 'CRISIS_SOLVED': {
					addToChat(
						'Система',
						`Кризис "${String(msg.crisis ?? '')}" решён игроком ${String(
							msg.playerName ?? '',
						)}!`,
						true,
					)
					setActiveCrisis(null)
					stopTimer()
					break
				}

				case 'CRISIS_PENALTY': {
					addToChat('Система', String(msg.message ?? ''), true)
					setActiveCrisis(null)
					stopTimer()
					break
				}

				case 'PLAYER_EJECTED': {
					const votesCount = safeNumber(msg.votes, 0)
					const votesText = formatCount(votesCount, [
						'голосом',
						'голосами',
						'голосами',
					])

					addToChat(
						'Система',
						`Игрок ${String(msg.playerName ?? '')} выбыл с ${votesText}!`,
						true,
					)

					const cards = msg.cards as
						| Record<string, RevealedCardPayload | null>
						| undefined

					if (cards) {
						setRevealedPlayer({
							name: String(msg.playerName ?? ''),
							cards,
							playerId: msg.playerId ? String(msg.playerId) : undefined,
						})
					}

					const ejectedCards = cards
					const ejectedPlayerId = msg.playerId
						? String(msg.playerId)
						: undefined

					if (ejectedCards && ejectedPlayerId) {
						setAllPlayersCards(prev => {
							const existingPlayer = prev.find(
								p => p.playerId === ejectedPlayerId,
							)

							const newRevealedCards = Object.entries(ejectedCards).reduce(
								(acc, [cardType, card]) => {
									if (card && card.name) {
										acc[cardType] = normalizeRevealedCard(cardType, card)
									}

									return acc
								},
								{} as Record<string, CardDetails>,
							)

							if (existingPlayer) {
								return prev.map(p =>
									p.playerId === ejectedPlayerId
										? {
												...p,
												revealedCards: {
													...p.revealedCards,
													...newRevealedCards,
												},
											}
										: p,
								)
							}

							const newPlayer: PlayerCardInfo = {
								playerId: ejectedPlayerId,
								playerName: String(msg.playerName ?? ''),
								revealedCards: newRevealedCards,
							}

							return [...prev, newPlayer]
						})
					}

					break
				}

				case 'PLAYER_REVEAL': {
					const playerCards =
						(msg.cards as Record<string, Partial<CardDetails> | null>) || {}

					const cardTypes = Object.keys(playerCards)

					startReveal(
						{
							name: String(msg.playerName ?? ''),
							cards: playerCards,
							playerId: msg.playerId ? String(msg.playerId) : undefined,
						},
						cardTypes,
					)

					break
				}

				case 'CARD_REVEALED': {
					const cardType = String(msg.cardType ?? '')
					const cardId = String(msg.cardId ?? '')
					const playerName = String(msg.playerName ?? '')
					const playerIdMsg = String(msg.playerId ?? '')
					const cardDetails = msg.cardDetails as RevealedCardPayload | undefined

					const cardName =
						cardDetails?.name || getCardDisplayName(cardType, cardId)

					const fullCard: NormalizedRevealedCard = cardDetails
						? normalizeRevealedCard(
								cardType,
								{ ...cardDetails, id: cardDetails.id ?? cardId },
								cardName,
							)
						: {
								id: cardId || cardType,
								name: cardName,
								description: '',
								type: cardType,
							}

					addToChat(
						'Система',
						`${playerName} раскрыл(а) карту: ${cardName}`,
						true,
					)

					setGameState(prev => {
						if (!prev) return prev

						const players = ((prev.players || []) as ExtendedGamePlayer[]).map(
							player => {
								if (player.id !== playerIdMsg) return player

								const updatedPlayer = { ...player } as Omit<
									ExtendedGamePlayer,
									'revealedCardsInfo'
								> & {
									revealedCardsInfo?: Record<string, NormalizedRevealedCard>
								}

								updatedPlayer.revealedCardsInfo = {
									...(updatedPlayer.revealedCardsInfo || {}),
									[cardType]: fullCard,
								}

								updatedPlayer.revealedCards =
									(updatedPlayer.revealedCards || 0) + 1

								return updatedPlayer
							},
						)

						const updatedGame = {
							...prev,
							players,
						}

						updateCardsTable(updatedGame)

						return updatedGame
					})

					if (playerIdMsg && userId && playerIdMsg === userId) {
						setMyRevealedCardsThisRound(prev => [...prev, cardType])
						setMyAllRevealedCards(prev => ({
							...prev,
							[cardType]: {
								name: cardName,
								type: getTypeName(cardType),
							},
						}))

						if (isConnected && send) {
							send({
								type: 'CARD_REVEALED_CONFIRMATION',
								cardType,
								cardId,
							})
						}
					}

					break
				}

				case 'PLAYER_VOTED': {
					addToChat(
						'Система',
						`${String(msg.voterName ?? '')} проголосовал(а) против ${String(
							msg.targetName ?? '',
						)}`,
						true,
					)
					break
				}

				case 'VOTE_REQUESTED': {
					addToChat(
						'Система',
						`${String(msg.playerName ?? '')} запросил(а) голосование (${String(
							msg.voteCount ?? '',
						)}/${String(msg.requiredCount ?? '')})`,
						true,
					)
					break
				}

				case 'VOTE_TIED':
				case 'CAPTAIN_VETO_USED':
				case 'SABOTAGE_OCCURRED':
				case 'NONBINARY_ABILITY_USED':
				case 'FALSE_EVIDENCE_PLANTED': {
					addToChat('Система', String(msg.message ?? ''), true)
					break
				}

				case 'PLAYER_INFECTED': {
					addToChat(
						'Система',
						`Игрок ${String(msg.playerName ?? '')} заражён игроком ${String(
							msg.infectedByName ?? '',
						)}!`,
						true,
					)
					break
				}

				case 'GAME_FINISHED': {
					const winnerIds = (msg.winnerIds as string[]) || []

					setGameResults({
						winners: Array.isArray(winnerIds) ? winnerIds.map(String) : [],
						reason: msg.reason ? String(msg.reason) : undefined,
						scores: msg.finalScores,
						finalScores: msg.finalScores as GameResults['finalScores'],
					})

					setGameState(prev => (prev ? { ...prev, phase: 'game_over' } : null))
					clearNarration()
					stopTimer()
					break
				}

				case 'CHAT_MESSAGE': {
					const raw = msg.message

					if (raw && typeof raw === 'object') {
						const m = raw as Record<string, unknown>

						const chatMsg: GameChatMessage = {
							id: String(m.id ?? `${Date.now()}-${Math.random()}`),
							playerId: String(m.playerId ?? 'player'),
							playerName: String(m.playerName ?? 'Игрок'),
							text: String(m.text ?? '').slice(0, 300),
							type: m.type === 'system' ? 'system' : 'player',
							timestamp: new Date(
								typeof m.timestamp === 'string' ||
									typeof m.timestamp === 'number'
									? m.timestamp
									: Date.now(),
							),
						}

						setChatMessages(prev => {
							if (prev.some(message => message.id === chatMsg.id)) {
								return prev
							}

							return [...prev.slice(-50), chatMsg]
						})
					}

					break
				}

				case 'ERROR': {
					addToChat('Система', `Ошибка: ${String(msg.message ?? '')}`, true)
					break
				}

				case 'TIMER_UPDATE': {
					if (typeof msg.timeLeft === 'number') {
						setPhaseTimeLeft(msg.timeLeft)

						if (msg.timeLeft > 0) {
							startTimer(msg.timeLeft)
						} else {
							stopTimer()
						}
					}

					break
				}

				case 'SPEAKER_CHANGED': {
					setGameState(prev => {
						if (!prev) return prev
						return {
							...prev,
							currentSpeakerId: msg.speakerId
								? String(msg.speakerId)
								: undefined,
						}
					})

					const speakerName = msg.speakerName
						? String(msg.speakerName)
						: 'никто'
					addToChat('Система', `Сейчас говорит: ${speakerName}.`, true)
					break
				}

				case 'REVEAL_QUEUE_CHANGED': {
					setGameState(prev => {
						if (!prev) return prev
						return {
							...prev,
							currentRevealPlayerId: msg.currentPlayerId
								? String(msg.currentPlayerId)
								: undefined,
							revealQueue: Array.isArray(msg.queue)
								? (msg.queue as string[])
								: [],
						}
					})

					const currentPlayerName = msg.currentPlayerName
						? String(msg.currentPlayerName)
						: 'никто'
					addToChat(
						'Система',
						`Сейчас раскрывает карту: ${currentPlayerName}.`,
						true,
					)
					break
				}

				default:
					break
			}
		},
		[
			activeCrisis,
			addToChat,
			buildCardsFromPayload,
			clearNarration,
			gameState,
			getCardDisplayName,
			getTypeName,
			resetForNewRound,
			restoreMyRevealState,
			setChatMessages,
			setPhaseTimeLeft,
			setRevealedPlayer,
			startReveal,
			startTimer,
			stopTimer,
			syncTimerWithServer,
			updateCardsTable,
			userId,
		],
	)

	const { sendMessage, isConnected } = useWebSocket(
		wsUrl,
		handleWebSocketMessage,
		socketQuery,
		{
			path: '/game',
			enabled: canConnect,
		},
	)

	useEffect(() => {
		sendRef.current = sendMessage as unknown as (msg: unknown) => void
		isConnectedRef.current = Boolean(isConnected)
	}, [sendMessage, isConnected])

	useEffect(() => {
		if (gameState?.round && currentRoundRef.current !== gameState.round) {
			const prevRound = currentRoundRef.current
			const newRound = gameState.round

			if (prevRound !== 0 && newRound > prevRound) {
				resetForNewRound()
			}

			currentRoundRef.current = newRound
		}
	}, [gameState?.round, resetForNewRound])

	useEffect(() => {
		if (gameState?.phase === 'preparation' && isConnected && sendRef.current) {
			sendRef.current({ type: 'REQUEST_ROUND_CARDS' })
		}
	}, [gameState?.phase, gameState?.round, isConnected])

	useEffect(() => {
		if (!isConnected) {
			joinedRef.current = false
			return
		}

		if (!gameId) return
		if (joinedRef.current) return
		if (profile.status !== 'ok' || !userId) return

		joinedRef.current = true
		sendRef.current?.({ type: 'JOIN_GAME', gameId })
	}, [isConnected, gameId, profile.status, userId])

	useEffect(() => {
		const syncTimer = () => {
			if (!gameState?.phase || !gameState.phaseEndTime) return

			const now = Date.now()
			const endTime = new Date(String(gameState.phaseEndTime)).getTime()
			const secondsLeft = Math.max(0, Math.floor((endTime - now) / 1000))

			if (Math.abs(phaseTimeLeft - secondsLeft) > 1) {
				setPhaseTimeLeft(secondsLeft)
			}
		}

		const interval = setInterval(syncTimer, 5000)

		return () => clearInterval(interval)
	}, [gameState, phaseTimeLeft, setPhaseTimeLeft])

	const handleSendMessage = useCallback(
		(e?: React.FormEvent) => {
			e?.preventDefault()

			if (profile.status !== 'ok' || !userId) return
			if (!newMessage.trim() || !isConnected) return

			sendRef.current?.({
				type: 'SEND_MESSAGE',
				message: {
					text: newMessage.trim(),
					playerName: username,
					gameId,
				},
			})

			setNewMessage('')
		},
		[
			gameId,
			isConnected,
			newMessage,
			profile.status,
			setNewMessage,
			userId,
			username,
		],
	)

	const handleKeyPress = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault()
				handleSendMessage()
			}
		},
		[handleSendMessage],
	)

	const handleStartGame = () => {
		if (!isConnected) return
		if (profile.status !== 'ok' || !userId) return

		sendRef.current?.({ type: 'START_GAME_SESSION' })
	}

	const handleCompleteNarration = () => {
		if (!isConnected) return

		sendRef.current?.({ type: 'COMPLETE_NARRATION' })
		clearNarration()
		stopTimer()
	}

	const handleSkipNarration = () => {
		if (!isConnected) return

		sendRef.current?.({ type: 'SKIP_NARRATION' })
	}

	const handleStartDiscussion = () => {
		if (!isConnected) return

		sendRef.current?.({ type: 'START_DISCUSSION' })
	}

	const handleRequestVote = () => {
		if (!isConnected) return

		sendRef.current?.({ type: 'REQUEST_VOTE' })
	}

	const handleRevealCard = (cardType: CardType) => {
		const card = myCards[cardType]

		if (!card || !isConnected) return

		if (myRevealedCardsThisRound.includes(cardType)) {
			addToChat('Система', 'Вы уже раскрыли карту в этом раунде!', true)
			return
		}

		if (myAllRevealedCards[cardType]) {
			addToChat('Система', 'Вы уже раскрывали эту карту ранее!', true)
			return
		}

		if (myRevealedCardsThisRound.length >= 1) {
			addToChat(
				'Система',
				'В этом раунде можно раскрыть только одну карту!',
				true,
			)
			return
		}

		sendRef.current?.({
			type: 'REVEAL_CARD',
			cardType: getServerCardType(cardType),
			cardId: card.id,
		})
	}

	const handleVote = (targetPlayerId: string) => {
		if (!isConnected) return

		setSelectedVote(targetPlayerId)
		sendRef.current?.({ type: 'VOTE_PLAYER', targetPlayerId })
	}

	const handleUseAbility = useCallback((ability: string, targetPlayerId?: string, extraData?: string) => {
		if (!isConnected) return

		setUsedAbilities(prev => new Set(prev).add(ability))

		sendRef.current?.({
			type: 'USE_ABILITY',
			ability,
			targetPlayerId,
			professionId: extraData,
			resourceId: extraData,
		})
	}, [isConnected])

	const handleSolveCrisis = () => {
		if (!isConnected) return

		sendRef.current?.({ type: 'SOLVE_CRISIS' })
	}

	const handleCloseCrisis = () => setActiveCrisis(null)

	const getLobbyReturnUrl = useCallback(() => {
		const lobbyId = String(
			(gameState as { lobbyId?: unknown } | null)?.lobbyId ?? '',
		).trim()

		if (/^[a-zA-Z0-9_-]{3,32}$/.test(lobbyId)) {
			return `/lobby/${encodeURIComponent(lobbyId)}`
		}

		return '/lobby'
	}, [gameState])

	const handleLeaveGame = () => {
		const returnUrl = getLobbyReturnUrl()

		sendRef.current?.({ type: 'LEAVE_GAME', gameId })

		setTimeout(() => {
			window.location.href = returnUrl
		}, 1000)
	}

	return {
		gameState,
		myCards,
		selectedVote,
		phaseTimeLeft,
		narration,
		activeCrisis,
		showMyCards,
		showCardsTable,
		gameResults,
		allPlayersCards,
		myRevealedCardsThisRound,
		myAllRevealedCards,
		cardsReceivedThisRound,
		canSkipNarration,
		introEndCounter,
		introSkipProgress,
		newCardsThisRound,
		revealingCards,
		revealedCards,
		currentRevealIndex,
		isRevealing,
		revealedPlayer,
		chatMessages,
		newMessage,
		chatContainerRef,
		userId,
		username,
		profile,
		isConnected,
		playerAbilities,
		setShowMyCards,
		setShowCardsTable,
		setActiveCrisis,
		setGameResults,
		setRevealedPlayer,
		resetReveal,
		setSelectedVote,
		handleSendMessage,
		handleKeyPress,
		handleMessageChange,
		handleStartGame,
		handleCompleteNarration,
		handleSkipNarration,
		handleStartDiscussion,
		handleRequestVote,
		handleRevealCard,
		handleVote,
		handleUseAbility,
		handleSolveCrisis,
		handleCloseCrisis,
		handleLeaveGame,
		addToChat,
	}
}