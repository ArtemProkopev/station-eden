// apps/web/src/app/game/[gameId]/components/phase-actions/CrisisActions.tsx
import { ExtendedGamePlayer } from '@station-eden/shared'
import styles from './PhaseActions.module.css'

interface CrisisActionsProps {
	onViewCrisis: () => void
	onSolveCrisis: () => void
	currentPlayer?: ExtendedGamePlayer
}

export default function CrisisActions({
	onViewCrisis,
	onSolveCrisis,
	currentPlayer,
}: CrisisActionsProps) {
	return (
		<div className={styles.phaseActions}>
			<div className={styles.actionTilesGrid}>
				<button
					type='button'
					className={`${styles.actionTile} ${styles.actionTileDanger}`}
					onClick={onViewCrisis}
				>
					<span className={styles.actionTileContent}>
						<strong>Просмотреть кризис</strong>
						<small>Открыть данные угрозы</small>
					</span>
				</button>

				<button
					type='button'
					className={`${styles.actionTile} ${styles.actionTileAccent}`}
					onClick={onSolveCrisis}
					disabled={!currentPlayer?.isAlive}
				>
					<span className={styles.actionTileContent}>
						<strong>Решить кризис</strong>
						<small>
							{currentPlayer?.isAlive
								? 'Попытаться стабилизировать станцию'
								: 'Недоступно для выбывшего игрока'}
						</small>
					</span>
				</button>
			</div>

			<p className={styles.phaseHint}>
				Проверьте требования кризиса перед попыткой решения
			</p>
		</div>
	)
}
