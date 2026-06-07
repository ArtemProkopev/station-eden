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

  const getCrisisHelp = () => {
    switch (crisis?.type) {
      case 'technological':
        return 'Требуется инженер для ремонта систем станции'
      case 'biological':
        return 'Требуется медик или биолог для лечения экипажа'
      case 'external':
        return 'Требуется специалист по связи или пилот для навигации'
      default:
        return 'Требуется специалист с соответствующей профессией'
    }
  }

  const getCrisisTypeName = () => {
    switch (crisis?.type) {
      case 'technological':
        return 'Технологический кризис'
      case 'biological':
        return 'Биологический кризис'
      case 'external':
        return 'Внешняя угроза'
      default:
        return 'Кризис'
    }
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.crisisAlert}>
          <h2>КРИЗИС</h2>
          <h3>{crisis?.name}</h3>
          <p>{crisis?.description}</p>

          <div className={styles.crisisInfo}>
            <p>
              <strong>Тип кризиса:</strong> {getCrisisTypeName()}
            </p>
            <p>
              <strong>Что нужно делать?</strong>
            </p>
            <p className={styles.crisisHelp}>
              {getCrisisHelp()}
            </p>
            <p>
              <strong>Штраф за нерешение:</strong> {crisis?.penalty}
            </p>
            <p>
              <strong>Кто может решить:</strong>{' '}
              {crisis?.priorityProfessions?.map(prof => {
                const profNames: Record<string, string> = {
                  'prof_engineer': 'Инженер',
                  'prof_astrobiologist': 'Астробиолог',
                  'prof_pilot': 'Пилот',
                  'prof_surgeon': 'Хирург',
                  'prof_linguist': 'Лингвист',
                  'prof_security': 'Офицер безопасности'
                }
                return profNames[prof] || prof
              }).join(', ') || 'Любой игрок'}
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
                  Ваша профессия "{currentPlayer?.profession || 'Неизвестно'}" не может решить этот кризис.
                </p>
                <p className={styles.cannotSolveHint}>
                  Ждите игрока с подходящей профессией: {crisis?.priorityProfessions?.map(prof => {
                    const profNames: Record<string, string> = {
                      'prof_engineer': 'Инженер',
                      'prof_astrobiologist': 'Астробиолог',
                      'prof_pilot': 'Пилот',
                      'prof_surgeon': 'Хирург',
                      'prof_linguist': 'Лингвист',
                      'prof_security': 'Офицер безопасности'
                    }
                    return profNames[prof] || prof
                  }).join(', ')}
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