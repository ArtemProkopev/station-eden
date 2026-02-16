// apps/web/src/app/game/[gameId]/components/phase-actions/GameOverActions.tsx
import styles from '../../page.module.css'

interface GameOverActionsProps {
  onLeaveGame: () => void
}

export default function GameOverActions({ onLeaveGame }: GameOverActionsProps) {
  return (
    <div className={styles.phaseActions}>
      <button className={styles.leaveButton} onClick={onLeaveGame}>
        Выйти из игры
      </button>
    </div>
  )
}