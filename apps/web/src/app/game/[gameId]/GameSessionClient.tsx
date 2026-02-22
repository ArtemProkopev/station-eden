// apps/web/src/app/game/[gameId]/GameSessionClient.tsx
'use client'

import { useGameSession } from './components/hooks/useGameSession'
import GameHeader from './components/GameHeader'
import GameFooter from './components/GameFooter'
import PlayersPanel from './components/PlayersPanel'
import GamePhasePanel from './components/GamePhasePanel'
import ChatSection from './components/ChatSection'
import NarrationScreen from './components/screens/NarrationScreen'
import WaitingRoom from './components/screens/WaitingRoom'
import LoadingScreen from './components/screens/LoadingScreen'
import MyCardsModal from './components/modals/MyCardsModal'
import CardsTableModal from './components/modals/CardsTableModal'
import RevealedPlayerModal from './components/modals/RevealedPlayerModal'
import CrisisModal from './components/modals/CrisisModal'
import GameResultsModal from './components/modals/GameResultsModal'
import { GameState, GamePlayer } from './components/types/game.types' 
import styles from './page.module.css'

type Props = {
  gameId: string
}

export default function GameSessionClient({ gameId }: Props) {
  const {
    // Состояния
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
    newCardsThisRound,
    
    // Состояния раскрытия
    revealingCards,
    revealedCards,
    currentRevealIndex,
    isRevealing,
    revealedPlayer,
    
    // Чат
    chatMessages,
    newMessage,
    chatContainerRef,
    
    // Профиль
    userId,
    username,
    profile,
    isConnected,
    
    // Сеттеры
    setShowMyCards,
    setShowCardsTable,
    setActiveCrisis,
    setGameResults,
    setRevealedPlayer,
    resetReveal,
    
    // Обработчики
    handleSendMessage,
    handleKeyPress,
    handleMessageChange,
    handleStartGame,
    handleSkipNarration,
    handleStartDiscussion,
    handleRevealCard,
    handleVote,
    handleRequestVote,
    handleUseAbility,
    handleSolveCrisis,
    handleCloseCrisis,
    handleLeaveGame,
    setSelectedVote,
    addToChat,
  } = useGameSession(gameId)

  if (!gameState) {
    return (
      <LoadingScreen
        isConnected={isConnected}
        profile={profile}
        gameId={gameId}
        onRetryJoin={() => {}}
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

  const currentPlayer = userId ? gameState.players?.find((p: GamePlayer) => p.id === userId) : undefined
  const alivePlayers = gameState.players?.filter((p: GamePlayer) => p.isAlive) || []
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
          myAllRevealedCards={myAllRevealedCards}
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

        <ChatSection
          chatMessages={chatMessages}
          newMessage={newMessage}
          chatContainerRef={chatContainerRef}
          isConnected={isConnected}
          gameState={gameState}
          profile={profile}
          userId={userId}
          onMessageChange={handleMessageChange}
          onSendMessage={handleSendMessage}
          onKeyPress={handleKeyPress}
        />
      </main>

      <GameFooter
        gameState={gameState}
        currentPlayer={currentPlayer}
        myRevealedCardsThisRound={myRevealedCardsThisRound}
        myAllRevealedCards={myAllRevealedCards}
        alivePlayers={alivePlayers}
        onShowCardsTable={() => setShowCardsTable(true)}
      />
    </div>
  )
}

// Вспомогательная функция с типами
function getPhaseDuration(gameState: GameState, phaseTimeLeft: number): number {
  if (gameState.phase === 'voting') {
    return 30
  } else if (gameState.phase === 'discussion' && phaseTimeLeft > 0) {
    return 60
  } else if (gameState.phase === 'crisis') {
    return 60
  } else {
    return typeof gameState.phaseDuration === 'number' ? gameState.phaseDuration : 180
  }
}