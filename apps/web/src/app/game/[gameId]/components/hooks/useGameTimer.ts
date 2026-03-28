// apps/web/src/app/game/[gameId]/hooks/useGameTimer.ts
import { ExtendedGameState } from '@station-eden/shared'
import { useCallback, useEffect, useRef, useState } from 'react'

export function useGameTimer() {
	const [phaseTimeLeft, setPhaseTimeLeft] = useState<number>(0)
	const [serverTimeOffset, setServerTimeOffset] = useState<number>(0)
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

	const stopTimer = useCallback(() => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current)
			intervalRef.current = null
		}
	}, [])

	const startTimer = useCallback(
		(duration: number, endTime?: number) => {
			stopTimer()

			if (duration <= 0 || isNaN(duration)) {
				setPhaseTimeLeft(0)
				return
			}

			// Если есть точное время окончания от сервера - используем его
			if (endTime && !isNaN(endTime)) {
				const updateTimer = () => {
					const now = Date.now() + (serverTimeOffset || 0)
					const remaining = Math.max(0, Math.floor((endTime - now) / 1000))
					
					if (!isNaN(remaining)) {
						setPhaseTimeLeft(remaining)
					}
					
					if (remaining <= 0) {
						stopTimer()
					}
				}
				
				updateTimer()
				const interval = setInterval(updateTimer, 1000)
				intervalRef.current = interval
				return
			}

			// Резервный вариант - простой обратный отсчет
			setPhaseTimeLeft(duration)
			const interval = setInterval(() => {
				setPhaseTimeLeft(prev => {
					if (prev <= 1) {
						clearInterval(interval)
						intervalRef.current = null
						return 0
					}
					return prev - 1
				})
			}, 1000)
			intervalRef.current = interval
		},
		[stopTimer, serverTimeOffset],
	)

	const syncTimerWithServer = useCallback(
		(game: ExtendedGameState) => {
			if (!game?.phase || !game.phaseEndTime) {
				setPhaseTimeLeft(0)
				stopTimer()
				return
			}

			try {
				// Используем скорректированное время
				const serverTime = Date.now() + (serverTimeOffset || 0)
				const endTime = new Date(String(game.phaseEndTime)).getTime()
				
				if (isNaN(endTime)) {
					console.error('Неверный формат phaseEndTime:', game.phaseEndTime)
					setPhaseTimeLeft(0)
					stopTimer()
					return
				}
				
				const secondsLeft = Math.max(0, Math.floor((endTime - serverTime) / 1000))

				if (!isNaN(secondsLeft)) {
					setPhaseTimeLeft(secondsLeft)
				}

				if (secondsLeft > 0) {
					startTimer(secondsLeft, endTime)
				} else {
					stopTimer()
				}
			} catch (error) {
				console.error('Ошибка синхронизации таймера:', error)
				setPhaseTimeLeft(0)
				stopTimer()
			}
		},
		[startTimer, stopTimer, serverTimeOffset],
	)

	// Синхронизация времени с сервером
	const syncServerTime = useCallback(async () => {
		try {
			const startTime = Date.now()
			const response = await fetch('/api/time', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include', // Важно для отправки cookies
			})
			
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`)
			}
			
			const data = await response.json()
			
			if (!data || typeof data.timestamp !== 'number') {
				throw new Error('Неверный формат ответа от сервера')
			}
			
			const endTime = Date.now()
			const roundTripTime = endTime - startTime
			const estimatedServerTime = data.timestamp + (roundTripTime / 2)
			const offset = estimatedServerTime - endTime
			
			if (!isNaN(offset)) {
				setServerTimeOffset(offset)
				console.log(`Смещение времени сервера: ${offset}ms (RTT: ${roundTripTime}ms)`)
			}
		} catch (error) {
			console.error('Не удалось синхронизировать время:', error)
			// Не сбрасываем offset, используем предыдущее значение
		}
	}, [])

	// Синхронизируем время каждую минуту
	useEffect(() => {
		syncServerTime()
		const interval = setInterval(syncServerTime, 60000)
		return () => clearInterval(interval)
	}, [syncServerTime])

	// Очистка при размонтировании
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