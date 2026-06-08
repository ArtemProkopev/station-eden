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
				/>

				<GameChat
					gameId={gameId}
					messages={userChatMessages}
					newMessage={newMessage}
					onMessageChange={handleMessageChange}
					onSendMessage={handleSendMessage}
					onKeyPress={
						handleKeyPress as (e: React.KeyboardEvent<Element>) => void
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
