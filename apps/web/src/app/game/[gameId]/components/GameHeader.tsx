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

const CARD_TYPES_COUNT = 9

export default function GameHeader({
	gameState,
	phaseTimeLeft,
	myRevealedCardsThisRound,
	onLeaveGame,
}: GameHeaderProps) {
	const players = (gameState.players || []) as ExtendedGamePlayer[]
	const alivePlayers = players.filter(player => player.isAlive === true)

	const capsuleSlots = Number(
		(gameState as { capsuleSlots?: number }).capsuleSlots ||
			Math.max(1, Math.floor(players.length / 2)),
	)

	const occupiedSlots = Number(
		(gameState as { occupiedSlots?: number }).occupiedSlots || 0,
	)

	const openedCards = players.reduce((total, player) => {
		return total + Number(player.revealedCards || 0)
	}, 0)

	const totalCards = Math.max(1, players.length * CARD_TYPES_COUNT)

	const openedCardsDisplay =
		openedCards > 0 ? openedCards : myRevealedCardsThisRound.length

	const roundNumber =
		typeof (gameState as { round?: number }).round === 'number'
			? (gameState as { round?: number }).round
			: 1

	return (
		<header className={styles.header}>
			<div className={styles.gameBrand}>
				<div className={styles.gameTitle}>
					<h1>Станция Эдем</h1>
					<span className={styles.gameHeaderSession}>Раунд {roundNumber}</span>
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
					<div className={`${styles.statItem} ${styles.statItemSurvivors}`}>
						<SurvivorsIcon />
						<div>
							<span className={styles.statLabel}>Выжившие</span>
							<strong className={styles.statValue}>
								{alivePlayers.length}/{players.length}
							</strong>
						</div>
					</div>

					<div className={styles.statItem}>
						<span className={styles.statLabel}>Капсулы</span>
						<strong className={styles.statValue}>
							{occupiedSlots}/{capsuleSlots}
						</strong>
					</div>

					<div className={styles.statItem}>
						<span className={styles.statLabel}>Открыто карт</span>
						<strong className={styles.statValue}>
							{openedCardsDisplay}/{totalCards}
						</strong>
					</div>
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

function SurvivorsIcon() {
	return (
		<svg
			className={styles.statIcon}
			xmlnsXlink='http://www.w3.org/1999/xlink'
			width='24'
			height='24'
			viewBox='0 0 24 24'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			aria-hidden='true'
			focusable='false'
		>
			<g clipPath='url(#survivorsIconClip)'>
				<path
					d='M18.0014 19.8751H19.6369C21.2184 19.8751 22.5005 18.6307 22.5005 17.0957C22.5005 14.5374 20.3636 12.4634 17.7277 12.4634H15.8187C15.7386 12.4634 15.6591 12.4653 15.5801 12.4691C17.1962 13.9473 18.2051 16.0442 18.2051 18.3696C18.2051 18.8904 18.1342 19.3951 18.0014 19.8751Z'
					fill='#576390'
				/>
				<path
					d='M14.2695 9.51536C14.8816 10.1869 15.7762 10.6103 16.7727 10.6103C18.6178 10.6103 20.1135 9.15852 20.1135 7.36765C20.1135 5.57678 18.6178 4.125 16.7727 4.125C16.1269 4.125 15.524 4.30279 15.013 4.61068C15.1491 5.12159 15.2214 5.65737 15.2214 6.20955C15.2214 7.42004 14.8736 8.55167 14.2695 9.51536Z'
					fill='#576390'
				/>
				<path
					fillRule='evenodd'
					clipRule='evenodd'
					d='M8.65908 10.2629C10.9655 10.2629 12.8352 8.44814 12.8352 6.20956C12.8352 3.97098 10.9655 2.15625 8.65908 2.15625C6.35267 2.15625 4.48296 3.97098 4.48296 6.20956C4.48296 8.44814 6.35267 10.2629 8.65908 10.2629ZM7.4659 12.579C4.17103 12.579 1.5 15.1715 1.5 18.3694C1.5 20.2883 3.10261 21.8438 5.07954 21.8438H12.2386C14.2156 21.8438 15.8182 20.2883 15.8182 18.3694C15.8182 15.1715 13.1472 12.579 9.85226 12.579H7.4659Z'
					fill='#576390'
				/>
			</g>

			<defs>
				<clipPath id='survivorsIconClip'>
					<rect
						width='21'
						height='21'
						fill='white'
						transform='translate(1.5 1.5)'
					/>
				</clipPath>
			</defs>
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
