'use client'

import { ExtendedGameState } from '@station-eden/shared'
import dynamic from 'next/dynamic'
import { useEffect, useRef } from 'react'
import styles from '../../page.module.css'
import GameTransitionLoader from './GameTransitionLoader'

interface WaitingRoomProps {
	gameState: ExtendedGameState
	gameId: string
	userId?: string
	isConnected: boolean
	onStartGame: () => void
	onLeaveGame: () => void
}

const GalaxyWarmup = dynamic(() => import('../IntroCinematic/Galaxy/Galaxy'), {
	ssr: false,
	loading: () => null,
})

const PRELOAD_START_DELAY_MS = 2000
const MIN_PLAYERS_REQUIRED = 2

const GALAXY_FOCAL: [number, number] = [0.5, 0.48]
const GALAXY_ROTATION: [number, number] = [1.0, 0.035]

export default function WaitingRoom({
	gameState,
	userId,
	isConnected,
	onStartGame,
}: WaitingRoomProps) {
	const startRequestedRef = useRef(false)

	const playersCount = gameState.players?.length || 0
	const isCreator = Boolean(userId && gameState.creatorId === userId)

	const canAutoStart =
		isCreator && isConnected && playersCount >= MIN_PLAYERS_REQUIRED

	useEffect(() => {
		if (!canAutoStart) return
		if (startRequestedRef.current) return

		startRequestedRef.current = true

		let didStart = false

		const timeout = window.setTimeout(() => {
			didStart = true
			onStartGame()
		}, PRELOAD_START_DELAY_MS)

		return () => {
			window.clearTimeout(timeout)

			if (!didStart) {
				startRequestedRef.current = false
			}
		}
	}, [canAutoStart, onStartGame])

	return (
		<>
			<div className={styles.galaxyWarmup} aria-hidden='true'>
				<GalaxyWarmup
					mouseInteraction={false}
					mouseRepulsion={false}
					transparent={false}
					disableAnimation
					density={1.38}
					glowIntensity={0.9}
					saturation={0.46}
					hueShift={218}
					starSpeed={0.32}
					speed={0.72}
					twinkleIntensity={0.45}
					rotationSpeed={0.035}
					repulsionStrength={1.15}
					starScale={1.14}
					flareIntensity={0.72}
					focal={GALAXY_FOCAL}
					rotation={GALAXY_ROTATION}
				/>
			</div>

			<GameTransitionLoader
				title='Готовим экипаж'
				ariaLabel='Подготовка игрового интро Station Eden'
			/>
		</>
	)
}
