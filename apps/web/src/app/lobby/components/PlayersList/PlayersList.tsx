// apps/web/src/app/lobby/components/PlayersList/PlayersList.tsx
import { LobbyPlayer as Player } from '@station-eden/shared'
import { memo, useEffect, useRef } from 'react'
import styles from './PlayersList.module.css'

interface PlayersListProps {
	players: Player[]
	maxPlayers: number
	currentUserId?: string
	onPlayerMenuClick: (player: Player) => void
	onAddPlayer: () => void
	onToggleReady: () => void
	currentUserReadyState: boolean
}

function MoreDotsIcon() {
	return (
		<svg
			width='24'
			height='24'
			viewBox='0 0 24 24'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			aria-hidden='true'
		>
			<circle cx='5' cy='12' r='2.15' fill='currentColor' />
			<circle cx='12' cy='12' r='2.15' fill='currentColor' />
			<circle cx='19' cy='12' r='2.15' fill='currentColor' />
		</svg>
	)
}

export default memo(function PlayersList({
	players,
	maxPlayers,
	currentUserId,
	onPlayerMenuClick,
	onAddPlayer,
	onToggleReady,
	currentUserReadyState,
}: PlayersListProps) {
	const playersListRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const container = playersListRef.current
		if (!container) return

		const wheelHandler = (e: WheelEvent) => {
			if (container.scrollHeight > container.clientHeight) {
				container.scrollTop += e.deltaY
				e.preventDefault()
			}
		}

		container.addEventListener('wheel', wheelHandler, { passive: false })

		return () => {
			container.removeEventListener('wheel', wheelHandler)
		}
	}, [])

	return (
		<div className={styles.playersBlock}>
			<h2 className={styles.blockTitle}>
				Игроки ({players.length}/{maxPlayers})
			</h2>

			<div className={styles.playersListContainer}>
				<div className={styles.playersList} ref={playersListRef}>
					{players.map(player => (
						<div
							key={player.id}
							data-player-id={player.id}
							className={`${styles.playerCard} ${player.isReady ? styles.ready : ''}`}
						>
							<div className={styles.playerInfo}>
								<div
									className={styles.playerAvatar}
									style={
										player.avatar
											? {
													backgroundImage: `url(${player.avatar})`,
													backgroundSize: 'cover',
													backgroundPosition: 'center',
												}
											: {}
									}
								/>

								<div className={styles.playerDetails}>
									<p className={styles.playerName}>
										{player.name}
										{player.id === currentUserId && ' (Вы)'}
									</p>
									<p className={styles.playerStats}>
										{player.missions} миссий | {player.hours} ч
									</p>
								</div>

								<div className={styles.voiceStatus}>
									<span className={styles.voiceDot} />
									<div className={styles.voiceBars} aria-hidden='true'>
										<span />
										<span />
										<span />
									</div>
								</div>
							</div>

							<button
								className={styles.dots}
								onClick={() => onPlayerMenuClick(player)}
								title='Управление игроком'
								aria-label='Управление игроком'
								type='button'
							>
								<MoreDotsIcon />
							</button>
						</div>
					))}

					{players.length === 0 && (
						<div className={styles.emptyState}>
							<p>Нет игроков в лобби</p>
							<p style={{ fontSize: '14px', marginTop: '8px', opacity: '0.7' }}>
								Добавьте игроков чтобы начать игру
							</p>
						</div>
					)}
				</div>
			</div>

			<div className={styles.playerActions}>
				<button
					className={styles.addPlayerBtn}
					onClick={onAddPlayer}
					disabled={players.length >= maxPlayers}
					title={
						players.length >= maxPlayers
							? `Достигнут лимит игроков (${maxPlayers})`
							: 'Добавить игрока'
					}
					type='button'
				>
					добавить игрока
					{players.length >= maxPlayers && ' (лимит)'}
				</button>

				<button
					className={`${styles.readyBtn} ${currentUserReadyState ? styles.ready : ''}`}
					onClick={onToggleReady}
					disabled={!currentUserId}
					title={
						!currentUserId ? 'Профиль не загружен' : 'Переключить готовность'
					}
					type='button'
				>
					{currentUserReadyState ? 'не готов' : 'готов'}
				</button>
			</div>
		</div>
	)
})
