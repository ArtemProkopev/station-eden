// apps/web/src/app/game/[gameId]/components/phase-actions/PreparationActions.tsx
import styles from '../../page.module.css'

interface PreparationActionsProps {
  onShowMyCards: () => void
  onShowCardsTable: () => void
}

export default function PreparationActions({ onShowMyCards, onShowCardsTable }: PreparationActionsProps) {
  return (
    <div className={styles.phaseActions}>
      <button className={styles.actionButton} onClick={onShowMyCards}>
        Просмотреть свои карты
      </button>
      <button className={styles.tableButton} onClick={onShowCardsTable}>
        Общая таблица карт
      </button>
      <p className={styles.phaseHint}>
        Изучите свои карты и подготовьтесь к обсуждению
      </p>
    </div>
  )
}