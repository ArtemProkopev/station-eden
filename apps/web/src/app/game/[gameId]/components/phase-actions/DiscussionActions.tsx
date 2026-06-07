// apps/web/src/app/game/[gameId]/components/phase-actions/DiscussionActions.tsx
import { ExtendedGamePlayer } from '@station-eden/shared'
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
	alivePlayers?: ExtendedGamePlayer[]
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
	allPlayersRevealed,
	alivePlayers,
}: DiscussionActionsProps) {
	// Проверяем, все ли игроки раскрыли хотя бы одну карту
	const allPlayersHaveRevealed = alivePlayers 
		? alivePlayers.every(player => (player.revealedCards ?? 0) > 0)
		: allPlayersRevealed

	const canRequestVote = isConnected && !hasRequestedVote && allPlayersHaveRevealed
	const voteRequestDisabled = !isConnected || hasRequestedVote || !allPlayersHaveRevealed

	return (
		<div className={styles.phaseActions}>
			<div className={styles.discussionActions}>
				<button 
					className={styles.actionButton} 
					onClick={onShowMyCards}
					style={{ display: 'block', margin: '0 auto', width: '200px' }}
				>
					Мои карты
				</button>

				<div className={styles.voteRequestContainer}>
					<button
						className={`${styles.voteRequestButton} ${canRequestVote ? styles.voteRequestButtonActive : ''}`}
						onClick={onRequestVote}
						disabled={voteRequestDisabled}
					>
						{!allPlayersHaveRevealed 
							? 'Ожидание раскрытия карт...' 
							: hasRequestedVote 
								? 'Голосование запрошено'
								: 'Запросить голосование'}
					</button>
					
					{!allPlayersHaveRevealed && (
						<p className={styles.waitingHint}>
							Нужно, чтобы каждый игрок раскрыл хотя бы одну карту
						</p>
					)}
				</div>

				<div className={styles.voteProgress}>
					<p className={styles.waitingText}>
						Запросов на голосование: {voteTriggerCount}/{requiredVotes}
					</p>
					{phaseTimeLeft > 0 && (
						<p className={styles.timerHint}>
							Осталось времени: {formatTime(phaseTimeLeft)}
						</p>
					)}
				</div>
			</div>
		</div>
	)
}