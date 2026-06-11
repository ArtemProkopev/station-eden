// apps/web/src/app/game/[gameId]/components/hooks/useGameTimer.ts
import { ExtendedGameState } from '@station-eden/shared'
import { useCallback, useEffect, useRef, useState } from 'react'

const TIMER_SYNC_INTERVAL_MS = 30_000
const MAX_ACCEPTED_SERVER_OFFSET_MS = 10_000

type TimerSnapshot = {
	endTimeMs: number | null
	phaseKey: string
}

function toSafeSeconds(value: unknown, fallback = 0): number {
	const parsed = typeof value === 'number' ? value : Number(value)

	if (!Number.isFinite(parsed)) return fallback

	return Math.max(0, Math.ceil(parsed))
}

function getSecondsLeft(endTimeMs: number, offsetMs: number): number {
	const now = Date.now() + offsetMs
	return Math.max(0, Math.ceil((endTimeMs - now) / 1000))
}

function getPhaseKey(game: ExtendedGameState): string {
	return [
		String(game.id ?? ''),
		String(game.phase ?? ''),
		String(game.round ?? ''),
		String(game.phaseEndTime ?? ''),
	].join(':')
}

export function useGameTimer() {
	const [phaseTimeLeft, setPhaseTimeLeftState] = useState<number>(0)

	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const serverTimeOffsetRef = useRef(0)
	const snapshotRef = useRef<TimerSnapshot>({
		endTimeMs: null,
		phaseKey: '',
	})

	const setPhaseTimeLeft = useCallback(
		(value: number | ((prev: number) => number)) => {
			setPhaseTimeLeftState(prev => {
				const nextValue = typeof value === 'function' ? value(prev) : value
				const next = toSafeSeconds(nextValue)

				return prev === next ? prev : next
			})
		},
		[],
	)

	const stopTimer = useCallback(() => {
		if (!intervalRef.current) return

		clearInterval(intervalRef.current)
		intervalRef.current = null
	}, [])

	const startTimer = useCallback(
		(duration: number, endTimeMs?: number) => {
			stopTimer()

			const safeDuration = toSafeSeconds(duration)
			const hasServerEndTime =
				typeof endTimeMs === 'number' && Number.isFinite(endTimeMs)

			if (safeDuration <= 0 && !hasServerEndTime) {
				setPhaseTimeLeft(0)
				return
			}

			const fallbackEndTimeMs = Date.now() + safeDuration * 1000
			const targetEndTimeMs = hasServerEndTime
				? Number(endTimeMs)
				: fallbackEndTimeMs

			const tick = () => {
				const secondsLeft = getSecondsLeft(
					targetEndTimeMs,
					serverTimeOffsetRef.current,
				)

				setPhaseTimeLeft(secondsLeft)

				if (secondsLeft <= 0) {
					stopTimer()
				}
			}

			tick()
			intervalRef.current = setInterval(tick, 1000)
		},
		[setPhaseTimeLeft, stopTimer],
	)

	const syncTimerWithServer = useCallback(
		(game: ExtendedGameState) => {
			if (!game?.phase) {
				setPhaseTimeLeft(0)
				stopTimer()
				return
			}

			const phaseKey = getPhaseKey(game)
			const parsedEndTimeMs = game.phaseEndTime
				? new Date(String(game.phaseEndTime)).getTime()
				: NaN
			const hasValidEndTime = Number.isFinite(parsedEndTimeMs)

			if (!hasValidEndTime) {
				const fallbackDuration = toSafeSeconds(game.phaseDuration, 0)

				if (fallbackDuration <= 0) {
					setPhaseTimeLeft(0)
					stopTimer()
					return
				}

				if (snapshotRef.current.phaseKey !== phaseKey) {
					const fallbackEndTimeMs = Date.now() + fallbackDuration * 1000

					snapshotRef.current = {
						phaseKey,
						endTimeMs: fallbackEndTimeMs,
					}

					startTimer(fallbackDuration, fallbackEndTimeMs)
				}

				return
			}

			snapshotRef.current = {
				phaseKey,
				endTimeMs: parsedEndTimeMs,
			}

			const secondsLeft = getSecondsLeft(
				parsedEndTimeMs,
				serverTimeOffsetRef.current,
			)

			setPhaseTimeLeft(secondsLeft)

			if (secondsLeft > 0) {
				startTimer(secondsLeft, parsedEndTimeMs)
			} else {
				stopTimer()
			}
		},
		[setPhaseTimeLeft, startTimer, stopTimer],
	)

	const syncServerTime = useCallback(async () => {
		try {
			const requestStartedAt = Date.now()
			const response = await fetch('/api/time', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
			})

			if (!response.ok) return

			const data = (await response.json()) as { timestamp?: unknown }
			const serverTimestamp = Number(data?.timestamp)

			if (!Number.isFinite(serverTimestamp)) return

			const responseReceivedAt = Date.now()
			const roundTripTime = responseReceivedAt - requestStartedAt
			const estimatedServerTime = serverTimestamp + roundTripTime / 2
			const offset = estimatedServerTime - responseReceivedAt

			if (
				Number.isFinite(offset) &&
				Math.abs(offset) <= MAX_ACCEPTED_SERVER_OFFSET_MS
			) {
				serverTimeOffsetRef.current = offset
			}
		} catch {
		}
	}, [])

	useEffect(() => {
		syncServerTime()

		const interval = setInterval(syncServerTime, TIMER_SYNC_INTERVAL_MS)

		return () => clearInterval(interval)
	}, [syncServerTime])

	useEffect(() => {
		return () => stopTimer()
	}, [stopTimer])

	return {
		phaseTimeLeft,
		startTimer,
		stopTimer,
		syncTimerWithServer,
		setPhaseTimeLeft,
	}
}
