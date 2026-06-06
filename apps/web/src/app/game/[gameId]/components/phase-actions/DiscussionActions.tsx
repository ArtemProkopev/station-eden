// apps/web/src/app/game/[gameId]/components/phase-actions/DiscussionActions.tsx
import styles from '../../page.module.css'
import { formatTime } from '../utils/game.utils'

interface DiscussionActionsProps {
	onShowMyCards: () => void
	onShowCardsTable: () => void
	onRequestVote: () => void
	isCreator: boolean
	allPlayersRevealed: boolean
	isConnected: boolean
	phaseTimeLeft: number
	voteTriggerCount: number
	requiredVotes: number
	hasRequestedVote: boolean
}

export default function DiscussionActions({
	onShowMyCards,
	onShowCardsTable,
	onRequestVote,
	isConnected,
	phaseTimeLeft,
	voteTriggerCount,
	requiredVotes,
	hasRequestedVote,
}: DiscussionActionsProps) {
	return (
		<div className={styles.phaseActions}>
			<div className={styles.discussionActions}>
				<button className={styles.actionButton} onClick={onShowMyCards}>
					Мои карты
				</button>

				<button
					className={styles.startDiscussionButton}
					onClick={onRequestVote}
					disabled={!isConnected || hasRequestedVote}
				>
					{hasRequestedVote ? 'Голосование запрошено' : 'Запросить голосование'}
				</button>

				<p className={styles.waitingText}>
					Запросов на голосование: {voteTriggerCount}/{requiredVotes}
				</p>
			</div>

			{phaseTimeLeft > 0 && (
				<div className={styles.discussionTimer}>
					<p>Обсуждение: {formatTime(phaseTimeLeft)}</p>
				</div>
			)}
		</div>
	)
}