// apps/web/src/app/game/[gameId]/components/GamePhasePanel.tsx
import { GameState, GamePhase, GamePlayer, CrisisInfo, RevealedPlayer } from './types/game.types'
import { formatTime, getPhaseName, getPhaseDescription } from './utils/game.utils'
import styles from '../page.module.css'
import PreparationActions from './phase-actions/PreparationActions'
import DiscussionActions from './phase-actions/DiscussionActions'
import VotingActions from './phase-actions/VotingActions'
import RevealActions from './phase-actions/RevealActions'
import CrisisActions from './phase-actions/CrisisActions'
import GameOverActions from './phase-actions/GameOverActions'

interface GamePhasePanelProps {
  gameState: GameState
  phaseTimeLeft: number
  phaseDurationDisplay: number
  userId?: string
  currentPlayer?: GamePlayer
  alivePlayers: GamePlayer[]
  myRevealedCardsThisRound: string[]
  myAllRevealedCards: Record<string, { name: string; type: string }>
  revealingCards: string[]
  currentRevealIndex: number
  isRevealing: boolean
  revealedPlayer: RevealedPlayer
  onShowMyCards: () => void
  onShowCardsTable: () => void
  onStartDiscussion: () => void
  onRevealCard: (cardType: any) => void
  onVote: (targetPlayerId: string) => void
  onRequestVote: () => void
  onUseAbility: (ability: string, targetPlayerId?: string) => void
  onSolveCrisis: () => void
  onSetActiveCrisis: (crisis: CrisisInfo | null) => void
}

export default function GamePhasePanel({
  gameState,
  phaseTimeLeft,
  phaseDurationDisplay,
  userId,
  currentPlayer,
  alivePlayers,
  myRevealedCardsThisRound,
  myAllRevealedCards,
  revealingCards,
  currentRevealIndex,
  isRevealing,
  revealedPlayer,
  onShowMyCards,
  onShowCardsTable,
  onStartDiscussion,
  onRevealCard,
  onVote,
  onRequestVote,
  onUseAbility,
  onSolveCrisis,
  onSetActiveCrisis
}: GamePhasePanelProps) {
  const phase = gameState.phase as GamePhase
  const isCreator = userId === gameState.creatorId
  const allPlayersRevealed = alivePlayers.every(
    player => player.revealedCards && player.revealedCards > 0
  )

  const renderPhaseActions = () => {
    switch (phase) {
      case 'preparation':
        return (
          <PreparationActions
            onShowMyCards={onShowMyCards}
            onShowCardsTable={onShowCardsTable}
          />
        )

      case 'discussion':
        return (
          <DiscussionActions
            onShowMyCards={onShowMyCards}
            onShowCardsTable={onShowCardsTable}
            onStartDiscussion={onStartDiscussion}
            isCreator={isCreator}
            allPlayersRevealed={allPlayersRevealed}
            isConnected={true}
            phaseTimeLeft={phaseTimeLeft}
          />
        )

      case 'voting':
        return (
          <VotingActions
            phaseTimeLeft={phaseTimeLeft}
            alivePlayers={alivePlayers}
            userId={userId}
            currentPlayer={currentPlayer}
            onVote={onVote}
          />
        )

      case 'reveal':
        return (
          <RevealActions
            revealedPlayer={revealedPlayer}
            revealingCards={revealingCards}
            currentRevealIndex={currentRevealIndex}
            isRevealing={isRevealing}
          />
        )

      case 'crisis':
        return (
          <CrisisActions
            currentCrisis={gameState.currentCrisis}
            onViewCrisis={() => onSetActiveCrisis(gameState.currentCrisis || null)}
            onSolveCrisis={onSolveCrisis}
            currentPlayer={currentPlayer}
          />
        )

      case 'game_over':
        return <GameOverActions onLeaveGame={() => {}} />

      default:
        return (
          <div className={styles.phaseActions}>
            <button
              className={styles.tableButton}
              onClick={onShowCardsTable}
            >
              Общая таблица карт
            </button>
            <p className={styles.phaseHint}>
              {getPhaseDescription(phase)}
            </p>
          </div>
        )
    }
  }

  return (
    <section className={styles.gamePanel}>
      <div className={styles.phaseInfo}>
        <h2>{getPhaseName(phase)}</h2>
        <p className={styles.phaseDescription}>
          {getPhaseDescription(phase)}
        </p>
        {(phase === 'voting' || phase === 'discussion' || phase === 'crisis' || phase === 'introduction') &&
          phaseTimeLeft > 0 && (
            <div className={styles.phaseTimer}>
              <div className={styles.timerBar}>
                <div
                  className={styles.timerProgress}
                  style={{
                    width: `${Math.min(
                      100,
                      (phaseTimeLeft / phaseDurationDisplay) * 100,
                    )}%`,
                  }}
                ></div>
              </div>
              <span className={styles.timerText}>
                {formatTime(phaseTimeLeft)} / {formatTime(phaseDurationDisplay)}
              </span>
            </div>
          )}
      </div>

      <div className={styles.gameActions}>
        {renderPhaseActions()}
      </div>
    </section>
  )
}