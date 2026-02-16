// apps/web/src/app/game/[gameId]/components/phase-actions/DiscussionActions.tsx
import styles from '../../page.module.css'

interface DiscussionActionsProps {
  onShowMyCards: () => void
  onShowCardsTable: () => void
  onStartDiscussion: () => void
  isCreator: boolean
  allPlayersRevealed: boolean
  isConnected: boolean
  phaseTimeLeft: number
}

export default function DiscussionActions({
  onShowMyCards,
  onShowCardsTable,
  onStartDiscussion,
  isCreator,
  allPlayersRevealed,
  isConnected,
  phaseTimeLeft
}: DiscussionActionsProps) {
  return (
    <div className={styles.phaseActions}>
      <div className={styles.discussionActions}>
        <button
          className={styles.actionButton}
          onClick={onShowMyCards}
        >
          Мои карты
        </button>
        <button
          className={styles.tableButton}
          onClick={onShowCardsTable}
        >
          Общая таблица карт
        </button>

        {isCreator && allPlayersRevealed && (
          <button
            className={styles.startDiscussionButton}
            onClick={onStartDiscussion}
            disabled={!isConnected}
          >
            Начать общее обсуждение
          </button>
        )}

        {!allPlayersRevealed && isCreator && (
          <p className={styles.waitingText}>
            Ожидание раскрытия карт всеми игроками...
          </p>
        )}

        {allPlayersRevealed && !isCreator && (
          <p className={styles.waitingText}>
            Все карты раскрыты. Ожидайте начала общего обсуждения от
            создателя лобби.
          </p>
        )}
      </div>

      {phaseTimeLeft > 0 && (
        <div className={styles.discussionTimer}>
          <p>Общее обсуждение: {formatTime(phaseTimeLeft)}</p>
        </div>
      )}
    </div>
  )
}

// Вспомогательная функция
function formatTime(seconds: number) {
  const mins = Math.floor(Math.max(0, seconds) / 60)
  const secs = Math.max(0, seconds) % 60
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}