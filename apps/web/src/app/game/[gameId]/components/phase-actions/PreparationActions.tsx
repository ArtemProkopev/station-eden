// apps/web/src/app/game/[gameId]/components/phase-actions/PreparationActions.tsx
import styles from './PhaseActions.module.css'

interface PreparationActionsProps {
	onShowMyCards: () => void
	onShowCardsTable: () => void
	onStartDiscussion: () => void
	isCreator: boolean
	allPlayersRevealed: boolean
	newCardsCount?: number
}

export default function PreparationActions({
	onShowMyCards,
	onShowCardsTable,
	onStartDiscussion,
	isCreator,
	allPlayersRevealed,
	newCardsCount = 0,
}: PreparationActionsProps) {
	const canStartDiscussion = isCreator && allPlayersRevealed

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
					className={styles.actionTile}
					onClick={onShowCardsTable}
				>
					<span className={styles.actionTileContent}>
						<strong>Карты экипажа</strong>
						<small>Посмотреть раскрытые данные</small>
					</span>
				</button>

				{isCreator && (
					<button
						type='button'
						className={`${styles.actionTile} ${styles.actionTileAccent}`}
						onClick={onStartDiscussion}
						disabled={!canStartDiscussion}
					>
						<span className={styles.actionTileContent}>
							<strong>Начать обсуждение</strong>
							<small>
								{allPlayersRevealed
									? 'Открыть канал связи'
									: 'Ожидание раскрытия карт'}
							</small>
						</span>
					</button>
				)}
			</div>

			<p className={styles.phaseHint}>
				Изучите карты и подготовьтесь к обсуждению
			</p>
		</div>
	)
}
