// apps/web/src/app/game/[gameId]/components/GamePhasePanel.tsx
'use client'

import {
	CardDetails,
	CrisisInfo,
	ExtendedGamePlayer,
	ExtendedGameState,
	GamePhase,
	PlayerCardInfo,
	RevealedPlayer,
} from '@station-eden/shared'
import { useCallback, useEffect, useState } from 'react'
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
	onStartDiscussion,
	onRequestVote,
	onVote,
	onSolveCrisis,
	onSetActiveCrisis,
	allPlayersCards,
	myCards,
}: GamePhasePanelProps) {
	const [isScannerOpen, setIsScannerOpen] = useState(false)

	const phase = gameState.phase as GamePhase
	const isCreator = userId === gameState.creatorId

	const phaseName = getPhaseName(phase)
	const phaseDescription = getPhaseDescription(phase)
	const phaseClassName = getPhaseClassName(phase)
	const terminalStatus = getTerminalStatus(phase)
	const scannerStatus = getScannerStatus(allPlayersCards)

	const allPlayersRevealed = alivePlayers.every(
		player => (player.revealedCards ?? 0) > 0,
	)

	const voteRequestPlayerIds = Array.isArray(gameState.voteRequestPlayerIds)
		? (gameState.voteRequestPlayerIds as string[])
		: []

	const hasRequestedVote = Boolean(
		userId && voteRequestPlayerIds.includes(userId),
	)

	const voteTriggerCount =
		typeof gameState.voteTriggerCount === 'number'
			? gameState.voteTriggerCount
			: 0

	const requiredVotes =
		typeof gameState.requiredVotes === 'number' ? gameState.requiredVotes : 1

	const shouldShowTimer =
		(phase === 'voting' ||
			phase === 'discussion' ||
			phase === 'crisis' ||
			phase === 'introduction' ||
			phase === 'preparation' ||
			phase === 'intermission') &&
		phaseTimeLeft > 0

	const timerProgress =
		phaseDurationDisplay > 0
			? Math.min(100, Math.max(0, (phaseTimeLeft / phaseDurationDisplay) * 100))
			: 0

	const handleOpenScanner = useCallback(() => {
		setIsScannerOpen(true)
	}, [])

	const handleCloseScanner = useCallback(() => {
		setIsScannerOpen(false)
	}, [])

	useEffect(() => {
		if (!isScannerOpen) return

		const previousOverflow = document.body.style.overflow
		document.body.style.overflow = 'hidden'

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setIsScannerOpen(false)
			}
		}

		window.addEventListener('keydown', handleKeyDown)

		return () => {
			document.body.style.overflow = previousOverflow
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [isScannerOpen])

	const renderPhaseActions = () => {
		switch (phase) {
			case 'preparation':
				return (
					<PreparationActions
						onShowMyCards={onShowMyCards}
						onShowCardsTable={handleOpenScanner}
					/>
				)

			case 'discussion':
				return (
					<DiscussionActions
						onShowMyCards={onShowMyCards}
						onShowCardsTable={handleOpenScanner}
						onRequestVote={onRequestVote}
						isCreator={isCreator}
						allPlayersRevealed={allPlayersRevealed}
						isConnected={true}
						phaseTimeLeft={phaseTimeLeft}
						voteTriggerCount={voteTriggerCount}
						requiredVotes={requiredVotes}
						hasRequestedVote={hasRequestedVote}
						alivePlayers={alivePlayers}
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
						<p className={styles.phaseHint}>{phaseDescription}</p>
					</div>
				)
		}
	}

	return (
		<>
			<section
				className={`${styles.gamePanel} ${styles.commandTerminal} ${phaseClassName}`}
			>
				<div className={styles.commandTerminalGlow} />

				<div className={styles.commandTerminalTopbar}>
					<div className={styles.commandTerminalIdentity}>
						<span className={styles.commandTerminalEyebrow}>
							Командный терминал
						</span>

						<span className={styles.commandTerminalCode}>
							STATION-EDEN / SESSION-LINK
						</span>
					</div>

					<div className={styles.commandTerminalStatus}>
						<span className={styles.commandTerminalStatusDot} />
						<span>{terminalStatus}</span>
					</div>
				</div>

				<div className={styles.phaseInfo}>
					<span className={styles.phaseBadge}>Текущая фаза</span>

					<h2>{phaseName}</h2>

					<p className={styles.phaseDescription}>{phaseDescription}</p>

					{shouldShowTimer && (
						<div className={styles.phaseTimer}>
							<div className={styles.timerBar}>
								<div
									className={styles.timerProgress}
									style={{ width: `${timerProgress}%` }}
								/>
							</div>

							<span className={styles.timerText}>
								{formatTime(phaseTimeLeft)} / {formatTime(phaseDurationDisplay)}
							</span>
						</div>
					)}
				</div>

				<div className={styles.terminalBody}>
					<div className={styles.primaryActionsPanel}>
						<div className={styles.primaryActionsHeader}>
							<div>
								<span className={styles.primaryActionsEyebrow}>
									Доступные действия
								</span>

								<h3>Панель управления фазой</h3>
							</div>

							<span className={styles.primaryActionsHint}>
								{isCreator
									? 'Права создателя активны'
									: 'Ожидание решений экипажа'}
							</span>
						</div>

						<div className={styles.gameActions}>{renderPhaseActions()}</div>

						<div className={styles.scannerLauncher}>
							<div className={styles.scannerLauncherInfo}>
								<span className={styles.scannerLauncherEyebrow}>
									Сканер экипажа
								</span>

								<span className={styles.scannerLauncherStatus}>
									{scannerStatus}
								</span>
							</div>

							<button
								type='button'
								className={styles.scannerLauncherButton}
								onClick={handleOpenScanner}
							>
								Открыть матрицу карт
							</button>
						</div>
					</div>
				</div>
			</section>

			<div
				className={styles.scannerDrawerBackdrop}
				data-open={isScannerOpen}
				onClick={handleCloseScanner}
				aria-hidden='true'
			/>

			<section
				className={styles.scannerDrawer}
				data-open={isScannerOpen}
				role='dialog'
				aria-modal={isScannerOpen}
				aria-hidden={!isScannerOpen}
				aria-label='Сканер экипажа'
			>
				<div className={styles.scannerDrawerHeader}>
					<div>
						<span className={styles.scannerDrawerEyebrow}>Сканер экипажа</span>

						<h2>Матрица раскрытых карт</h2>

						<p>{scannerStatus}</p>
					</div>

					<button
						type='button'
						className={styles.scannerDrawerClose}
						onClick={handleCloseScanner}
						aria-label='Закрыть сканер экипажа'
					>
						✕
					</button>
				</div>

				<div className={styles.scannerDrawerBody}>
					<CardsTable
						allPlayersCards={allPlayersCards}
						myCards={myCards}
						userId={userId}
					/>
				</div>
			</section>
		</>
	)
}

function getPhaseClassName(phase: GamePhase): string {
	switch (phase) {
		case 'discussion':
			return styles.phaseDiscussion

		case 'voting':
			return styles.phaseVoting

		case 'crisis':
			return styles.phaseCrisis

		case 'reveal':
			return styles.phaseReveal

		case 'preparation':
			return styles.phasePreparation

		case 'intermission':
			return styles.phaseIntermission

		case 'game_over':
			return styles.phaseGameOver

		default:
			return styles.phaseDefault
	}
}

function getTerminalStatus(phase: GamePhase): string {
	switch (phase) {
		case 'discussion':
			return 'Канал обсуждения открыт'

		case 'voting':
			return 'Протокол голосования активен'

		case 'crisis':
			return 'Обнаружена критическая угроза'

		case 'reveal':
			return 'Раскрытие данных экипажа'

		case 'preparation':
			return 'Подготовка экипажа'

		case 'intermission':
			return 'Переход между фазами'

		case 'game_over':
			return 'Сессия завершена'

		default:
			return 'Система активна'
	}
}

function getScannerStatus(allPlayersCards: PlayerCardInfo[]): string {
	if (!allPlayersCards.length) {
		return 'Ожидание раскрытия данных'
	}

	return 'Данные синхронизированы'
}
