// apps/web/src/app/game/[gameId]/page.tsx
'use client'

import { useWebSocket } from '@/hooks/useWebSocket'
import { useCallback, useEffect, useRef, useState } from 'react'
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

type PlayerInfo = {
	id: string
	name: string
	avatar?: string
	score: number
	isAlive: boolean
	isInfected?: boolean
	isSuspicious?: boolean
	isCaptain?: boolean
	isSeniorOfficer?: boolean
	vote?: string
	votesAgainst: number
	revealedCards: number
	profession?: string
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

export default function GameSession({ params, searchParams }: PageProps) {
	const { gameId } = params

	// Временные значения - в реальном приложении их нужно получать из сессии/контекста
	const userId = 'temp-user-id' // TODO: Заменить на получение из auth контекста
	const username = 'temp-username' // TODO: Заменить на получение из auth контекста

	const [gameState, setGameState] = useState<any>(null)
	const [myCards, setMyCards] = useState<Record<string, CardDetails>>({})
	const [selectedVote, setSelectedVote] = useState<string>('')
	const [phaseTimeLeft, setPhaseTimeLeft] = useState<number>(0)
	const [chatMessages, setChatMessages] = useState<
		Array<{ player: string; text: string; isSystem?: boolean }>
	>([])
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

	const chatContainerRef = useRef<HTMLDivElement>(null)

	const addToChat = useCallback(
		(player: string, text: string, isSystem: boolean = false) => {
			setChatMessages(prev => [...prev.slice(-50), { player, text, isSystem }])
		},
		[]
	)

	const getCardDisplayName = useCallback(
		(cardType: string, cardId: string): string => {
			// Поиск названия карты по ID
			const card = myCards[cardType as CardType]
			return card?.name || cardId
		},
		[myCards]
	)

	const handleWebSocketMessage = useCallback(
		(data: any) => {
			console.log('Game WebSocket message:', data.type, data)

			switch (data.type) {
				case 'GAME_STATE': {
					console.log('Received GAME_STATE:', data.gameState)
					const game = data.gameState

					setGameState(game)

					// Обновляем таймер
					if (game.phaseEndTime) {
						const endTime = new Date(game.phaseEndTime).getTime()
						const now = Date.now()
						setPhaseTimeLeft(Math.max(0, Math.floor((endTime - now) / 1000)))
					}

					// Сбрасываем кризис если фаза изменилась
					if (game.phase !== 'crisis' && activeCrisis) {
						setActiveCrisis(null)
					}
					break
				}

				case 'YOUR_CARDS': {
					console.log('Received YOUR_CARDS:', data)
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
					console.log('GAME_NARRATION:', data)
					setNarration({
						title: data.title,
						text: data.text,
					})

					// Автоматически скрываем через 30 секунд
					setTimeout(() => {
						setNarration(null)
					}, 30000)
					break
				}

				case 'CRISIS_TRIGGERED':
					console.log('CRISIS_TRIGGERED:', data.crisis)
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

				case 'PLAYER_REVEAL':
					console.log('PLAYER_REVEAL:', data)
					setRevealedPlayer({
						name: data.playerName,
						cards: data.cards,
					})
					break

				case 'CARD_REVEALED':
					addToChat(
						'Система',
						`${data.playerName} раскрыл(а) карту: ${getCardDisplayName(data.cardType, data.cardId)}`,
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
					console.log('GAME_FINISHED:', data)
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
						addToChat(data.message.playerName || 'Игрок', data.message.text)
					}
					break
			}
		},
		[activeCrisis, addToChat, getCardDisplayName]
	)

	// ИСПРАВЛЕНО: Правильный URL для WebSocket
	const wsBase = process.env.NEXT_PUBLIC_WS_BASE || 'http://localhost:4000'
	let wsUrl: string

	if (wsBase.startsWith('https://')) {
		wsUrl = wsBase.replace('https://', 'wss://') + '/game'
	} else if (wsBase.startsWith('http://')) {
		wsUrl = wsBase.replace('http://', 'ws://') + '/game'
	} else if (wsBase.startsWith('wss://')) {
		wsUrl = wsBase + (wsBase.endsWith('/game') ? '' : '/game')
	} else {
		wsUrl = 'wss://' + wsBase + '/game'
	}

	const { sendMessage, isConnected } = useWebSocket(
		wsUrl,
		handleWebSocketMessage,
		{ gameId, userId }
	)

	useEffect(() => {
		if (isConnected && gameId) {
			console.log('Connected to game, joining...')
			sendMessage({ type: 'JOIN_GAME', gameId })
		}
	}, [isConnected, gameId, sendMessage])

	useEffect(() => {
		// Таймер фазы
		if (phaseTimeLeft > 0) {
			const timer = setInterval(() => {
				setPhaseTimeLeft(prev => {
					if (prev <= 1) {
						clearInterval(timer)
						return 0
					}
					return prev - 1
				})
			}, 1000)
			return () => clearInterval(timer)
		}
	}, [phaseTimeLeft])

	useEffect(() => {
		// Автоскролл чата
		if (chatContainerRef.current) {
			chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
		}
	}, [chatMessages])

	const handleSendMessage = () => {
		if (!newMessage.trim() || !isConnected) return

		sendMessage({
			type: 'SEND_MESSAGE',
			message: {
				text: newMessage,
				playerName: username,
				gameId,
			},
		})

		// Локально добавляем сообщение для мгновенного отображения
		addToChat(username, newMessage)
		setNewMessage('')
	}

	const handleStartGame = () => {
		if (!isConnected) return
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
			// В реальном приложении здесь был бы редирект
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

	const renderNarrationScreen = () => (
		<div className={styles.narrationOverlay}>
			<div className={styles.narrationContent}>
				<h2>{narration?.title}</h2>
				<div className={styles.narrationText}>
					{narration?.text.split('\n').map((line, i) => (
						<p key={i}>{line}</p>
					))}
				</div>
				<div className={styles.narrationTimer}>
					Заставка: {formatTime(phaseTimeLeft)}
				</div>
			</div>
		</div>
	)

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
					<h2>Карты {revealedPlayer?.name}</h2>
					<button
						className={styles.closeButton}
						onClick={() => setRevealedPlayer(null)}
					>
						✕
					</button>
				</div>

				{revealedPlayer?.cards && (
					<div className={styles.cardsGrid}>
						{Object.entries(revealedPlayer.cards).map(
							([type, card]: [string, any]) =>
								card && (
									<div key={type} className={styles.cardItem}>
										<h3>{getCardTypeName(type as CardType)}</h3>
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

										{card.effects && card.effects.length > 0 && (
											<div className={styles.cardEffects}>
												<strong>Эффекты:</strong>
												<ul>
													{card.effects.map((effect: string, i: number) => (
														<li key={i}>{effect}</li>
													))}
												</ul>
											</div>
										)}
									</div>
								)
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
					<h2>🚨 КРИЗИС! 🚨</h2>
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
						{activeCrisis?.priorityProfessions &&
							activeCrisis.priorityProfessions.length > 0 && (
								<p>
									<strong>Подходящие профессии:</strong>{' '}
									{activeCrisis.priorityProfessions.join(', ')}
								</p>
							)}
					</div>

					<div className={styles.crisisActions}>
						<button
							className={styles.solveButton}
							onClick={handleSolveCrisis}
							disabled={!isConnected}
						>
							Попытаться решить кризис
						</button>
						<p className={styles.crisisHint}>
							{activeCrisis?.type === 'technological'
								? 'Инженеры и техники наиболее эффективны'
								: activeCrisis?.type === 'biological'
									? 'Медики и биологи могут помочь'
									: 'Лингвисты и коммуникаторы нужны для решения'}
						</p>
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

					{gameResults?.reason === 'capsule_full' && (
						<p className={styles.resultReason}>Капсула заполнена!</p>
					)}
					{gameResults?.reason === 'hidden_role_win' && (
						<p className={styles.resultReason}>
							Скрытая роль выполнила свою миссию!
						</p>
					)}
					{gameResults?.reason === 'round_limit' && (
						<p className={styles.resultReason}>Закончились раунды!</p>
					)}

					<div className={styles.winnersList}>
						<h3>Победители:</h3>
						{gameResults?.scores
							.filter((p: any) => gameResults.winners.includes(p.id))
							.map((player: any) => (
								<div key={player.id} className={styles.winnerItem}>
									<span className={styles.winnerName}>{player.name}</span>
									<span className={styles.winnerRole}>{player.role}</span>
									<span className={styles.winnerScore}>
										{player.score} очков
									</span>
								</div>
							))}
					</div>

					<div className={styles.allScores}>
						<h3>Все игроки:</h3>
						{gameResults?.scores
							.sort((a: any, b: any) => b.score - a.score)
							.map((player: any, index: number) => (
								<div
									key={player.id}
									className={`${styles.scoreItem} ${gameResults.winners.includes(player.id) ? styles.winner : ''}`}
								>
									<span className={styles.rank}>#{index + 1}</span>
									<span className={styles.playerName}>
										{player.name}
										{player.id === userId && ' (Вы)'}
									</span>
									<span className={styles.playerScore}>
										{player.score} очков
									</span>
									<span className={styles.playerStatus}>
										{player.survived ? 'Выжил' : 'Погиб'}
									</span>
								</div>
							))}
					</div>

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

		const currentPlayer = gameState.players?.find((p: any) => p.id === userId)
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

							{currentPlayer?.isCaptain && !currentPlayer?.hasUsedAbility && (
								<button
									className={styles.abilityButton}
									onClick={() => handleUseAbility('captain_veto')}
								>
									Использовать право вето
								</button>
							)}

							{currentPlayer?.hiddenRole === 'role_saboteur' &&
								!currentPlayer?.hasUsedAbility && (
									<button
										className={styles.abilityButton}
										onClick={() => handleUseAbility('sabotage')}
									>
										Саботировать капсулу
									</button>
								)}

							{currentPlayer?.gender === 'gender_nonbinary' &&
								!currentPlayer?.hasUsedAbility && (
									<button
										className={styles.abilityButton}
										onClick={() => handleUseAbility('nonbinary_ability')}
									>
										Сменить восприятие
									</button>
								)}

							{currentPlayer?.hiddenRole === 'role_xenophag' &&
								!currentPlayer?.hasUsedAbility && (
									<button
										className={styles.abilityButton}
										onClick={() => {
											const targetId = alivePlayers.find(
												(p: any) => p.id !== userId
											)?.id
											if (targetId) handleUseAbility('infect', targetId)
										}}
									>
										Заразить игрока
									</button>
								)}
						</div>

						<div className={styles.voteInfo}>
							<p>
								Голосование начнется, когда {requiredVotes} игроков нажмет
								кнопку
							</p>
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
										className={`${styles.voteOption} ${selectedVote === player.id ? styles.selected : ''}`}
										onClick={() => handleVote(player.id)}
										disabled={!currentPlayer?.isAlive || !!currentPlayer?.vote}
									>
										<div className={styles.votePlayerInfo}>
											<span className={styles.votePlayerName}>
												{player.name}
											</span>
											{player.isInfected && (
												<span className={styles.infectedBadge}>🦠</span>
											)}
											{player.isSuspicious && (
												<span className={styles.suspiciousBadge}>👁️</span>
											)}
										</div>
										<div className={styles.voteCount}>
											Голосов: {player.votesAgainst || 0}
										</div>
									</button>
								))}
						</div>

						{currentPlayer?.vote && (
							<p className={styles.voteConfirmed}>
								Вы проголосовали против{' '}
								{
									gameState.players?.find(
										(p: any) => p.id === currentPlayer.vote
									)?.name
								}
							</p>
						)}
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

	if (!gameState) {
		return (
			<div className={styles.loadingContainer}>
				<div className={styles.loadingSpinner}></div>
				<p>Загрузка игры...</p>
				<p>
					Статус подключения: {isConnected ? 'Подключено' : 'Не подключено'}
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

	// Если игра еще не начата
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
							<span>{player.name}</span>
							{player.id === gameState.creatorId && (
								<span className={styles.creatorBadge}>👑</span>
							)}
						</div>
					))}
				</div>

				{gameState.creatorId === userId && (
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

	const currentPlayer = gameState.players?.find((p: any) => p.id === userId)
	const alivePlayers = gameState.players?.filter((p: any) => p.isAlive) || []
	const ejectedPlayers = gameState.players?.filter((p: any) => !p.isAlive) || []
	const requiredVotes = Math.floor(alivePlayers.length / 2)

	return (
		<div className={styles.container}>
			{/* Оверлеи */}
			{narration && renderNarrationScreen()}
			{showMyCards && renderMyCardsModal()}
			{revealedPlayer && renderRevealedPlayerModal()}
			{activeCrisis && renderCrisisModal()}
			{gameResults && renderGameResultsModal()}

			{/* Хедер игры */}
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
								Math.floor(gameState.players?.length / 2)}{' '}
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

			{/* Основное поле */}
			<main className={styles.mainContent}>
				{/* Левая панель - игроки */}
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
								} ${player.id === userId ? styles.me : ''} ${
									player.vote === userId ? styles.votedForMe : ''
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
											{player.id === userId && ' (Вы)'}
										</h3>
										<div className={styles.playerStatus}>
											{player.isAlive ? (
												<span className={styles.alive}>Жив</span>
											) : (
												<span className={styles.deadStatus}>Мертв</span>
											)}
											{player.isInfected && (
												<span className={styles.infected}>Заражен</span>
											)}
											{player.isSuspicious && (
												<span className={styles.suspicious}>Подозрителен</span>
											)}
										</div>
										<div className={styles.playerStats}>
											<span>Очки: {player.score || 0}</span>
											{player.profession && <span> | {player.profession}</span>}
										</div>
									</div>

									<div className={styles.playerBadges}>
										{player.isCaptain && (
											<span className={styles.captainBadge}>👑</span>
										)}
										{player.isSeniorOfficer && (
											<span className={styles.officerBadge}>⭐</span>
										)}
										{player.revealedCards > 0 && (
											<span className={styles.revealedBadge}>
												📄{player.revealedCards}
											</span>
										)}
									</div>
								</div>

								{gameState.phase === 'voting' &&
									player.isAlive &&
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

				{/* Центральная панель - игровое поле */}
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
										width: `${(phaseTimeLeft / (gameState.phaseDuration || 180)) * 100}%`,
									}}
								></div>
							</div>
							<span className={styles.timerText}>
								{formatTime(phaseTimeLeft)} /{' '}
								{formatTime(gameState.phaseDuration || 180)}
							</span>
						</div>
					</div>

					<div className={styles.gameActions}>{renderPhaseActions()}</div>

					{/* Чат */}
					<div className={styles.chatSection}>
						<div className={styles.chatHeader}>
							<h3>Чат обсуждения</h3>
							<div className={styles.chatStatus}>
								{isConnected ? 'Онлайн' : 'Офлайн'}
							</div>
						</div>

						<div className={styles.chatMessages} ref={chatContainerRef}>
							{chatMessages.map((msg, index) => (
								<div
									key={index}
									className={`${styles.chatMessage} ${msg.isSystem ? styles.systemMessage : ''}`}
								>
									<span className={styles.messageSender}>
										{msg.isSystem ? '⚙️ ' : `${msg.player}: `}
									</span>
									<span className={styles.messageText}>{msg.text}</span>
								</div>
							))}
						</div>

						<div className={styles.chatInput}>
							<input
								type='text'
								value={newMessage}
								onChange={e => setNewMessage(e.target.value)}
								onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
								placeholder='Введите сообщение...'
								disabled={!isConnected}
							/>
							<button
								onClick={handleSendMessage}
								disabled={!isConnected || !newMessage.trim()}
							>
								Отправить
							</button>
						</div>
					</div>
				</section>
			</main>

			{/* Футер с дополнительной информацией */}
			<footer className={styles.footer}>
				<div className={styles.playerStatusInfo}>
					{currentPlayer && (
						<>
							<span>Ваш статус: {currentPlayer.isAlive ? 'Жив' : 'Мертв'}</span>
							{currentPlayer.isInfected && (
								<span className={styles.infectionWarning}>Заражен!</span>
							)}
							{currentPlayer.isSuspicious && (
								<span className={styles.suspiciousWarning}>
									Под подозрением
								</span>
							)}
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
						📖 Правила
					</button>
					<button
						className={styles.settingsButton}
						onClick={() => alert('Настройки игры')}
					>
						⚙️ Настройки
					</button>
					{currentPlayer?.isCaptain && (
						<span className={styles.captainIndicator}>👑 Вы капитан</span>
					)}
				</div>
			</footer>
		</div>
	)
}
