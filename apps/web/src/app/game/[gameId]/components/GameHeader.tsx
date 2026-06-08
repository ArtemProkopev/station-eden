// apps/web/src/app/game/[gameId]/components/GameHeader.tsx
import { ExtendedGamePlayer, ExtendedGameState } from '@station-eden/shared'
import styles from './GameHeader.module.css'
import { formatTime } from './utils/game.utils'

interface GameHeaderProps {
	gameState: ExtendedGameState
	phaseTimeLeft: number
	myRevealedCardsThisRound: string[]
	userId?: string
	onLeaveGame: () => void
}

export default function GameHeader({
	gameState,
	phaseTimeLeft,
	myRevealedCardsThisRound,
	userId,
	onLeaveGame,
}: GameHeaderProps) {
	const players = (gameState.players || []) as ExtendedGamePlayer[]

	const currentPlayer = userId
		? players.find(player => player.id === userId)
		: undefined

	const alivePlayers = players.filter(player => player.isAlive === true)

	const isProfessionRevealed =
		currentPlayer?.revealedCardsInfo?.profession !== undefined

	const professionDisplay =
		isProfessionRevealed && currentPlayer?.profession
			? currentPlayer.profession
			: 'Неизвестно'

	const capsuleSlots = Number(
		gameState.capsuleSlots || Math.max(1, Math.floor(players.length / 2)),
	)

	const occupiedSlots = Number(gameState.occupiedSlots || 0)
	const roleDisplay = gameState.creatorId === userId ? 'Создатель' : 'Экипаж'

	return (
		<header className={styles.header}>
			<div className={styles.gameBrand}>
				<div className={styles.gameBrandMark} aria-hidden='true'>
					<StationMarkIcon />
				</div>

				<div className={styles.gameTitle}>
					<h1>Станция Эдем</h1>
					<span className={styles.gameHeaderSession}>Игровая сессия</span>
				</div>
			</div>

			<div className={styles.gameHeaderTimer}>
				<span className={styles.gameHeaderTimerLabel}>До конца фазы</span>
				<strong className={styles.gameHeaderTimerValue}>
					{formatTime(phaseTimeLeft)}
				</strong>
			</div>

			<div className={styles.gameHeaderRight}>
				<div className={styles.gameStats}>
					<div className={styles.statItem}>
						<span className={styles.statLabel}>Капсула</span>
						<span className={styles.statValue}>
							{occupiedSlots}/{capsuleSlots}
						</span>
					</div>

					<div className={styles.statItem}>
						<span className={styles.statLabel}>Выжило</span>
						<span className={styles.statValue}>
							{alivePlayers.length}/{players.length}
						</span>
					</div>

					{currentPlayer && (
						<>
							<div className={styles.statItem}>
								<span className={styles.statLabel}>Раскрыто</span>
								<span className={styles.statValue}>
									{myRevealedCardsThisRound.length}/1
								</span>
							</div>

							<div className={`${styles.statItem} ${styles.statItemWide}`}>
								<span className={styles.statLabel}>Профессия</span>
								<span className={styles.statValue}>{professionDisplay}</span>
							</div>

							<div className={`${styles.statItem} ${styles.statItemWide}`}>
								<span className={styles.statLabel}>Роль</span>
								<span className={styles.statValue}>{roleDisplay}</span>
							</div>
						</>
					)}
				</div>

				<button
					type='button'
					className={styles.leaveGameButton}
					onClick={onLeaveGame}
					aria-label='Выйти из игры'
				>
					<ExitGameIcon />
					<span>Выход из игры</span>
				</button>
			</div>
		</header>
	)
}

function StationMarkIcon() {
	return (
		<svg
			width='44'
			height='44'
			viewBox='0 0 44 44'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			aria-hidden='true'
			focusable='false'
		>
			<circle
				cx='22'
				cy='22'
				r='16.5'
				stroke='currentColor'
				strokeOpacity='0.55'
			/>
			<circle
				cx='22'
				cy='22'
				r='9.5'
				stroke='currentColor'
				strokeOpacity='0.34'
			/>
			<path
				d='M22 4V11M22 33V40M4 22H11M33 22H40'
				stroke='currentColor'
				strokeWidth='1.4'
				strokeLinecap='round'
				strokeOpacity='0.72'
			/>
			<path
				d='M17.5 16.5L22 13.5L26.5 16.5V24.2L22 30.5L17.5 24.2V16.5Z'
				stroke='currentColor'
				strokeWidth='1.5'
				strokeLinejoin='round'
			/>
			<path
				d='M22 13.5V30.5'
				stroke='currentColor'
				strokeWidth='1'
				strokeOpacity='0.42'
			/>
		</svg>
	)
}

function ExitGameIcon() {
	return (
		<svg
			className={styles.leaveGameIcon}
			width='20'
			height='20'
			viewBox='0 0 24 24'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			aria-hidden='true'
			focusable='false'
		>
			<path
				d='M14 3.25H7.75C7.02 3.25 6.32 3.54 5.81 4.06C5.29 4.57 5 5.27 5 6V18C5 18.73 5.29 19.43 5.81 19.94C6.32 20.46 7.02 20.75 7.75 20.75H14C14.41 20.75 14.75 20.41 14.75 20C14.75 19.59 14.41 19.25 14 19.25H7.75C7.42 19.25 7.1 19.12 6.87 18.88C6.63 18.65 6.5 18.33 6.5 18V6C6.5 5.67 6.63 5.35 6.87 5.12C7.1 4.88 7.42 4.75 7.75 4.75H14C14.41 4.75 14.75 4.41 14.75 4C14.75 3.59 14.41 3.25 14 3.25Z'
				fill='currentColor'
			/>
			<path
				d='M16.47 8.22C16.76 7.93 17.24 7.93 17.53 8.22L20.78 11.47C21.07 11.76 21.07 12.24 20.78 12.53L17.53 15.78C17.24 16.07 16.76 16.07 16.47 15.78C16.18 15.49 16.18 15.01 16.47 14.72L18.44 12.75H10.75C10.34 12.75 10 12.41 10 12C10 11.59 10.34 11.25 10.75 11.25H18.44L16.47 9.28C16.18 8.99 16.18 8.51 16.47 8.22Z'
				fill='currentColor'
			/>
		</svg>
	)
}
