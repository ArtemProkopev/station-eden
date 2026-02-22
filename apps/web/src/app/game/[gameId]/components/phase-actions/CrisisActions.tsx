// apps/web/src/app/game/[gameId]/components/phase-actions/CrisisActions.tsx
import { CrisisInfo, ExtendedGamePlayer } from '@station-eden/shared'
import styles from '../../page.module.css'

interface CrisisActionsProps {
  currentCrisis?: CrisisInfo | null
  onViewCrisis: () => void
  onSolveCrisis: () => void
  currentPlayer?: ExtendedGamePlayer
}

export default function CrisisActions({ 
  currentCrisis, 
  onViewCrisis, 
  onSolveCrisis, 
  currentPlayer 
}: CrisisActionsProps) {
  return (
    <div className={styles.phaseActions}>
      <button
        className={styles.crisisActionButton}
        onClick={onViewCrisis}
      >
        Просмотреть кризис
      </button>

      <button
        className={styles.solveCrisisButton}
        onClick={onSolveCrisis}
        disabled={!currentPlayer?.isAlive}
      >
        Попытаться решить кризис
      </button>
    </div>
  )
}