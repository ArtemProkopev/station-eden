// apps/web/src/app/game/[gameId]/components/GamePhasePanel.tsx
'use client'

import {
	AbilityInfo,
	CardDetails,
	CrisisInfo,
	ExtendedGamePlayer,
	ExtendedGameState,
	GameChatMessage,
	GamePhase,
	PlayerCardInfo,
	RevealedPlayer,
} from '@station-eden/shared'
import type { CSSProperties } from 'react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import AbilitiesPanel from './AbilitiesPanel'
import CardsTable from './CardsTable'
import styles from './GamePhasePanel.module.css'
import CrisisActions from './phase-actions/CrisisActions'
import DiscussionActions from './phase-actions/DiscussionActions'
import GameOverActions from './phase-actions/GameOverActions'
import PreparationActions from './phase-actions/PreparationActions'
import RevealActions from './phase-actions/RevealActions'
import VotingActions from './phase-actions/VotingActions'
import { getPhaseDescription, getPhaseName } from './utils/game.utils'

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
	newCardsCount?: number
	systemMessages?: GameChatMessage[]
	playerAbilities?: AbilityInfo[]
	onUseAbility?: (
		abilityId: string,
		targetId?: string,
		extraData?: string,
	) => void
	playersList?: Array<{ id: string; name: string; isAlive: boolean }>
	availableProfessions?: Array<{ id: string; name: string }>
	availableResources?: Array<{ id: string; name: string }>
}

const COMPACT_SYSTEM_MESSAGES_COUNT = 2

const TIMED_PHASES = new Set<GamePhase>([
	'introduction',
	'preparation',
	'discussion',
	'voting',
	'reveal',
	'crisis',
	'intermission',
])

const PROFESSION_NAMES: Record<string, string> = {
	prof_engineer: 'Инженер',
	prof_astrobiologist: 'Астробиолог',
	prof_pilot: 'Пилот',
	prof_surgeon: 'Хирург',
	prof_linguist: 'Лингвист',
	prof_security: 'Офицер безопасности',
	prof_communications: 'Специалист связи',
	prof_geologist: 'Геолог',
	prof_psychologist: 'Психолог',
	prof_medic: 'Медик',
	prof_doctor: 'Врач',
	prof_biologist: 'Биолог',
}

function GamePhasePanel({
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
	newCardsCount = 0,
	systemMessages = [],
	playerAbilities = [],
	onUseAbility,
	playersList = [],
	availableProfessions = [],
	availableResources = [],
}: GamePhasePanelProps) {
	const [isCardsOverviewOpen, setIsCardsOverviewOpen] = useState(false)
	const [isSystemFeedExpanded, setIsSystemFeedExpanded] = useState(false)

	const phase = gameState.phase as GamePhase
	const isCreator = userId === gameState.creatorId
	const phaseName = getPhaseName(phase)
	const phaseDescription = getPhaseDescription(phase)
	const phaseClassName = getPhaseClassName(phase)
	const terminalStatus = getTerminalStatus(phase)

	const allPlayersRevealed = useMemo(() => {
		return alivePlayers.every(player => (player.revealedCards ?? 0) > 0)
	}, [alivePlayers])

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

	const safeDuration = Math.max(
		1,
		Number(gameState.phaseDuration) || 0,
		phaseDurationDisplay || 0,
		phaseTimeLeft || 0,
	)
	const shouldShowTimer = TIMED_PHASES.has(phase)
	const timerRatio = shouldShowTimer
		? Math.max(0, Math.min(1, phaseTimeLeft / safeDuration))
		: 0
	const timerProgressStyle = useMemo<CSSProperties>(
		() => ({ transform: `scaleX(${timerRatio})` }),
		[timerRatio],
	)

	const shouldShowSystemFeedMore =
		systemMessages.length > COMPACT_SYSTEM_MESSAGES_COUNT

	const visibleSystemMessages = useMemo(() => {
		if (isSystemFeedExpanded) return systemMessages

		return systemMessages.slice(-COMPACT_SYSTEM_MESSAGES_COUNT)
	}, [isSystemFeedExpanded, systemMessages])

	const abilitiesDisabled = phase !== 'discussion' && phase !== 'voting'
	const availableAbilities = useMemo(() => {
		return playerAbilities.filter(ability => ability.available && !ability.used)
	}, [playerAbilities])

	useEffect(() => {
		setIsSystemFeedExpanded(false)
	}, [gameState.phase, gameState.round])

	useEffect(() => {
		if (!isCardsOverviewOpen) return

		const previousOverflow = document.body.style.overflow
		document.body.style.overflow = 'hidden'

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setIsCardsOverviewOpen(false)
			}
		}

		window.addEventListener('keydown', handleKeyDown)

		return () => {
			document.body.style.overflow = previousOverflow
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [isCardsOverviewOpen])

	const handleOpenCardsOverview = useCallback(() => {
		setIsCardsOverviewOpen(true)
	}, [])

	const handleCloseCardsOverview = useCallback(() => {
		setIsCardsOverviewOpen(false)
	}, [])

	const handleToggleSystemFeed = useCallback(() => {
		setIsSystemFeedExpanded(current => !current)
	}, [])

	const renderPhaseActions = () => {
		switch (phase) {
			case 'preparation':
				return (
					<PreparationActions
						onShowMyCards={onShowMyCards}
						onShowCardsTable={handleOpenCardsOverview}
						onStartDiscussion={onStartDiscussion}
						isCreator={isCreator}
						allPlayersRevealed={allPlayersRevealed}
						newCardsCount={newCardsCount}
					/>
				)

			case 'discussion':
				return (
					<DiscussionActions
						onShowMyCards={onShowMyCards}
						onShowCardsTable={handleOpenCardsOverview}
						onRequestVote={onRequestVote}
						isCreator={isCreator}
						allPlayersRevealed={allPlayersRevealed}
						isConnected={true}
						voteTriggerCount={voteTriggerCount}
						requiredVotes={requiredVotes}
						hasRequestedVote={hasRequestedVote}
						alivePlayers={alivePlayers}
						newCardsCount={newCardsCount}
					/>
				)

			case 'voting':
				return (
					<VotingActions
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
						<div className={styles.phaseTimer} aria-hidden='true'>
							<div className={styles.timerBar}>
								<div
									className={styles.timerProgress}
									style={timerProgressStyle}
								/>
							</div>
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

								<h3>Управление фазой</h3>
							</div>
						</div>

						<div className={styles.gameActions}>{renderPhaseActions()}</div>

						{availableAbilities.length > 0 && onUseAbility && (
							<div className={styles.abilitiesSection}>
								<div className={styles.abilitiesSectionHeader}>
									<span className={styles.abilitiesEyebrow}>
										Активация способностей
									</span>
									<h3>Особые возможности</h3>
								</div>

								<AbilitiesPanel
									abilities={playerAbilities}
									onUseAbility={onUseAbility}
									players={playersList}
									professions={availableProfessions}
									resources={availableResources}
									disabled={abilitiesDisabled}
								/>
							</div>
						)}

						{systemMessages.length > 0 && (
							<div
								className={styles.systemFeed}
								data-expanded={isSystemFeedExpanded}
							>
								<div className={styles.systemFeedHeader}>
									<div className={styles.systemFeedTitle}>
										<span>Системные сообщения</span>
									</div>

									{shouldShowSystemFeedMore && (
										<button
											type='button'
											className={styles.systemFeedMore}
											onClick={handleToggleSystemFeed}
											aria-expanded={isSystemFeedExpanded}
										>
											{isSystemFeedExpanded ? 'Свернуть' : 'Подробнее'}
										</button>
									)}
								</div>

								<div
									className={styles.systemFeedList}
									data-expanded={isSystemFeedExpanded}
								>
									{visibleSystemMessages.map(message => (
										<div key={message.id} className={styles.systemFeedItem}>
											<span className={styles.systemFeedTime}>
												{formatMessageTime(message.timestamp)}
											</span>

											<p className={styles.systemFeedText}>
												{cleanText(message.text)}
											</p>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			</section>

			<div
				className={styles.scannerDrawerBackdrop}
				data-open={isCardsOverviewOpen}
				onClick={handleCloseCardsOverview}
				aria-hidden='true'
			/>

			<section
				className={styles.scannerDrawer}
				data-open={isCardsOverviewOpen}
				role='dialog'
				aria-modal={isCardsOverviewOpen}
				aria-hidden={!isCardsOverviewOpen}
				aria-label='Карты экипажа'
			>
				<div className={styles.scannerDrawerHeader}>
					<h2>Карты экипажа</h2>

					<button
						type='button'
						className={styles.scannerDrawerClose}
						onClick={handleCloseCardsOverview}
						aria-label='Закрыть карты экипажа'
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

function formatMessageTime(timestamp: Date | string | number): string {
	const date = timestamp instanceof Date ? timestamp : new Date(timestamp)

	if (Number.isNaN(date.getTime())) return '--:--'

	return date.toLocaleTimeString('ru-RU', {
		hour: '2-digit',
		minute: '2-digit',
	})
}

function cleanText(value: string): string {
	return value
		.trim()
		.replace(/\bprof_[a-z_]+\b/g, match => PROFESSION_NAMES[match] || match)
		.replace(/[.。]+$/g, '')
}

export default memo(GamePhasePanel)
