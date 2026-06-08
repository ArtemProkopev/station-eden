// apps/web/src/app/game/[gameId]/components/phase-actions/GameOverActions.tsx
import styles from './PhaseActions.module.css'

interface GameOverActionsProps {
	onLeaveGame: () => void
}

export default function GameOverActions({ onLeaveGame }: GameOverActionsProps) {
	return (
		<div className={styles.phaseActions}>
			<button
				type='button'
				className={`${styles.actionTile} ${styles.actionTileDanger} ${styles.leaveActionTile}`}
				onClick={onLeaveGame}
			>
				<span className={styles.actionTileContent}>
					<strong>Выйти из игры</strong>
					<small>Покинуть завершённую сессию</small>
				</span>
			</button>
		</div>
	)
}
