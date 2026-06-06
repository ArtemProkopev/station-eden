// apps/web/src/app/game/[gameId]/components/GamePhasePanel.tsx
import {
	CardDetails,
	CrisisInfo,
	ExtendedGamePlayer,
	ExtendedGameState,
	GamePhase,
	PlayerCardInfo,
	RevealedPlayer,
} from '@station-eden/shared'
import styles from '../page.module.css'
import CardsTable from './CardsTable'
import CrisisActions from './phase-actions/CrisisActions'
import DiscussionActions from './phase-actions/DiscussionActions'
import GameOverActions from './phase-actions/GameOverActions'
import PreparationActions from './phase-actions/PreparationActions'
import RevealActions from './phase-actions/RevealActions'
import VotingActions from './phase-actions/VotingActions'
import {
	formatTime,
	getPhaseDescription,
	getPhaseName,
} from './utils/game.utils'

interface GamePhasePanelProps {
	gameState: ExtendedGameState
	phaseTimeLeft: number
	phaseDurationDisplay: number
	userId?: string
	currentPlayer?: ExtendedGamePlayer
	alivePlayers: ExtendedGamePlayer[]
	revealingCards: string[]
	currentRevealIndex: number
	isRevealing: boolean
	revealedPlayer: RevealedPlayer
	onShowMyCards: () => void
	onShowCardsTable: () => void
	onStartDiscussion: () => void
	onRequestVote: () => void
	onVote: (targetPlayerId: string) => void
	onSolveCrisis: () => void
	onSetActiveCrisis: (crisis: CrisisInfo | null) => void
	myRevealedCardsThisRound: string[]
	myAllRevealedCards: string[]
	allPlayersCards: PlayerCardInfo[]
	myCards: Record<string, CardDetails>
}

export default function GamePhasePanel({
	gameState,
	phaseTimeLeft,
	phaseDurationDisplay,
	userId,
	currentPlayer,
	alivePlayers,
	revealingCards,
	currentRevealIndex,
	isRevealing,
	revealedPlayer,
	onShowMyCards,
	onShowCardsTable,
	onStartDiscussion,
	onRequestVote,
	onVote,
	onSolveCrisis,
	onSetActiveCrisis,
	allPlayersCards,
	myCards,
}: GamePhasePanelProps) {
	const phase = gameState.phase as GamePhase
	const isCreator = userId === gameState.creatorId

	const allPlayersRevealed = alivePlayers.every(
		player => (player.revealedCards ?? 0) > 0,
	)

	const voteRequestPlayerIds = Array.isArray(gameState.voteRequestPlayerIds)
		? (gameState.voteRequestPlayerIds as string[])
		: []

	const hasRequestedVote = !!userId && voteRequestPlayerIds.includes(userId)

	const voteTriggerCount =
		typeof gameState.voteTriggerCount === 'number'
			? gameState.voteTriggerCount
			: 0

	const requiredVotes =
		typeof gameState.requiredVotes === 'number' ? gameState.requiredVotes : 1

	const renderPhaseActions = () => {
		switch (phase) {
			case 'preparation':
				return (
					<PreparationActions
						onShowMyCards={onShowMyCards}
						onShowCardsTable={onShowCardsTable}
					/>
				)

			case 'discussion':
				return (
					<DiscussionActions
						onShowMyCards={onShowMyCards}
						onShowCardsTable={onShowCardsTable}
						onRequestVote={onRequestVote}
						isCreator={isCreator}
						allPlayersRevealed={allPlayersRevealed}
						isConnected={true}
						phaseTimeLeft={phaseTimeLeft}
						voteTriggerCount={voteTriggerCount}
						requiredVotes={requiredVotes}
						hasRequestedVote={hasRequestedVote}
					/>
				)

			case 'voting':
				return (
					<VotingActions
						phaseTimeLeft={phaseTimeLeft}
						alivePlayers={alivePlayers}
						userId={userId}
						currentPlayer={currentPlayer}
						onVote={onVote}
					/>
				)

			case 'reveal':
				return (
					<RevealActions
						revealedPlayer={revealedPlayer}
						revealingCards={revealingCards}
						currentRevealIndex={currentRevealIndex}
						isRevealing={isRevealing}
					/>
				)

			case 'crisis':
				return (
					<CrisisActions
						onViewCrisis={() =>
							onSetActiveCrisis(gameState.currentCrisis || null)
						}
						onSolveCrisis={onSolveCrisis}
						currentPlayer={currentPlayer}
					/>
				)

			case 'game_over':
				return <GameOverActions onLeaveGame={() => {}} />

			default:
				return (
					<div className={styles.phaseActions}>
						<button className={styles.tableButton} onClick={onShowCardsTable}>
							Общая таблица карт
						</button>
						<p className={styles.phaseHint}>{getPhaseDescription(phase)}</p>
					</div>
				)
		}
	}

	return (
		<section className={styles.gamePanel}>
			<div className={styles.phaseInfo}>
				<h2>{getPhaseName(phase)}</h2>
				<p className={styles.phaseDescription}>{getPhaseDescription(phase)}</p>

				{(phase === 'voting' ||
					phase === 'discussion' ||
					phase === 'crisis' ||
					phase === 'introduction' ||
					phase === 'preparation' ||
					phase === 'intermission') &&
					phaseTimeLeft > 0 && (
						<div className={styles.phaseTimer}>
							<div className={styles.timerBar}>
								<div
									className={styles.timerProgress}
									style={{
										width: `${Math.min(
											100,
											(phaseTimeLeft / phaseDurationDisplay) * 100,
										)}%`,
									}}
								/>
							</div>
							<span className={styles.timerText}>
								{formatTime(phaseTimeLeft)} / {formatTime(phaseDurationDisplay)}
							</span>
						</div>
					)}
			</div>

			<CardsTable
				allPlayersCards={allPlayersCards}
				myCards={myCards}
				userId={userId}
			/>

			<div className={styles.gameActions}>{renderPhaseActions()}</div>
		</section>
	)
}
