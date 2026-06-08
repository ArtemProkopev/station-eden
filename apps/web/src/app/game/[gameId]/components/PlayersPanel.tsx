// apps/web/src/app/game/[gameId]/components/PlayersPanel.tsx
import { ExtendedGamePlayer, ExtendedGameState } from '@station-eden/shared'
import Image from 'next/image'
import styles from './PlayersPanel.module.css'

interface PlayersPanelProps {
	gameState: ExtendedGameState
	userId?: string
	gamePhase: string
	currentPlayer?: ExtendedGamePlayer
	onVote: (targetPlayerId: string) => void
	onShowMyCards: () => void
	onShowCardsTable: () => void
}

export default function PlayersPanel({
	gameState,
	userId,
	gamePhase,
	currentPlayer,
	onVote,
}: PlayersPanelProps) {
	const players = (gameState.players as ExtendedGamePlayer[]) || []
	const alivePlayers = players.filter(player => player.isAlive === true)
	const ejectedPlayers = players.filter(player => player.isAlive !== true)

	return (
		<section className={styles.playersPanel}>
			<div className={styles.panelHeader}>
				<h2>Экипаж станции</h2>

				<div className={styles.panelCounter}>
					<span>{alivePlayers.length}</span>
					<small>/ {players.length || 0}</small>
				</div>
			</div>

			<div className={styles.playersList}>
				{players.map((player, index) => (
					<PlayerCard
						key={player.id}
						index={index}
						player={player}
						userId={userId}
						gamePhase={gamePhase}
						creatorId={gameState.creatorId}
						currentPlayer={currentPlayer}
						onVote={onVote}
					/>
				))}
			</div>

			{ejectedPlayers.length > 0 && (
				<div className={styles.ejectedPlayers}>
					<div className={styles.ejectedHeader}>
						<span>Выбывшие</span>
						<strong>{ejectedPlayers.length}</strong>
					</div>

					<div className={styles.ejectedList}>
						{ejectedPlayers.map(player => (
							<span key={player.id} className={styles.ejectedPlayer}>
								{player.name}
							</span>
						))}
					</div>
				</div>
			)}
		</section>
	)
}

interface PlayerCardProps {
	index: number
	player: ExtendedGamePlayer
	userId?: string
	gamePhase: string
	creatorId?: string
	currentPlayer?: ExtendedGamePlayer
	onVote: (targetPlayerId: string) => void
}

function PlayerCard({
	index,
	player,
	userId,
	gamePhase,
	creatorId,
	currentPlayer,
	onVote,
}: PlayerCardProps) {
	const isAlive = player.isAlive === true
	const isMe = userId === player.id
	const isCreator = player.id === creatorId
	const hasVoted = currentPlayer?.vote === player.id
	const isCurrentPlayerAlive = currentPlayer?.isAlive === true
	const isVoteDisabled = !isCurrentPlayerAlive || Boolean(currentPlayer?.vote)

	const isProfessionRevealed =
		player.revealedCardsInfo?.profession !== undefined
	const hasRevealedThisRound =
		Array.isArray(player.revealedCardsThisRound) &&
		player.revealedCardsThisRound.length > 0

	const status = getPlayerStatus(player)
	const statusClassName = getStatusClassName(status.type)

	return (
		<article
			className={`${styles.playerCard} ${!isAlive ? styles.dead : ''} ${
				isMe ? styles.me : ''
			} ${player.isInfected ? styles.infectedState : ''} ${
				player.isSuspicious ? styles.suspiciousState : ''
			} ${hasVoted ? styles.votedForMe : ''}`}
		>
			<div className={styles.playerMain}>
				<div className={styles.playerNumber}>
					{String(index + 1).padStart(2, '0')}
				</div>

				<div className={styles.playerAvatar}>
					{player.avatar ? (
						<Image
							src={player.avatar}
							alt={player.name}
							width={34}
							height={34}
							sizes='34px'
						/>
					) : (
						<span>{player.name.charAt(0).toUpperCase()}</span>
					)}

					<span className={styles.avatarRing} aria-hidden='true' />
				</div>

				<div className={styles.playerInfo}>
					<h3 className={styles.playerName} title={player.name}>
						{player.name}
					</h3>

					<div className={styles.playerBadgesRow}>
						{isMe && <span className={styles.meBadge}>Вы</span>}
						{isCreator && <span className={styles.creatorBadge}>Хост</span>}

						<span
							className={
								isProfessionRevealed && player.profession
									? styles.roleChip
									: styles.roleChipMuted
							}
						>
							{isProfessionRevealed && player.profession
								? player.profession
								: 'Роль неизвестна'}
						</span>
					</div>

					<div className={styles.playerBottomLine}>
						<span className={styles.cardsInfo}>
							Карт: {player.revealedCards || 0}
						</span>
					</div>
				</div>

				<div className={styles.playerRight}>
					<span className={`${styles.statusBadge} ${statusClassName}`}>
						{status.label}
					</span>

					<span
						className={`${styles.activityIndicator} ${
							hasRevealedThisRound ? styles.activityActive : ''
						}`}
						title={
							hasRevealedThisRound
								? 'Раскрыл карту в этом раунде'
								: 'Ожидает действия'
						}
						aria-label={
							hasRevealedThisRound
								? 'Раскрыл карту в этом раунде'
								: 'Ожидает действия'
						}
					/>
				</div>
			</div>

			{gamePhase === 'voting' && isAlive && userId && player.id !== userId && (
				<div className={styles.voteSection}>
					<button
						type='button'
						className={styles.voteButton}
						onClick={() => onVote(player.id)}
						disabled={isVoteDisabled}
					>
						{hasVoted ? 'Цель выбрана' : 'Голосовать'}
					</button>

					<div className={styles.voteCount}>
						<span>Голосов</span>
						<strong>{player.votesAgainst || 0}</strong>
					</div>
				</div>
			)}
		</article>
	)
}

function getPlayerStatus(player: ExtendedGamePlayer): {
	type: 'alive' | 'dead' | 'infected' | 'suspicious'
	label: string
} {
	if (player.isAlive !== true) {
		return {
			type: 'dead',
			label: 'Мёртв',
		}
	}

	if (player.isInfected) {
		return {
			type: 'infected',
			label: 'Заражён',
		}
	}

	if (player.isSuspicious) {
		return {
			type: 'suspicious',
			label: 'Подозр.',
		}
	}

	return {
		type: 'alive',
		label: 'Жив',
	}
}

function getStatusClassName(
	status: 'alive' | 'dead' | 'infected' | 'suspicious',
): string {
	switch (status) {
		case 'dead':
			return styles.statusDead

		case 'infected':
			return styles.statusInfected

		case 'suspicious':
			return styles.statusSuspicious

		default:
			return styles.statusAlive
	}
}
