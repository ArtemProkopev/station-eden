// apps/web/src/app/game/[gameId]/components/modals/GameResultsModal.tsx
import styles from '../../page.module.css'

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
	const getReasonText = () => {
		switch (gameResults.reason) {
			case 'capsule_full':
				return 'Капсула спасения отправлена!'
			case 'hidden_role_win':
				return 'Скрытые роли победили!'
			case 'round_limit':
				return 'Достигнут лимит раундов!'
			case 'cancelled_by_creator':
				return 'Игра была отменена создателем'
			default:
				return gameResults.reason
		}
	}

	return (
		<div className={styles.modalOverlay}>
			<div className={styles.modalContent}>
				<div className={styles.resultsContent}>
					<h2>Игра завершена!</h2>

					{gameResults.reason && (
						<p className={styles.resultReason}>
							{getReasonText()}
						</p>
					)}

					{gameResults.finalScores && gameResults.finalScores.length > 0 && (
						<div className={styles.finalScores}>
							<h3>Итоговые результаты:</h3>
							<div className={styles.scoresList}>
								{gameResults.finalScores.map(player => (
									<div key={player.id} className={styles.scoreRow}>
										<span className={styles.playerName}>{player.name}</span>
										<span className={styles.playerRole}>{player.role}</span>
										<span className={styles.playerScore}>{player.score} очков</span>
										{player.survived && (
											<span className={styles.survivedBadge}>Выжил</span>
										)}
									</div>
								))}
							</div>
						</div>
					)}

					{gameResults.winners && gameResults.winners.length > 0 && (
						<div className={styles.winnersList}>
							<h3>Победители:</h3>
							{gameResults.winners.map((winner, index) => (
								<div key={index} className={styles.winnerItem}>
									<span className={styles.winnerName}>{winner}</span>
								</div>
							))}
						</div>
					)}

					<div className={styles.resultsActions}>
						<button className={styles.leaveButton} onClick={onLeaveGame}>
							Выйти из игры
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}