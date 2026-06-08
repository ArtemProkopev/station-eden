// apps/web/src/app/game/[gameId]/components/phase-actions/VotingActions.tsx
import { ExtendedGamePlayer } from '@station-eden/shared'
import styles from './PhaseActions.module.css'

interface VotingActionsProps {
	alivePlayers: ExtendedGamePlayer[]
	userId?: string
	currentPlayer?: ExtendedGamePlayer
	onVote: (targetPlayerId: string) => void
}

export default function VotingActions({
	alivePlayers,
	userId,
	currentPlayer,
	onVote,
}: VotingActionsProps) {
	const availablePlayers = alivePlayers.filter(player => player.id !== userId)

	return (
		<div className={styles.phaseActions}>
			<div className={styles.votingHeader}>
				<h3>Голосование за исключение</h3>
			</div>

			<div className={styles.votingGrid}>
				{availablePlayers.map(player => (
					<VoteOption
						key={player.id}
						player={player}
						currentPlayer={currentPlayer}
						onVote={onVote}
					/>
				))}
			</div>
		</div>
	)
}

interface VoteOptionProps {
	player: ExtendedGamePlayer
	currentPlayer?: ExtendedGamePlayer
	onVote: (targetPlayerId: string) => void
}

function VoteOption({ player, currentPlayer, onVote }: VoteOptionProps) {
	const isSelected = currentPlayer?.vote === player.id
	const isDisabled = !currentPlayer?.isAlive || Boolean(currentPlayer?.vote)

	return (
		<button
			type='button'
			className={`${styles.voteOption} ${isSelected ? styles.selected : ''}`}
			onClick={() => onVote(player.id)}
			disabled={isDisabled}
		>
			<span className={styles.votePlayerInfo}>
				<strong className={styles.votePlayerName}>{player.name}</strong>
				<small>{isSelected ? 'Цель выбрана' : 'Выбрать цель'}</small>
			</span>

			<span className={styles.voteCount}>
				<span>Голосов</span>
				<strong>{player.votesAgainst || 0}</strong>
			</span>
		</button>
	)
}
