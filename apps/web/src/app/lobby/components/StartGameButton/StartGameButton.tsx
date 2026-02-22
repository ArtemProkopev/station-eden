// apps/web/src/app/lobby/components/StartGameButton/StartGameButton.tsx
'use client'

import styles from './StartGameButton.module.css'

interface StartGameButtonProps {
	readyPlayersCount: number
	totalPlayersCount: number
	isConnected: boolean
	minPlayersRequired: number
	isLobbyCreator?: boolean
	onStartGame?: () => void
}

export default function StartGameButton({
	readyPlayersCount,
	totalPlayersCount,
	isConnected,
	minPlayersRequired,
	isLobbyCreator = false,
	onStartGame,
}: StartGameButtonProps) {
	const canStartGame =
		isConnected &&
		totalPlayersCount >= minPlayersRequired &&
		readyPlayersCount === totalPlayersCount &&
		isLobbyCreator

	const getButtonText = () => {
		if (!isConnected) return 'Нет подключения'
		if (!isLobbyCreator) return 'Только создатель может начать'
		if (totalPlayersCount < minPlayersRequired)
			return `Минимум ${minPlayersRequired} игрока`
		if (readyPlayersCount !== totalPlayersCount) return 'Не все готовы'
		return 'начать игру'
	}

	const handleClick = () => {
		if (canStartGame && onStartGame) onStartGame()
	}

	return (
		<button
			className={styles.startBtn}
			onClick={handleClick}
			disabled={!canStartGame}
			title={getButtonText()}
		>
			{getButtonText()} ({readyPlayersCount}/{totalPlayersCount})
		</button>
	)
}
