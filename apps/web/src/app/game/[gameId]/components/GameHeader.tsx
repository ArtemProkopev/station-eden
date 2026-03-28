// apps/web/src/app/game/[gameId]/components/GameHeader.tsx
import { ExtendedGameState, GamePhase, ExtendedGamePlayer } from '@station-eden/shared'
import { formatTime, getPhaseName } from './utils/game.utils'
import styles from '../page.module.css'

interface GameHeaderProps {
  gameState: ExtendedGameState
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
  const players = (gameState.players || []) as ExtendedGamePlayer[]
  const currentPlayer = userId ? players.find(p => p.id === userId) : undefined
  const alivePlayers = players.filter(p => p.isAlive === true)

  return (
    <header className={styles.header}>
      <div className={styles.gameTitle}>
        <h1>Станция "Эдем"</h1>
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
            {formatTime(phaseTimeLeft)}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Капсула:</span>
          <span className={styles.statValue}>
            {Number(gameState.occupiedSlots || 0)}/
            {Number(
              gameState.capsuleSlots ||
                Math.floor((players.length) / 2),
            )}{' '}
            мест
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Выжило:</span>
          <span className={styles.statValue}>
            {alivePlayers.length}/{players.length}
          </span>
        </div>
        {currentPlayer && (
          <>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Раскрыто:</span>
              <span className={styles.statValue}>
                {myRevealedCardsThisRound.length}/1
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