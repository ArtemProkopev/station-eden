// apps/web/src/app/game/[gameId]/GameSessionClient.tsx
'use client'

import {
	ExtendedGamePlayer,
	ExtendedGameState,
	GameChatMessage,
} from '@station-eden/shared'
import type React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import GameAtmosphere from './components/GameAtmosphere'
import GameChat from './components/GameChat'
import GameFooter from './components/GameFooter'
import GameHeader from './components/GameHeader'
import GamePhasePanel from './components/GamePhasePanel'
import { useGameSession } from './components/hooks/useGameSession'
import IntroCinematic from './components/IntroCinematic/IntroCinematic'
import CrisisModal from './components/modals/CrisisModal'
import GameResultsModal from './components/modals/GameResultsModal'
import LeaveGameConfirmModal from './components/modals/LeaveGameConfirmModal'
import MyCardsModal from './components/modals/MyCardsModal'
import RevealedPlayerModal from './components/modals/RevealedPlayerModal'
import PlayersPanel from './components/PlayersPanel'
import LoadingScreen from './components/screens/LoadingScreen'
import WaitingRoom from './components/screens/WaitingRoom'
import styles from './page.module.css'

type Props = {
	gameId: string
}

export default function GameSessionClient({ gameId }: Props) {
	const {
		gameState,
		myCards,
		phaseTimeLeft,
		activeCrisis,
		showMyCards,
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

		userId,
		profile,
		isConnected,

		setShowMyCards,
		setShowCardsTable,
		setActiveCrisis,
		resetReveal,

		playerAbilities,
		handleUseAbility,

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
		handleSolveCrisis,
		handleCloseCrisis,
		handleLeaveGame,
	} = useGameSession(gameId)

	const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false)
	const [seenNewCardsCount, setSeenNewCardsCount] = useState(0)

	const players = useMemo((): ExtendedGamePlayer[] => {
		return (gameState?.players || []) as ExtendedGamePlayer[]
	}, [gameState?.players])

	const userChatMessages = useMemo((): GameChatMessage[] => {
		return (chatMessages as GameChatMessage[]).filter(
			message => message.type !== 'system',
		)
	}, [chatMessages])

	const systemMessages = useMemo((): GameChatMessage[] => {
		return (chatMessages as GameChatMessage[])
			.filter(message => message.type === 'system')
			.slice(-12)
	}, [chatMessages])

	const newCardsCount = Math.max(
		0,
		newCardsThisRound.length - seenNewCardsCount,
	)

	const [isIntroCinematicVisible, setIsIntroCinematicVisible] = useState(false)
	const [introPlayersCount, setIntroPlayersCount] = useState(0)

	const availableProfessions = useMemo(() => {
		return [
			{ id: 'prof_engineer', name: 'Инженер-кинетик' },
			{ id: 'prof_astrobiologist', name: 'Астробиолог' },
			{ id: 'prof_pilot', name: 'Пилот-ас' },
			{ id: 'prof_surgeon', name: 'Хирург' },
			{ id: 'prof_linguist', name: 'Лингвист-ксенолог' },
			{ id: 'prof_security', name: 'Офицер безопасности' },
			{ id: 'prof_astrogeologist', name: 'Астрогеолог' },
			{ id: 'prof_xenopsychologist', name: 'Ксенопсихолог' },
			{ id: 'prof_genetic_engineer', name: 'Генный инженер' },
			{ id: 'prof_ecologist', name: 'Эколог замкнутого цикла' },
			{ id: 'prof_ai_activist', name: 'Активист за права ИИ' },
			{ id: 'prof_blogger', name: 'Космический блогер' },
			{ id: 'prof_food_critic', name: 'Штатный критик еды' },
			{ id: 'prof_cleaner_android', name: 'Уборщик-андроид' },
			{ id: 'prof_crypto_trader', name: 'Крипто-трейдер' },
			{ id: 'prof_ex_boss', name: 'Бывший начальник' },
		]
	}, [])

	const availableResources = useMemo(() => {
		return [
			{ id: 'resource_medkit', name: 'Медицинский набор' },
			{ id: 'resource_toolkit', name: 'Инженерный набор' },
			{ id: 'resource_data_core', name: 'Ядро данных станции' },
			{ id: 'resource_magnetic_gloves', name: 'Магнитные перчатки' },
			{ id: 'resource_universal_keycard', name: 'Универсальный ключ-карта' },
			{ id: 'resource_mini_reactor', name: 'Мини-реактор' },
			{ id: 'resource_oxygen_generator', name: 'Генератор кислорода' },
			{ id: 'resource_black_box', name: 'Чёрный ящик' },
			{ id: 'resource_alien_sample', name: 'Образец неизвестной формы жизни' },
			{ id: 'resource_canned_food', name: 'Запас консервов' },
			{ id: 'resource_water_filter', name: 'Водный фильтр' },
			{ id: 'resource_nano_medkit', name: 'Аптечка с наноботами' },
			{ id: 'resource_moonshine', name: 'Контрабандный алкоголь' },
			{ id: 'resource_speaker', name: 'Музыкальная колонка' },
			{ id: 'resource_mutant_cockroach', name: 'Ручной таракан-мутант' },
		]
	}, [])

	const playersList = useMemo(() => {
		return players.map(player => ({
			id: player.id,
			name: player.name,
			isAlive: player.isAlive === true,
		}))
	}, [players])

	useEffect(() => {
		if (gameState?.phase !== 'introduction') return

		setIntroPlayersCount(players.length)
		setIsIntroCinematicVisible(true)
	}, [gameState?.phase, players.length])

	useEffect(() => {
		if (gameState?.phase === 'introduction') return

		setIsIntroCinematicVisible(false)
	}, [gameState?.phase])

	useEffect(() => {
		if (introEndCounter <= 0) return

		setIsIntroCinematicVisible(false)
	}, [introEndCounter])

	useEffect(() => {
		if (newCardsThisRound.length === 0) {
			setSeenNewCardsCount(0)
		}
	}, [newCardsThisRound.length])

	const myAllRevealedCardIds = useMemo((): string[] => {
		if (!myAllRevealedCards) return []

		if (Array.isArray(myAllRevealedCards)) {
			return myAllRevealedCards.map(
				card => (card as any).id ?? (card as any).name,
			)
		}

		return Object.keys(myAllRevealedCards)
	}, [myAllRevealedCards])

	const myAllRevealedCardsObject = useMemo((): Record<
		string,
		{ name: string; type: string }
	> => {
		if (!myAllRevealedCards) return {}

		if (Array.isArray(myAllRevealedCards)) {
			return myAllRevealedCards.reduce(
				(acc, card) => {
					const key = (card as any).id ?? (card as any).name

					acc[key] = {
						name: (card as any).name,
						type: (card as any).type,
					}

					return acc
				},
				{} as Record<string, { name: string; type: string }>,
			)
		}

		return myAllRevealedCards
	}, [myAllRevealedCards])

	const handleChatScroll = useCallback(() => {}, [])

	const handleIntroCinematicComplete = useCallback(() => {
		handleCompleteNarration()
	}, [handleCompleteNarration])

	const handleIntroCinematicSkip = useCallback(() => {
		handleSkipNarration()
	}, [handleSkipNarration])

	const handleOpenMyCards = useCallback(() => {
		setShowMyCards(true)
		setSeenNewCardsCount(newCardsThisRound.length)
	}, [newCardsThisRound.length, setShowMyCards])

	const handleOpenLeaveConfirm = useCallback(() => {
		setIsLeaveConfirmOpen(true)
	}, [])

	const handleCloseLeaveConfirm = useCallback(() => {
		setIsLeaveConfirmOpen(false)
	}, [])

	const handleConfirmLeaveGame = useCallback(() => {
		setIsLeaveConfirmOpen(false)
		handleLeaveGame()
	}, [handleLeaveGame])

	const leaveConfirmToast = isLeaveConfirmOpen ? (
		<LeaveGameConfirmModal
			onConfirm={handleConfirmLeaveGame}
			onCancel={handleCloseLeaveConfirm}
		/>
	) : null

	if (!gameState) {
		return (
			<LoadingScreen
				isConnected={isConnected}
				profile={profile}
				gameId={gameId}
				onRetryJoin={() => {}}
				userId={userId}
			/>
		)
	}

	if (gameState.status === 'waiting') {
		return (
			<>
				<WaitingRoom
					gameState={gameState}
					gameId={gameId}
					userId={userId}
					isConnected={isConnected}
					onStartGame={handleStartGame}
					onLeaveGame={handleOpenLeaveConfirm}
				/>

				{leaveConfirmToast}
			</>
		)
	}

	const currentPlayer = userId
		? players.find(player => player.id === userId)
		: undefined

	const alivePlayers = players.filter(player => player.isAlive === true)
	const phaseDurationDisplay = getPhaseDuration(gameState, phaseTimeLeft)

	return (
		<div className={styles.container}>
			<GameAtmosphere />

			{leaveConfirmToast}

			{isIntroCinematicVisible && (
				<IntroCinematic
					playersCount={introPlayersCount || players.length}
					phaseTimeLeft={phaseTimeLeft}
					canSkip={canSkipNarration}
					skipProgress={introSkipProgress}
					onSkip={handleIntroCinematicSkip}
					onComplete={handleIntroCinematicComplete}
				/>
			)}

			{showMyCards && (
				<MyCardsModal
					myCards={myCards}
					cardsReceivedThisRound={cardsReceivedThisRound}
					myRevealedCardsThisRound={myRevealedCardsThisRound}
					myAllRevealedCards={myAllRevealedCardsObject}
					newCardsThisRound={newCardsThisRound}
					gameState={gameState}
					userId={userId}
					onClose={() => setShowMyCards(false)}
					onRevealCard={handleRevealCard}
				/>
			)}

			{revealedPlayer && (
				<RevealedPlayerModal
					revealedPlayer={revealedPlayer}
					revealedCards={revealedCards}
					revealingCards={revealingCards}
					currentRevealIndex={currentRevealIndex}
					isRevealing={isRevealing}
					onClose={resetReveal}
				/>
			)}

			{activeCrisis && (
				<CrisisModal
					crisis={activeCrisis}
					phaseTimeLeft={phaseTimeLeft}
					currentPlayer={currentPlayer}
					isConnected={isConnected}
					onSolve={handleSolveCrisis}
					onClose={handleCloseCrisis}
				/>
			)}

			{gameResults && (
				<GameResultsModal
					gameResults={gameResults}
					onLeaveGame={handleLeaveGame}
				/>
			)}

			<GameHeader
				gameState={gameState}
				phaseTimeLeft={phaseTimeLeft}
				myRevealedCardsThisRound={myRevealedCardsThisRound}
				userId={userId}
				onLeaveGame={handleOpenLeaveConfirm}
			/>

			<main className={styles.mainContent}>
				<PlayersPanel
					gameState={gameState}
					userId={userId}
					gamePhase={gameState.phase as string}
					currentPlayer={currentPlayer}
					onVote={handleVote}
					onShowMyCards={handleOpenMyCards}
					onShowCardsTable={() => setShowCardsTable(true)}
				/>

				<GamePhasePanel
					gameState={gameState}
					phaseTimeLeft={phaseTimeLeft}
					phaseDurationDisplay={phaseDurationDisplay}
					userId={userId}
					currentPlayer={currentPlayer}
					alivePlayers={alivePlayers}
					myRevealedCardsThisRound={myRevealedCardsThisRound}
					myAllRevealedCards={myAllRevealedCardIds}
					revealingCards={revealingCards}
					currentRevealIndex={currentRevealIndex}
					isRevealing={isRevealing}
					revealedPlayer={revealedPlayer}
					onShowMyCards={handleOpenMyCards}
					onShowCardsTable={() => setShowCardsTable(true)}
					onStartDiscussion={handleStartDiscussion}
					onRequestVote={handleRequestVote}
					onVote={handleVote}
					onSolveCrisis={handleSolveCrisis}
					onSetActiveCrisis={setActiveCrisis}
					allPlayersCards={allPlayersCards}
					myCards={myCards}
					newCardsCount={newCardsCount}
					systemMessages={systemMessages}
					playerAbilities={playerAbilities}
					onUseAbility={handleUseAbility}
					playersList={playersList}
					availableProfessions={availableProfessions}
					availableResources={availableResources}
				/>

				<GameChat
					gameId={gameId}
					messages={userChatMessages}
					newMessage={newMessage}
					onMessageChange={handleMessageChange}
					onSendMessage={handleSendMessage}
					onKeyPress={
						handleKeyPress as (event: React.KeyboardEvent<Element>) => void
					}
					onChatScroll={handleChatScroll}
					disabled={!isConnected || gameState.phase === 'game_over'}
					currentUserId={userId}
				/>
			</main>

			<GameFooter
				gameState={gameState}
				currentPlayer={currentPlayer}
				myRevealedCardsThisRound={myRevealedCardsThisRound}
				myAllRevealedCards={myAllRevealedCardsObject}
				alivePlayers={alivePlayers}
				onShowCardsTable={() => setShowCardsTable(true)}
			/>
		</div>
	)
}

function getPhaseDuration(
	gameState: ExtendedGameState,
	phaseTimeLeft: number,
): number {
	if (
		typeof gameState.phaseDuration === 'number' &&
		gameState.phaseDuration > 0
	) {
		return gameState.phaseDuration
	}

	if (gameState.phase === 'voting') return 60
	if (gameState.phase === 'discussion') return 180
	if (gameState.phase === 'crisis') return 60
	if (gameState.phase === 'preparation') return 30
	if (gameState.phase === 'intermission') return 10

	return phaseTimeLeft > 0 ? phaseTimeLeft : 30
}
