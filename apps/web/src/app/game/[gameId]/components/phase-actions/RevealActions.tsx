// apps/web/src/app/game/[gameId]/components/phase-actions/RevealActions.tsx
import { RevealedPlayer } from '@station-eden/shared'
import { getCardTypeDisplayName } from '../utils/game.utils'
import styles from './PhaseActions.module.css'

interface RevealActionsProps {
	revealedPlayer: RevealedPlayer
	revealingCards: string[]
	currentRevealIndex: number
	isRevealing: boolean
}

export default function RevealActions({
	revealedPlayer,
	revealingCards,
	currentRevealIndex,
	isRevealing,
}: RevealActionsProps) {
	return (
		<div className={styles.phaseActions}>
			<div className={styles.revealPhaseInfo}>
				<span className={styles.revealEyebrow}>Раскрытие данных</span>

				<h3>Карты выбывшего игрока</h3>

				<p>Система раскрывает данные по очереди</p>

				{revealedPlayer && (
					<div className={styles.currentReveal}>
						<p>
							Игрок: <strong>{revealedPlayer.name}</strong>
						</p>

						{isRevealing && (
							<p>
								Карта {currentRevealIndex} из {revealingCards.length}:{' '}
								<span className={styles.currentCard}>
									{getCardTypeDisplayName(
										revealingCards[currentRevealIndex] || '',
									)}
								</span>
							</p>
						)}
					</div>
				)}
			</div>
		</div>
	)
}
