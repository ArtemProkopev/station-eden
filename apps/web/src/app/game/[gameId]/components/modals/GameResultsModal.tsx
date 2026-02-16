// apps/web/src/app/game/[gameId]/components/modals/GameResultsModal.tsx
import { GameResults } from '../types/game.types'
import styles from '../../page.module.css'

interface GameResultsModalProps {
  gameResults: GameResults
  onLeaveGame: () => void
}

export default function GameResultsModal({ gameResults, onLeaveGame }: GameResultsModalProps) {
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.resultsContent}>
          <h2>🎉 Игра завершена! 🎉</h2>

          <div className={styles.resultsActions}>
            <button className={styles.leaveButton} onClick={onLeaveGame}>
              Выйти из игры
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}