// apps/web/src/app/game/[gameId]/components/modals/GameResultsModal.tsx
import styles from './GameModal.module.css'

interface GameResults {
	winners: string[]
	reason?: string
	scores?: unknown
	finalScores?: Array<{
		id: string
		name: string
		score: number
		survived: boolean
		role: string
	}>
}

interface GameResultsModalProps {
	gameResults: GameResults
	onLeaveGame: () => void
}

export default function GameResultsModal({
	gameResults,
	onLeaveGame,
}: GameResultsModalProps) {
	return (
		<div className={styles.modalOverlay}>
			<section className={styles.modalContent} role='dialog' aria-modal='true'>
				<div className={styles.modalHeader}>
					<div>
						<span className={styles.modalEyebrow}>Сессия завершена</span>
						<h2>Итоги игры</h2>
						{gameResults.reason && <p>{getReasonText(gameResults.reason)}</p>}
					</div>
				</div>

				<div className={styles.modalBody}>
					{gameResults.finalScores && gameResults.finalScores.length > 0 && (
						<>
							<h3 className={styles.sectionTitle}>Результаты экипажа</h3>

							<div className={styles.scoresList}>
								{gameResults.finalScores.map(player => (
									<div key={player.id} className={styles.scoreRow}>
										<span className={styles.playerName}>{player.name}</span>
										<span className={styles.playerRole}>{player.role}</span>
										<span className={styles.playerScore}>
											{player.score} очков
										</span>
										{player.survived && (
											<span className={styles.survivedBadge}>Выжил</span>
										)}
									</div>
								))}
							</div>
						</>
					)}

					{gameResults.winners && gameResults.winners.length > 0 && (
						<>
							<h3 className={styles.sectionTitle}>Победители</h3>

							<div className={styles.winnersList}>
								{gameResults.winners.map((winner, index) => (
									<div key={index} className={styles.winnerItem}>
										<span className={styles.winnerName}>{winner}</span>
									</div>
								))}
							</div>
						</>
					)}
				</div>

				<div className={styles.modalActions}>
					<button
						type='button'
						className={styles.dangerButton}
						onClick={onLeaveGame}
					>
						Выйти из игры
					</button>
				</div>
			</section>
		</div>
	)
}

function getReasonText(reason: string): string {
	switch (reason) {
		case 'capsule_full':
			return 'Капсула спасения отправлена'

		case 'hidden_role_win':
			return 'Скрытые роли победили'

		case 'round_limit':
			return 'Достигнут лимит раундов'

		case 'cancelled_by_creator':
			return 'Игра отменена создателем'

		default:
			return reason
	}
}
