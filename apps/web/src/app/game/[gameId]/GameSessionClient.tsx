'use client'

import {
	ExtendedGamePlayer,
	ExtendedGameState,
	GameChatMessage,
} from '@station-eden/shared'
import { useCallback, useMemo } from 'react'
import GameChat from './components/GameChat'
import GameFooter from './components/GameFooter'
import GameHeader from './components/GameHeader'
import GamePhasePanel from './components/GamePhasePanel'
import { useGameSession } from './components/hooks/useGameSession'
import CardsTableModal from './components/modals/CardsTableModal'
import CrisisModal from './components/modals/CrisisModal'
import GameResultsModal from './components/modals/GameResultsModal'
import MyCardsModal from './components/modals/MyCardsModal'
import RevealedPlayerModal from './components/modals/RevealedPlayerModal'
import PlayersPanel from './components/PlayersPanel'
import LoadingScreen from './components/screens/LoadingScreen'
import NarrationScreen from './components/screens/NarrationScreen'
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
		handleSkipNarration,
		handleStartDiscussion,
		handleRevealCard,
		handleVote,
		handleSolveCrisis,
		handleCloseCrisis,
		handleLeaveGame,
	} = useGameSession(gameId)

	// Нормализация myAllRevealedCards для разных компонентов
	const myAllRevealedCardIds = useMemo((): string[] => {
		if (!myAllRevealedCards) return []
		if (Array.isArray(myAllRevealedCards)) {
			// Если массив объектов, извлекаем id (если есть) или name
			return myAllRevealedCards.map(card => (card as any).id ?? card.name)
		} else {
			// Если объект, ключи — это ID карт
			return Object.keys(myAllRevealedCards)
		}
	}, [myAllRevealedCards])

	const myAllRevealedCardsObject = useMemo((): Record<
		string,
		{ name: string; type: string }
	> => {
		if (!myAllRevealedCards) return {}
		if (Array.isArray(myAllRevealedCards)) {
			// Преобразуем массив объектов в Record по id (или name)
			return myAllRevealedCards.reduce(
				(acc, card) => {
					const key = (card as any).id ?? card.name
					acc[key] = { name: card.name, type: card.type }
					return acc
				},
				{} as Record<string, { name: string; type: string }>,
			)
		} else {
			// Уже объект
			return myAllRevealedCards
		}
	}, [myAllRevealedCards])

	// Обработчик скролла чата (заглушка) – теперь без параметров, как требует GameChat
	const handleChatScroll = useCallback(() => {
		// Здесь можно реализовать подгрузку истории при скролле, если потребуется
	}, [])

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
			<WaitingRoom
				gameState={gameState}
				gameId={gameId}
				userId={userId}
				isConnected={isConnected}
				onStartGame={handleStartGame}
				onLeaveGame={handleLeaveGame}
			/>
		)
	}

	const players = (gameState.players || []) as ExtendedGamePlayer[]
	const currentPlayer = userId ? players.find(p => p.id === userId) : undefined
	const alivePlayers = players.filter(p => p.isAlive)
	const phaseDurationDisplay = getPhaseDuration(gameState, phaseTimeLeft)

	return (
		<div className={styles.container}>
			{narration && (
				<NarrationScreen
					narration={narration}
					phaseTimeLeft={phaseTimeLeft}
					canSkipNarration={canSkipNarration}
					onSkip={handleSkipNarration}
				/>
			)}

			{showMyCards && (
				<MyCardsModal
					myCards={myCards}
					cardsReceivedThisRound={cardsReceivedThisRound}
					myRevealedCardsThisRound={myRevealedCardsThisRound}
					myAllRevealedCards={myAllRevealedCards}
					newCardsThisRound={newCardsThisRound}
					gameState={gameState}
					userId={userId}
					onClose={() => setShowMyCards(false)}
					onRevealCard={handleRevealCard}
				/>
			)}

			{showCardsTable && (
				<CardsTableModal
					allPlayersCards={allPlayersCards}
					myCards={myCards}
					userId={userId}
					onClose={() => setShowCardsTable(false)}
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
				onLeaveGame={handleLeaveGame}
			/>

			<main className={styles.mainContent}>
				<PlayersPanel
					gameState={gameState}
					userId={userId}
					gamePhase={gameState.phase as string}
					currentPlayer={currentPlayer}
					onVote={handleVote}
					onShowMyCards={() => setShowMyCards(true)}
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
					myAllRevealedCards={myAllRevealedCardIds} // передаём string[]
					revealingCards={revealingCards}
					currentRevealIndex={currentRevealIndex}
					isRevealing={isRevealing}
					revealedPlayer={revealedPlayer}
					onShowMyCards={() => setShowMyCards(true)}
					onShowCardsTable={() => setShowCardsTable(true)}
					onStartDiscussion={handleStartDiscussion}
					onVote={handleVote}
					onSolveCrisis={handleSolveCrisis}
					onSetActiveCrisis={setActiveCrisis}
				/>

				<GameChat
					gameId={gameId}
					messages={chatMessages as GameChatMessage[]}
					newMessage={newMessage}
					onMessageChange={handleMessageChange}
					onSendMessage={handleSendMessage}
					onKeyPress={
						handleKeyPress as (e: React.KeyboardEvent<Element>) => void
					}
					onChatScroll={handleChatScroll} // теперь () => void
					disabled={!isConnected || gameState.phase === 'game_over'}
					currentUserId={userId}
				/>
			</main>

			<GameFooter
				gameState={gameState}
				currentPlayer={currentPlayer}
				myRevealedCardsThisRound={myRevealedCardsThisRound}
				myAllRevealedCards={myAllRevealedCardsObject} // передаём Record
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
	if (gameState.phase === 'voting') return 30
	if (gameState.phase === 'discussion' && phaseTimeLeft > 0) return 60
	if (gameState.phase === 'crisis') return 60
	return typeof gameState.phaseDuration === 'number'
		? gameState.phaseDuration
		: 180
}
