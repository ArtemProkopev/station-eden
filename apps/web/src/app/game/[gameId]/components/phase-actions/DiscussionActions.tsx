// apps/web/src/app/game/[gameId]/components/phase-actions/DiscussionActions.tsx
import { ExtendedGamePlayer } from '@station-eden/shared'
import styles from './PhaseActions.module.css'

interface DiscussionActionsProps {
	onShowMyCards: () => void
	onShowCardsTable: () => void
	onRequestVote: () => void
	isCreator: boolean
	allPlayersRevealed: boolean
	isConnected: boolean
	voteTriggerCount: number
	requiredVotes: number
	hasRequestedVote: boolean
	alivePlayers?: ExtendedGamePlayer[]
	newCardsCount?: number
}

export default function DiscussionActions({
	onShowMyCards,
	onShowCardsTable,
	onRequestVote,
	isConnected,
	voteTriggerCount,
	requiredVotes,
	hasRequestedVote,
	allPlayersRevealed,
	alivePlayers,
	newCardsCount = 0,
}: DiscussionActionsProps) {
	const allPlayersHaveRevealed = alivePlayers
		? alivePlayers.every(player => (player.revealedCards ?? 0) > 0)
		: allPlayersRevealed

	const voteRequestDisabled =
		!isConnected || hasRequestedVote || !allPlayersHaveRevealed

	const voteHint = getVoteHint({
		isConnected,
		hasRequestedVote,
		allPlayersHaveRevealed,
		voteTriggerCount,
		requiredVotes,
	})

	return (
		<div className={styles.phaseActions}>
			<div className={styles.actionTilesGrid}>
				<button
					type='button'
					className={`${styles.actionTile} ${styles.actionTilePrimary}`}
					onClick={onShowMyCards}
				>
					<span className={styles.actionTileContent}>
						<strong>Мои карты</strong>
						<small>
							{newCardsCount > 0
								? `Новых данных: ${newCardsCount}`
								: 'Посмотреть личные данные'}
						</small>
					</span>

					{newCardsCount > 0 && (
						<span className={styles.newCardsBadge}>+{newCardsCount}</span>
					)}
				</button>

				<button
					type='button'
					className={`${styles.actionTile} ${styles.actionTileDanger}`}
					onClick={onRequestVote}
					disabled={voteRequestDisabled}
				>
					<span className={styles.actionTileContent}>
						<strong>
							{hasRequestedVote
								? 'Голосование запрошено'
								: 'Запросить голосование'}
						</strong>

						{voteHint && <small>{voteHint}</small>}
					</span>

					<span className={styles.actionTileCounter}>
						{voteTriggerCount}/{requiredVotes}
					</span>
				</button>

				<button
					type='button'
					className={styles.actionTile}
					onClick={onShowCardsTable}
				>
					<span className={styles.actionTileContent}>
						<strong>Карты экипажа</strong>
						<small>Посмотреть раскрытые данные</small>
					</span>
				</button>
			</div>

			{!allPlayersHaveRevealed && (
				<p className={styles.phaseHint}>
					Нужно, чтобы каждый игрок раскрыл хотя бы одну карту
				</p>
			)}
		</div>
	)
}

function getVoteHint({
	isConnected,
	hasRequestedVote,
	allPlayersHaveRevealed,
	voteTriggerCount,
	requiredVotes,
}: {
	isConnected: boolean
	hasRequestedVote: boolean
	allPlayersHaveRevealed: boolean
	voteTriggerCount: number
	requiredVotes: number
}): string {
	if (!isConnected) {
		return 'Нет соединения с сервером'
	}

	if (!allPlayersHaveRevealed) {
		return 'Ожидание раскрытия карт'
	}

	if (hasRequestedVote) {
		return `Запрос принят ${voteTriggerCount}/${requiredVotes}`
	}

	return ''
}
