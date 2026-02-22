// apps/web/src/app/game/[gameId]/components/modals/CrisisModal.tsx
import { CrisisInfo, ExtendedGamePlayer } from '@station-eden/shared'
import { formatTime } from '../utils/game.utils'
import styles from '../../page.module.css'

interface CrisisModalProps {
  crisis: CrisisInfo
  phaseTimeLeft: number
  currentPlayer?: ExtendedGamePlayer
  isConnected: boolean
  onSolve: () => void
  onClose: () => void
}

export default function CrisisModal({ 
  crisis, 
  phaseTimeLeft, 
  currentPlayer, 
  isConnected, 
  onSolve, 
  onClose 
}: CrisisModalProps) {
  const canSolveCrisis =
    Boolean(currentPlayer?.profession) &&
    Boolean(
      crisis?.priorityProfessions?.includes(
        String(currentPlayer?.profession),
      )
    )

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.crisisAlert}>
          <h2>КРИЗИС</h2>
          <h3>{crisis?.name}</h3>
          <p>{crisis?.description}</p>

          <div className={styles.crisisInfo}>
            <p>
              <strong>Тип:</strong>{' '}
              {crisis?.type === 'technological'
                ? 'Технологический'
                : crisis?.type === 'biological'
                  ? 'Биологический'
                  : 'Внешняя угроза'}
            </p>
            <p>
              <strong>Штраф:</strong> {crisis?.penalty}
            </p>
            <p>
              <strong>Приоритетные профессии:</strong>{' '}
              {crisis?.priorityProfessions?.join(', ') || 'Все'}
            </p>
            <p>
              <strong>Ваша профессия:</strong>{' '}
              {currentPlayer?.profession || 'Неизвестно'}
            </p>
            <p>
              <strong>Время на решение:</strong> {formatTime(phaseTimeLeft)}
            </p>
          </div>

          <div className={styles.crisisActions}>
            {canSolveCrisis ? (
              <button
                className={styles.solveButton}
                onClick={onSolve}
                disabled={!isConnected}
              >
                Решить кризис
              </button>
            ) : (
              <div className={styles.cannotSolve}>
                <p className={styles.cannotSolveText}>
                  Ваша профессия &quot;{currentPlayer?.profession || 'Неизвестно'}&quot; не может
                  решить этот кризис.
                </p>
                <p className={styles.cannotSolveHint}>
                  Ждите игрока с подходящей профессией:{' '}
                  {crisis?.priorityProfessions?.join(', ')}
                </p>
              </div>
            )}
            <button className={styles.closeCrisisButton} onClick={onClose}>
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}