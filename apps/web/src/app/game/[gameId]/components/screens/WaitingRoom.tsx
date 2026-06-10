'use client'

import { ExtendedGameState } from '@station-eden/shared'
import { useEffect, useRef } from 'react'
import GameTransitionLoader from './GameTransitionLoader'

interface WaitingRoomProps {
	gameState: ExtendedGameState
	gameId: string
	userId?: string
	isConnected: boolean
	onStartGame: () => void
	onLeaveGame: () => void
}

const START_REQUEST_DELAY_MS = 120
const MIN_PLAYERS_REQUIRED = 2

export default function WaitingRoom({
	gameState,
	userId,
	isConnected,
	onStartGame,
}: WaitingRoomProps) {
	const startRequestedRef = useRef(false)
	const onStartGameRef = useRef(onStartGame)

	useEffect(() => {
		onStartGameRef.current = onStartGame
	}, [onStartGame])

	const playersCount = gameState.players?.length || 0
	const isCreator = Boolean(userId && gameState.creatorId === userId)

	const canAutoStart =
		isCreator && isConnected && playersCount >= MIN_PLAYERS_REQUIRED

	useEffect(() => {
		if (!canAutoStart) {
			startRequestedRef.current = false
			return
		}

		if (startRequestedRef.current) return

		startRequestedRef.current = true

		const timeout = window.setTimeout(() => {
			onStartGameRef.current()
		}, START_REQUEST_DELAY_MS)

		return () => {
			window.clearTimeout(timeout)
		}
	}, [canAutoStart])

	return (
		<GameTransitionLoader
			title='Готовим экипаж'
			ariaLabel='Подготовка игрового интро Station Eden'
		/>
	)
}
