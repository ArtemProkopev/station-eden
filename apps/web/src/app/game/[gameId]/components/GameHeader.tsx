// apps/web/src/app/game/[gameId]/components/GameHeader.tsx
import { GameState, GamePhase } from './types/game.types'
import { formatTime, getPhaseName } from './utils/game.utils'
import styles from '../page.module.css'

interface GameHeaderProps {
  gameState: GameState
  phaseTimeLeft: number
  myRevealedCardsThisRound: string[]
  userId?: string
  onLeaveGame: () => void
}

export default function GameHeader({ 
  gameState, 
  phaseTimeLeft, 
  myRevealedCardsThisRound, 
  userId, 
  onLeaveGame 
}: GameHeaderProps) {
  const currentPlayer = userId ? gameState.players?.find(p => p.id === userId) : null
  const alivePlayers = gameState.players?.filter(p => p.isAlive) || []

  return (
    <header className={styles.header}>
      <div className={styles.gameTitle}>
        <h1>Станция &quot;Эдем&quot;</h1>
        <div className={styles.gameSubtitle}>
          <span className={styles.round}>
            Раунд {Number(gameState.round || 1)}/{Number(gameState.maxRounds || 10)}
          </span>
          <span className={styles.phase}>
            Фаза: {getPhaseName(gameState.phase as GamePhase)}
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
            🚀 {Number(gameState.occupiedSlots || 0)}/
            {Number(
              gameState.capsuleSlots ||
                Math.floor(((gameState.players?.length || 0) as number) / 2),
            )}{' '}
            мест
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Выжило:</span>
          <span className={styles.statValue}>
            👥 {alivePlayers.length}/{gameState.players?.length || 0}
          </span>
        </div>
        {currentPlayer && (
          <>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Раскрыто:</span>
              <span className={styles.statValue}>
                🎴 {myRevealedCardsThisRound.length}/1
              </span>
            </div>
            {gameState.creatorId === userId && (
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Роль:</span>
                <span className={styles.statValue}>👑 Создатель</span>
              </div>
            )}
          </>
        )}
      </div>

      <button className={styles.leaveGameButton} onClick={onLeaveGame}>
        Покинуть игру
      </button>
    </header>
  )
}