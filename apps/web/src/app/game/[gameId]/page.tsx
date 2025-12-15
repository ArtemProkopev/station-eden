// apps/web/src/app/game/[gameId]/page.tsx
'use client'

import { useProfile } from '@/app/profile/hooks/useProfile'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './page.module.css'

type CardType =
	| 'profession'
	| 'health'
	| 'trait'
	| 'secret'
	| 'role'
	| 'resource'
	| 'gender'
	| 'age'
	| 'body'

type CardDetails = {
	id: string
	name: string
	description: string
	pros?: string[]
	cons?: string[]
	effects?: string[]
	goal?: string
	abilities?: string[]
	bonuses?: string[]
	range?: string
	specialAbility?: string
	winCondition?: string
}

type CrisisInfo = {
	id: string
	name: string
	description: string
	type: string
	penalty: string
	isActive: boolean
	priorityProfessions?: string[]
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

type PageProps = {
	params: { gameId: string }
	searchParams?: { [key: string]: string | string[] | undefined }
}

// Тип для сообщений чата в игре
interface GameChatMessage {
	id: string
	playerId: string
	playerName: string
	text: string
	type: 'player' | 'system'
	timestamp: Date
}

export default function GameSession({ params }: PageProps) {
	const { gameId } = params

	// ✅ Берём реального пользователя так же, как в лобби
	const { profile, loadUserData } = useProfile()

	// ✅ грузим /auth/me один раз (и не зависим от "прыгающих" ссылок)
	const loadedProfileRef = useRef(false)
	useEffect(() => {
		if (loadedProfileRef.current) return
		loadedProfileRef.current = true
		loadUserData().catch(() => {})
	}, [loadUserData])

	const userId = profile.status === 'ok' ? profile.data?.id : undefined
	const username = profile.status === 'ok' ? profile.data?.username : undefined

	const [gameState, setGameState] = useState<any>(null)
	const [myCards, setMyCards] = useState<Record<string, CardDetails>>({})
	const [selectedVote, setSelectedVote] = useState<string>('')
	const [phaseTimeLeft, setPhaseTimeLeft] = useState<number>(0)
	const [chatMessages, setChatMessages] = useState<GameChatMessage[]>([])
	const [newMessage, setNewMessage] = useState('')
	const [narration, setNarration] = useState<{
		title: string
		text: string
	} | null>(null)
	const [activeCrisis, setActiveCrisis] = useState<CrisisInfo | null>(null)
	const [revealedPlayer, setRevealedPlayer] = useState<{
		name: string
		cards: any
	} | null>(null)
	const [showMyCards, setShowMyCards] = useState(false)
	const [gameResults, setGameResults] = useState<any>(null)
	
	// Новые состояния для анимации раскрытия карт
	const [revealingCards, setRevealingCards] = useState<string[]>([])
	const [revealedCards, setRevealedCards] = useState<Record<string, boolean>>({})
	const [currentRevealIndex, setCurrentRevealIndex] = useState<number>(0)
	const [isRevealing, setIsRevealing] = useState<boolean>(false)
	const [phaseEndTime, setPhaseEndTime] = useState<number | null>(null)
	const [phaseDuration, setPhaseDuration] = useState<number>(0)

	const chatContainerRef = useRef<HTMLDivElement>(null)

	// Используем useMemo для форматирования времени заставки
	const displayTime = useMemo(() => {
		return formatTime(phaseTimeLeft)
	}, [phaseTimeLeft])

	const addToChat = useCallback(
		(
			playerName: string,
			text: string,
			isSystem: boolean = false,
			playerId?: string
		) => {
			const newChatMessage: GameChatMessage = {
				id: Date.now().toString(),
				playerId: playerId || (isSystem ? 'system' : 'player'),
				playerName,
				text,
				type: isSystem ? 'system' : 'player',
				timestamp: new Date(),
			}

			setChatMessages(prev => [...prev.slice(-50), newChatMessage])
		},
		[]
	)

	const getCardDisplayName = useCallback(
		(cardType: string, cardId: string): string => {
			const card = myCards[cardType as CardType]
			return card?.name || cardId
		},
		[myCards]
	)
	
	// Функция для получения названия карты по типу
	const getCardTypeDisplayName = (type: string): string => {
		switch (type) {
			case 'profession': return 'Профессия'
			case 'health': return 'Состояние здоровья'
			case 'trait': return 'Психологическая черта'
			case 'secret': return 'Секрет'
			case 'role': return 'Скрытая роль'
			case 'resource': return 'Ресурс'
			case 'gender': return 'Пол'
			case 'age': return 'Возраст'
			case 'body': return 'Телосложение'
			default: return type
		}
	}

	const handleWebSocketMessage = useCallback(
		(data: any) => {
			console.log('Game WebSocket message:', data.type, data)

			switch (data.type) {
				case 'GAME_STATE': {
					const game = data.gameState
					setGameState(game)
					
					if (game?.phaseEndTime) {
						const endTime = new Date(game.phaseEndTime).getTime()
						const now = Date.now()
						setPhaseEndTime(endTime)
						setPhaseDuration(game.phaseDuration || 180)
						setPhaseTimeLeft(Math.max(0, Math.floor((endTime - now) / 1000)))
					}

					if (game?.phase !== 'crisis' && activeCrisis) {
						setActiveCrisis(null)
					}
					break
				}

				case 'YOUR_CARDS': {
					const cards: Record<string, CardDetails> = {}

					if (data.profession) cards.profession = data.profession
					if (data.healthStatus) cards.health = data.healthStatus
					if (data.psychologicalTrait) cards.trait = data.psychologicalTrait
					if (data.secret) cards.secret = data.secret
					if (data.hiddenRole) cards.role = data.hiddenRole
					if (data.resource) cards.resource = data.resource
					if (data.roleCard) cards.role = data.roleCard
					if (data.gender) cards.gender = data.gender
					if (data.age) cards.age = data.age
					if (data.bodyType) cards.body = data.bodyType

					setMyCards(cards)
					break
				}

				case 'GAME_NARRATION': {
					setNarration({ title: data.title, text: data.text })
					setTimeout(() => setNarration(null), 30000)
					break
				}

				case 'CRISIS_TRIGGERED':
					setActiveCrisis(data.crisis)
					break

				case 'CRISIS_SOLVED':
					addToChat(
						'Система',
						`Кризис "${data.crisis}" решен игроком ${data.playerName}!`,
						true
					)
					break

				case 'CRISIS_PENALTY':
					addToChat('Система', data.message, true)
					break

				case 'PLAYER_EJECTED':
					addToChat(
						'Система',
						`Игрок ${data.playerName} выбыл с ${data.votes} голосами!`,
						true
					)
					break

				case 'PLAYER_REVEAL': {
					const playerCards = data.cards || {}
					const cardTypes = Object.keys(playerCards)
					
					// Сбрасываем состояние раскрытия
					setRevealingCards(cardTypes)
					setRevealedCards({})
					setCurrentRevealIndex(0)
					setIsRevealing(true)
					
					// Устанавливаем задержки для анимации
					setTimeout(() => {
						setRevealedPlayer({ name: data.playerName, cards: playerCards })
					}, cardTypes.length * 600 + 500)
					break
				}

				case 'CARD_REVEALED':
					addToChat(
						'Система',
						`${data.playerName} раскрыл(а) карту: ${getCardDisplayName(
							data.cardType,
							data.cardId
						)}`,
						true
					)
					break

				case 'PLAYER_VOTED':
					addToChat(
						'Система',
						`${data.voterName} проголосовал(а) против ${data.targetName}`,
						true
					)
					break

				case 'VOTE_REQUESTED':
					addToChat(
						'Система',
						`${data.playerName} запросил(а) голосование (${data.voteCount}/${data.requiredCount})`,
						true
					)
					break

				case 'VOTE_TIED':
					addToChat('Система', data.message, true)
					break

				case 'CAPTAIN_VETO_USED':
					addToChat('Система', data.message, true)
					break

				case 'SABOTAGE_OCCURRED':
					addToChat('Система', data.message, true)
					break

				case 'PLAYER_INFECTED':
					addToChat(
						'Система',
						`Игрок ${data.playerName} заражен игроком ${data.infectedByName}!`,
						true
					)
					break

				case 'NONBINARY_ABILITY_USED':
					addToChat('Система', data.message, true)
					break

				case 'GAME_FINISHED':
					setGameResults({
						winners: data.winnerIds,
						reason: data.reason,
						scores: data.finalScores,
					})
					setGameState((prev: any) =>
						prev ? { ...prev, phase: 'game_over' } : null
					)
					break

				case 'ERROR':
					console.error('Game error:', data.message)
					addToChat('Система', `Ошибка: ${data.message}`, true)
					break

				case 'CHAT_MESSAGE':
					if (data.message) {
						const chatMsg: GameChatMessage = {
							id: data.message.id || Date.now().toString(),
							playerId: data.message.playerId || 'player',
							playerName: data.message.playerName || 'Игрок',
							text: String(data.message.text ?? '').slice(0, 300),
							type: 'player',
							timestamp: new Date(data.message.timestamp || Date.now()),
						}
						setChatMessages(prev => [...prev.slice(-50), chatMsg])
					}
					break
					
				case 'REVEAL_PHASE_START':
					setGameState((prev: any) => ({ ...prev, phase: 'reveal' }))
					addToChat('Система', 'Началось раскрытие карт выбывшего игрока', true)
					break
			}
		},
		[activeCrisis, addToChat, getCardDisplayName, revealedPlayer?.name]
	)

	// ✅ socket.io-client нужен http(s) origin, path задаём отдельно
	const wsBase = process.env.NEXT_PUBLIC_WS_BASE || 'https://api.stationeden.ru'
	const wsUrl = wsBase.replace(/\/$/, '')

	// ✅ ВКЛЮЧЕНО всегда (как ты хотел), но JOIN_GAME защищаем ниже
	const isProfileReady = profile.status === 'ok' || profile.status === 'unauth'
	const canConnect = isProfileReady && profile.status === 'ok'

	/**
	 * ✅ ВАЖНО:
	 * query держим стабильным — только gameId.
	 * userId сервер берёт из JWT cookie, не нужно тащить в query (иначе лишние реконнекты).
	 */
	const socketQuery = useMemo(() => ({ gameId }), [gameId])

	const { sendMessage, isConnected } = useWebSocket(
		wsUrl,
		handleWebSocketMessage,
		socketQuery,
		{ path: '/game', enabled: canConnect }
	)

	// ✅ JOIN_GAME отправляем строго 1 раз на каждый connect
	// ✅ FIX: не шлём JOIN_GAME пока профиль не ok и userId нет (иначе auth error и forceDisconnect)
	const joinedRef = useRef(false)
	useEffect(() => {
		if (!isConnected) {
			joinedRef.current = false
			return
		}
		if (!gameId) return
		if (joinedRef.current) return

		if (profile.status !== 'ok' || !userId) {
			// ждём нормальную авторизацию / загрузку профиля
			return
		}

		joinedRef.current = true
		console.log('Connected to game, joining...')
		sendMessage({ type: 'JOIN_GAME', gameId })
	}, [isConnected, gameId, sendMessage, profile.status, userId])

	// Исправленный useEffect для таймера
	useEffect(() => {
		if (!phaseEndTime) return
		
		const updateTimer = () => {
			const now = Date.now()
			const secondsLeft = Math.max(0, Math.floor((phaseEndTime - now) / 1000))
			setPhaseTimeLeft(secondsLeft)
		}
		
		// Обновляем сразу
		updateTimer()
		
		const timer = setInterval(updateTimer, 1000)
		return () => clearInterval(timer)
	}, [phaseEndTime])

	// useEffect для последовательного раскрытия карт
	useEffect(() => {
		if (!isRevealing || revealingCards.length === 0) return
		
		const timer = setTimeout(() => {
			if (currentRevealIndex < revealingCards.length) {
				// Раскрываем текущую карту
				const currentCard = revealingCards[currentRevealIndex]
				setRevealedCards(prev => ({
					...prev,
					[currentCard]: true
				}))
				
				setCurrentRevealIndex(prev => prev + 1)
				
				// Добавляем в чат сообщение о раскрытии
				addToChat(
					'Система',
					`${revealedPlayer?.name || 'Игрок'} раскрывает карту: ${getCardTypeDisplayName(currentCard)}`,
					true
				)
			} else {
				// Все карты раскрыты
				setIsRevealing(false)
			}
		}, 600)
		
		return () => clearTimeout(timer)
	}, [isRevealing, currentRevealIndex, revealingCards, revealedPlayer?.name, addToChat])

	useEffect(() => {
		if (chatContainerRef.current) {
			chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
		}
	}, [chatMessages])

	const handleMessageChange = useCallback((message: string) => {
		setNewMessage(message.slice(0, 300))
	}, [])

	const handleSendMessage = useCallback(
		(e?: React.FormEvent) => {
			if (e) e.preventDefault()

			// ✅ пока нет реального профиля — не отправляем и не рисуем temp
			if (profile.status !== 'ok' || !userId) return
			if (!newMessage.trim() || !isConnected) return

			const playerName = username || 'Игрок'
			const myId = userId

			sendMessage({
				type: 'SEND_MESSAGE',
				message: {
					text: newMessage.trim(),
					playerName,
					gameId,
				},
			})

			const tempMessage: GameChatMessage = {
				id: `temp-${Date.now()}`,
				playerId: myId,
				playerName,
				text: newMessage.trim(),
				type: 'player',
				timestamp: new Date(),
			}

			setChatMessages(prev => [...prev.slice(-50), tempMessage])
			setNewMessage('')
		},
		[
			newMessage,
			isConnected,
			sendMessage,
			username,
			gameId,
			userId,
			profile.status,
		]
	)

	const handleKeyPress = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault()
				handleSendMessage()
			}
		},
		[handleSendMessage]
	)

	// ✅ START_GAME
	// ✅ FIX: сервер слушает START_GAME_SESSION, а не START_GAME
	const handleStartGame = () => {
		if (!isConnected) return
		if (profile.status !== 'ok' || !userId) return
		sendMessage({ type: 'START_GAME_SESSION' })
	}

	const getServerCardType = (clientType: CardType): string => {
		switch (clientType) {
			case 'profession':
				return 'profession'
			case 'health':
				return 'health'
			case 'trait':
				return 'trait'
			case 'secret':
				return 'secret'
			case 'role':
				return 'hiddenRole'
			case 'resource':
				return 'resource'
			case 'gender':
				return 'gender'
			case 'age':
				return 'age'
			case 'body':
				return 'bodyType'
			default:
				return 'profession'
		}
	}

	const handleRevealCard = (cardType: CardType) => {
		const card = myCards[cardType]
		if (!card || !isConnected) return

		sendMessage({
			type: 'REVEAL_CARD',
			cardType: getServerCardType(cardType),
			cardId: card.id,
		})
	}

	const handleVote = (targetPlayerId: string) => {
		if (!isConnected) return

		setSelectedVote(targetPlayerId)
		sendMessage({ type: 'VOTE_PLAYER', targetPlayerId })
	}

	const handleRequestVote = () => {
		if (!isConnected) return
		sendMessage({ type: 'REQUEST_VOTE' })
	}

	const handleUseAbility = (ability: string, targetPlayerId?: string) => {
		if (!isConnected) return
		sendMessage({ type: 'USE_ABILITY', ability, targetPlayerId })
	}

	const handleSolveCrisis = () => {
		if (!isConnected) return
		sendMessage({ type: 'SOLVE_CRISIS' })
	}

	const handleLeaveGame = () => {
		if (window.confirm('Вы уверены, что хотите покинуть игру?')) {
			sendMessage({ type: 'LEAVE_GAME', gameId })
			setTimeout(() => {
				window.location.href = '/lobby'
			}, 1000)
		}
	}

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs < 10 ? '0' : ''}${secs}`
	}

	const formatMessageTime = (timestamp: Date) => {
		return timestamp.toLocaleTimeString('ru-RU', {
			hour: '2-digit',
			minute: '2-digit',
		})
	}

	const getPhaseName = (phase: GamePhase): string => {
		switch (phase) {
			case 'introduction':
				return 'Введение'
			case 'preparation':
				return 'Подготовка'
			case 'discussion':
				return 'Обсуждение'
			case 'voting':
				return 'Голосование'
			case 'reveal':
				return 'Раскрытие'
			case 'crisis':
				return 'Кризис'
			case 'intermission':
				return 'Между раундами'
			case 'game_over':
				return 'Игра окончена'
			default:
				return phase
		}
	}

	const getPhaseDescription = (phase: GamePhase): string => {
		switch (phase) {
			case 'introduction':
				return 'Просмотр заставки и ознакомление с сюжетом'
			case 'preparation':
				return 'Изучите свои карты и подготовьтесь к обсуждению'
			case 'discussion':
				return 'Обсуждайте с другими игроками, кто подозрителен'
			case 'voting':
				return 'Голосуйте за исключение игрока'
			case 'reveal':
				return 'Раскрытие карт выбывшего игрока'
			case 'crisis':
				return 'Решение кризиса на станции'
			case 'intermission':
				return 'Подготовка к следующему раунду'
			case 'game_over':
				return 'Игра завершена'
			default:
				return ''
		}
	}

	const getCardTypeName = (type: CardType): string => {
		switch (type) {
			case 'profession':
				return 'Профессия'
			case 'health':
				return 'Состояние здоровья'
			case 'trait':
				return 'Психологическая черта'
			case 'secret':
				return 'Секрет'
			case 'role':
				return 'Скрытая роль'
			case 'resource':
				return 'Ресурс'
			case 'gender':
				return 'Пол'
			case 'age':
				return 'Возраст'
			case 'body':
				return 'Телосложение'
			default:
				return type
		}
	}

	const renderNarrationScreen = () => {
		return (
			<div className={styles.narrationOverlay}>
				<div className={styles.narrationContent}>
					<h2>{narration?.title}</h2>
					<div className={styles.narrationText}>
						{narration?.text.split('\n').map((line, i) => (
							<p key={i}>{line}</p>
						))}
					</div>
					<div className={styles.narrationTimer}>
						{displayTime}
					</div>
				</div>
			</div>
		)
	}

	const renderMyCardsModal = () => (
		<div className={styles.modalOverlay}>
			<div className={styles.modalContent}>
				<div className={styles.modalHeader}>
					<h2>Ваши карты</h2>
					<button
						className={styles.closeButton}
						onClick={() => setShowMyCards(false)}
					>
						✕
					</button>
				</div>

				<div className={styles.cardsGrid}>
					{Object.entries(myCards).map(([type, card]) => (
						<div key={type} className={styles.cardItem}>
							<h3>{getCardTypeName(type as CardType)}</h3>
							<h4>{card.name}</h4>
							<p>{card.description}</p>

							{card.pros && card.pros.length > 0 && (
								<div className={styles.cardPros}>
									<strong>Плюсы:</strong>
									<ul>
										{card.pros.map((pro, i) => (
											<li key={i}>{pro}</li>
										))}
									</ul>
								</div>
							)}

							{card.cons && card.cons.length > 0 && (
								<div className={styles.cardCons}>
									<strong>Минусы:</strong>
									<ul>
										{card.cons.map((con, i) => (
											<li key={i}>{con}</li>
										))}
									</ul>
								</div>
							)}

							{card.effects && card.effects.length > 0 && (
								<div className={styles.cardEffects}>
									<strong>Эффекты:</strong>
									<ul>
										{card.effects.map((effect, i) => (
											<li key={i}>{effect}</li>
										))}
									</ul>
								</div>
							)}

							{card.goal && (
								<div className={styles.cardGoal}>
									<strong>Цель:</strong>
									<p>{card.goal}</p>
								</div>
							)}

							{card.abilities && card.abilities.length > 0 && (
								<div className={styles.cardAbilities}>
									<strong>Способности:</strong>
									<ul>
										{card.abilities.map((ability, i) => (
											<li key={i}>{ability}</li>
										))}
									</ul>
								</div>
							)}

							{card.bonuses && card.bonuses.length > 0 && (
								<div className={styles.cardBonuses}>
									<strong>Бонусы:</strong>
									<ul>
										{card.bonuses.map((bonus, i) => (
											<li key={i}>{bonus}</li>
										))}
									</ul>
								</div>
							)}

							{card.specialAbility && (
								<div className={styles.cardSpecial}>
									<strong>Особая способность:</strong>
									<p>{card.specialAbility}</p>
								</div>
							)}

							<button
								className={styles.revealButton}
								onClick={() => handleRevealCard(type as CardType)}
								disabled={
									gameState?.phase !== 'discussion' ||
									!userId ||
									!gameState?.players?.find((p: any) => p.id === userId)
										?.isAlive
								}
							>
								Раскрыть карту
							</button>
						</div>
					))}
				</div>
			</div>
		</div>
	)

	const renderRevealedPlayerModal = () => (
		<div className={styles.modalOverlay}>
			<div className={styles.modalContent}>
				<div className={styles.modalHeader}>
					<h2>Раскрытие карт {revealedPlayer?.name}</h2>
					<button
						className={styles.closeButton}
						onClick={() => {
							setRevealedPlayer(null)
							setIsRevealing(false)
							setRevealingCards([])
						}}
						disabled={isRevealing}
					>
						✕
					</button>
				</div>

				<div className={styles.revealProgress}>
					{isRevealing ? (
						<div className={styles.revealingStatus}>
							<div className={styles.revealSpinner}></div>
							<p>Раскрытие карты {currentRevealIndex + 1} из {revealingCards.length}...</p>
						</div>
					) : (
						<div className={styles.revealComplete}>
							<p>✅ Все карты раскрыты</p>
						</div>
					)}
				</div>

				{revealedPlayer?.cards && (
					<div className={styles.cardsGrid}>
						{Object.entries(revealedPlayer.cards).map(
							([type, card]: [string, any]) =>
								card ? (
									<div 
										key={type} 
										className={`${styles.cardItem} ${styles.revealCard} ${
											revealedCards[type] ? styles.revealed : styles.hidden
										}`}
									>
										<div className={styles.cardHeader}>
											<h3>{getCardTypeDisplayName(type)}</h3>
											{!revealedCards[type] && (
												<div className={styles.cardBack}>
													<span className={styles.cardBackText}>Скрыто</span>
												</div>
											)}
										</div>
										
										{revealedCards[type] && (
											<div className={styles.cardContent}>
												<h4>{card.name}</h4>
												<p>{card.description}</p>
												
												{card.pros && card.pros.length > 0 && (
													<div className={styles.cardPros}>
														<strong>Плюсы:</strong>
														<ul>
															{card.pros.map((pro: string, i: number) => (
																<li key={i}>{pro}</li>
															))}
														</ul>
													</div>
												)}
												
												{card.cons && card.cons.length > 0 && (
													<div className={styles.cardCons}>
														<strong>Минусы:</strong>
														<ul>
															{card.cons.map((con: string, i: number) => (
																<li key={i}>{con}</li>
															))}
														</ul>
													</div>
												)}
											</div>
										)}
									</div>
								) : null
						)}
					</div>
				)}
			</div>
		</div>
	)

	const renderCrisisModal = () => (
		<div className={styles.modalOverlay}>
			<div className={styles.modalContent}>
				<div className={styles.crisisAlert}>
					<h2>КРИЗИС</h2>
					<h3>{activeCrisis?.name}</h3>
					<p>{activeCrisis?.description}</p>

					<div className={styles.crisisInfo}>
						<p>
							<strong>Тип:</strong>{' '}
							{activeCrisis?.type === 'technological'
								? 'Технологический'
								: activeCrisis?.type === 'biological'
									? 'Биологический'
									: 'Внешняя угроза'}
						</p>
						<p>
							<strong>Штраф:</strong> {activeCrisis?.penalty}
						</p>
						<p>
							<strong>Время на решение:</strong> {formatTime(phaseTimeLeft)}
						</p>
					</div>

					<div className={styles.crisisActions}>
						<button
							className={styles.solveButton}
							onClick={handleSolveCrisis}
							disabled={!isConnected}
						>
							Попытаться решить кризис
						</button>
					</div>
				</div>
			</div>
		</div>
	)

	const renderGameResultsModal = () => (
		<div className={styles.modalOverlay}>
			<div className={styles.modalContent}>
				<div className={styles.resultsContent}>
					<h2>🎉 Игра завершена! 🎉</h2>

					<div className={styles.resultsActions}>
						<button className={styles.leaveButton} onClick={handleLeaveGame}>
							Выйти из игры
						</button>
					</div>
				</div>
			</div>
		</div>
	)

	const renderPhaseActions = () => {
		if (!gameState) return null

		const currentPlayer = userId
			? gameState.players?.find((p: any) => p.id === userId)
			: null
		const alivePlayers = gameState.players?.filter((p: any) => p.isAlive) || []
		const requiredVotes = Math.floor(alivePlayers.length / 2)

		switch (gameState.phase) {
			case 'preparation':
				return (
					<div className={styles.phaseActions}>
						<button
							className={styles.actionButton}
							onClick={() => setShowMyCards(true)}
						>
							Просмотреть свои карты
						</button>
						<p className={styles.phaseHint}>
							Изучите свои карты и подготовьтесь к обсуждению
						</p>
					</div>
				)

			case 'discussion':
				return (
					<div className={styles.phaseActions}>
						<div className={styles.discussionActions}>
							<button
								className={styles.actionButton}
								onClick={() => setShowMyCards(true)}
							>
								Мои карты
							</button>

							<button
								className={styles.voteRequestButton}
								onClick={handleRequestVote}
								disabled={
									!currentPlayer?.isAlive ||
									gameState.voteRequests?.includes(userId)
								}
							>
								Начать голосование ({gameState.voteTriggerCount || 0}/
								{requiredVotes})
							</button>
						</div>
					</div>
				)

			case 'voting':
				return (
					<div className={styles.phaseActions}>
						<h3>Голосуйте за исключение игрока:</h3>
						<div className={styles.votingGrid}>
							{alivePlayers
								.filter((p: any) => p.id !== userId)
								.map((player: any) => (
									<button
										key={player.id}
										className={`${styles.voteOption} ${
											selectedVote === player.id ? styles.selected : ''
										}`}
										onClick={() => handleVote(player.id)}
										disabled={!currentPlayer?.isAlive || !!currentPlayer?.vote}
									>
										<div className={styles.votePlayerInfo}>
											<span className={styles.votePlayerName}>
												{player.name}
											</span>
										</div>
										<div className={styles.voteCount}>
											Голосов: {player.votesAgainst || 0}
										</div>
									</button>
								))}
						</div>
					</div>
				)
				
			case 'reveal':
				return (
					<div className={styles.phaseActions}>
						<div className={styles.revealPhaseInfo}>
							<h3>Раскрытие карт выбывшего игрока</h3>
							<p>Карты раскрываются по очереди...</p>
							{revealedPlayer && (
								<div className={styles.currentReveal}>
									<p>Раскрываются карты игрока: <strong>{revealedPlayer.name}</strong></p>
									{isRevealing && (
										<p>
											Карта {currentRevealIndex} из {revealingCards.length}:{' '}
											<span className={styles.currentCard}>
												{getCardTypeDisplayName(revealingCards[currentRevealIndex] || '')}
											</span>
										</p>
									)}
								</div>
							)}
						</div>
					</div>
				)

			case 'crisis':
				return (
					<div className={styles.phaseActions}>
						<button
							className={styles.crisisActionButton}
							onClick={() =>
								setActiveCrisis(gameState.currentCrisis || activeCrisis || {})
							}
						>
							Просмотреть кризис
						</button>

						<button
							className={styles.solveCrisisButton}
							onClick={handleSolveCrisis}
							disabled={!currentPlayer?.isAlive}
						>
							Попытаться решить кризис
						</button>
					</div>
				)

			case 'game_over':
				return (
					<div className={styles.phaseActions}>
						<button
							className={styles.resultsButton}
							onClick={() => setGameResults(gameResults || {})}
						>
							Показать результаты
						</button>
						<button className={styles.leaveButton} onClick={handleLeaveGame}>
							Выйти из игры
						</button>
					</div>
				)

			default:
				return (
					<div className={styles.phaseActions}>
						<p className={styles.phaseHint}>
							{getPhaseDescription(gameState.phase)}
						</p>
					</div>
				)
		}
	}

	// UI загрузки: до получения gameState
	if (!gameState) {
		return (
			<div className={styles.loadingContainer}>
				<div className={styles.loadingSpinner}></div>
				<p>Загрузка игры...</p>
				<p>
					Статус подключения: {isConnected ? 'Подключено' : 'Не подключено'}
				</p>
				<p>
					Профиль:{' '}
					{profile.status === 'ok'
						? `OK (${profile.data?.username})`
						: profile.status}
				</p>
				<button
					className={styles.retryButton}
					onClick={() => sendMessage({ type: 'JOIN_GAME', gameId })}
					disabled={!isConnected}
				>
					Повторить подключение
				</button>
			</div>
		)
	}

	// Если игра ещё не начата
	if (gameState.status === 'waiting') {
		return (
			<div className={styles.waitingRoom}>
				<h1>Ожидание начала игры</h1>
				<p>Игра: {gameId}</p>
				<p>Игроков: {gameState.players?.length || 0}</p>

				<div className={styles.playersList}>
					<h2>Игроки в комнате:</h2>
					{gameState.players?.map((player: any) => (
						<div key={player.id} className={styles.waitingPlayer}>
							<span>
								{player.name}
								{userId && player.id === userId && ' (Вы)'}
							</span>
							{player.id === gameState.creatorId && (
								<span className={styles.creatorBadge}>👑</span>
							)}
						</div>
					))}
				</div>

				{userId && gameState.creatorId === userId && (
					<button
						className={styles.startButton}
						onClick={handleStartGame}
						disabled={!isConnected}
					>
						Начать игру
					</button>
				)}

				<button className={styles.leaveButton} onClick={handleLeaveGame}>
					Покинуть игру
				</button>
			</div>
		)
	}

	const currentPlayer = userId
		? gameState.players?.find((p: any) => p.id === userId)
		: null
	const alivePlayers = gameState.players?.filter((p: any) => p.isAlive) || []
	const ejectedPlayers = gameState.players?.filter((p: any) => !p.isAlive) || []
	const requiredVotes = Math.floor(alivePlayers.length / 2)

	return (
		<div className={styles.container}>
			{narration && renderNarrationScreen()}
			{showMyCards && renderMyCardsModal()}
			{revealedPlayer && renderRevealedPlayerModal()}
			{activeCrisis && renderCrisisModal()}
			{gameResults && renderGameResultsModal()}

			<header className={styles.header}>
				<div className={styles.gameTitle}>
					<h1>Станция "Эдем"</h1>
					<div className={styles.gameSubtitle}>
						<span className={styles.round}>
							Раунд {gameState.round || 1}/{gameState.maxRounds || 10}
						</span>
						<span className={styles.phase}>
							Фаза: {getPhaseName(gameState.phase)}
						</span>
					</div>
				</div>

				<div className={styles.gameStats}>
					<div className={styles.statItem}>
						<span className={styles.statLabel}>Время:</span>
						<span className={styles.statValue}>
							⏱️ {formatTime(phaseTimeLeft)}
						</span>
					</div>
					<div className={styles.statItem}>
						<span className={styles.statLabel}>Капсула:</span>
						<span className={styles.statValue}>
							🚀 {gameState.occupiedSlots || 0}/
							{gameState.capsuleSlots ||
								Math.floor((gameState.players?.length || 0) / 2)}{' '}
							мест
						</span>
					</div>
					<div className={styles.statItem}>
						<span className={styles.statLabel}>Выжило:</span>
						<span className={styles.statValue}>
							👥 {alivePlayers.length}/{gameState.players?.length}
						</span>
					</div>
					{currentPlayer && (
						<div className={styles.statItem}>
							<span className={styles.statLabel}>Ваши очки:</span>
							<span className={styles.statValue}>
								🏆 {currentPlayer.score || 0}
							</span>
						</div>
					)}
				</div>

				<button className={styles.leaveGameButton} onClick={handleLeaveGame}>
					Покинуть игру
				</button>
			</header>

			<main className={styles.mainContent}>
				<section className={styles.playersPanel}>
					<div className={styles.panelHeader}>
						<h2>Экипаж ({alivePlayers.length} живых)</h2>
						<div className={styles.panelActions}>
							<button
								className={styles.smallButton}
								onClick={() => setShowMyCards(true)}
							>
								Мои карты
							</button>
						</div>
					</div>

					<div className={styles.playersList}>
						{gameState.players?.map((player: any) => (
							<div
								key={player.id}
								className={`${styles.playerCard} ${
									!player.isAlive ? styles.dead : ''
								} ${userId && player.id === userId ? styles.me : ''} ${
									userId && player.vote === userId ? styles.votedForMe : ''
								}`}
							>
								<div className={styles.playerHeader}>
									<div className={styles.playerAvatar}>
										{player.avatar ? (
											<img src={player.avatar} alt={player.name} />
										) : (
											<span>{player.name.charAt(0)}</span>
										)}
									</div>

									<div className={styles.playerInfo}>
										<h3>
											{player.name}
											{userId && player.id === userId && ' (Вы)'}
										</h3>
										<div className={styles.playerStatus}>
											{player.isAlive ? (
												<span className={styles.alive}>Жив</span>
											) : (
												<span className={styles.deadStatus}>Мертв</span>
											)}
										</div>
										<div className={styles.playerStats}>
											<span>Очки: {player.score || 0}</span>
											{player.profession && <span> | {player.profession}</span>}
										</div>
									</div>
								</div>

								{gameState.phase === 'voting' &&
									player.isAlive &&
									userId &&
									player.id !== userId && (
										<div className={styles.voteSection}>
											<button
												className={styles.voteButton}
												onClick={() => handleVote(player.id)}
												disabled={
													!currentPlayer?.isAlive || !!currentPlayer?.vote
												}
											>
												Голосовать против
											</button>
											<div className={styles.voteCount}>
												Голосов: {player.votesAgainst || 0}
											</div>
										</div>
									)}
							</div>
						))}
					</div>

					{ejectedPlayers.length > 0 && (
						<div className={styles.ejectedPlayers}>
							<h3>Выбывшие ({ejectedPlayers.length}):</h3>
							<div className={styles.ejectedList}>
								{ejectedPlayers.map((player: any) => (
									<span key={player.id} className={styles.ejectedPlayer}>
										{player.name}
									</span>
								))}
							</div>
						</div>
					)}
				</section>

				<section className={styles.gamePanel}>
					<div className={styles.phaseInfo}>
						<h2>{getPhaseName(gameState.phase)}</h2>
						<p className={styles.phaseDescription}>
							{getPhaseDescription(gameState.phase)}
						</p>
						<div className={styles.phaseTimer}>
							<div className={styles.timerBar}>
								<div
									className={styles.timerProgress}
									style={{
										width: `${
											(phaseTimeLeft / (phaseDuration || 180)) * 100
										}%`,
									}}
								></div>
							</div>
							<span className={styles.timerText}>
								{formatTime(phaseTimeLeft)} / {formatTime(phaseDuration || 180)}
							</span>
						</div>
					</div>

					<div className={styles.gameActions}>{renderPhaseActions()}</div>

					<div className={styles.chatSection}>
						<div className={styles.chatHeader}>
							<h3>Чат обсуждения</h3>
							<div className={styles.chatStatus}>
								{isConnected ? 'Онлайн' : 'Офлайн'}
							</div>
						</div>

						<div className={styles.chatMessages} ref={chatContainerRef}>
							{chatMessages.length === 0 ? (
								<div className={styles.emptyChat}>
									<p>Сообщений пока нет</p>
									<p className={styles.emptyHint}>Начните общение первым!</p>
								</div>
							) : (
								chatMessages.map(message => (
									<div
										key={message.id}
										className={`${styles.message} ${
											message.type === 'system' ? styles.systemMessage : ''
										} ${
											userId && message.playerId === userId
												? styles.myMessage
												: ''
										}`}
									>
										<div className={styles.messageHeader}>
											<span className={styles.sender}>
												{message.playerName}
											</span>
											<span className={styles.time}>
												{formatMessageTime(message.timestamp)}
											</span>
										</div>
										<div className={styles.messageText}>{message.text}</div>
									</div>
								))
							)}
						</div>

						<form onSubmit={handleSendMessage} className={styles.chatForm}>
							<input
								type='text'
								value={newMessage}
								onChange={e => handleMessageChange(e.target.value)}
								onKeyPress={handleKeyPress}
								placeholder={
									!isConnected ? 'Нет подключения...' : 'Введите сообщение...'
								}
								disabled={
									!isConnected ||
									!gameState ||
									gameState.phase === 'game_over' ||
									profile.status !== 'ok'
								}
								className={styles.chatInput}
								maxLength={300}
							/>
							<button
								type='submit'
								className={styles.sendButton}
								disabled={
									!newMessage.trim() ||
									!isConnected ||
									!gameState ||
									gameState.phase === 'game_over' ||
									profile.status !== 'ok'
								}
							>
								Отправить
							</button>
						</form>
					</div>
				</section>
			</main>

			<footer className={styles.footer}>
				<div className={styles.playerStatusInfo}>
					{currentPlayer && (
						<>
							<span>Ваш статус: {currentPlayer.isAlive ? 'Жив' : 'Мертв'}</span>
							<span> | Карт раскрыто: {currentPlayer.revealedCards || 0}</span>
							<span>
								{' '}
								| Голосов для голосования: {gameState.voteTriggerCount || 0}/
								{requiredVotes}
							</span>
						</>
					)}
				</div>

				<div className={styles.gameRules}>
					<button
						className={styles.rulesButton}
						onClick={() => window.open('/rules', '_blank')}
					>
						Правила
					</button>
					<button
						className={styles.settingsButton}
						onClick={() => alert('Настройки игры')}
					>
						Настройки
					</button>
				</div>
			</footer>
		</div>
	)
}