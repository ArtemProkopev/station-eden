// apps/web/src/app/game/[gameId]/components/phase-actions/CrisisActions.tsx
import { ExtendedGamePlayer } from '@station-eden/shared'
import styles from '../../page.module.css'

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
			<button className={styles.crisisActionButton} onClick={onViewCrisis}>
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
