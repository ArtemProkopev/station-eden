// apps/web/src/app/game/[gameId]/hooks/useGameTimer.ts
import { useState, useCallback, useEffect, useRef } from 'react'
import { GameState } from '../types/game.types'

export function useGameTimer() {
  const [phaseTimeLeft, setPhaseTimeLeft] = useState<number>(0)
  const [timerInterval, setTimerInterval] = useState<ReturnType<typeof setInterval> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      setTimerInterval(null)
    }
  }, [])

  const startTimer = useCallback(
    (duration: number) => {
      // Останавливаем предыдущий таймер
      stopTimer()

      if (duration <= 0) {
        setPhaseTimeLeft(0)
        return
      }

      console.log(`Starting timer with duration: ${duration} seconds`)
      
      // Устанавливаем начальное время
      setPhaseTimeLeft(duration)

      // Запускаем новый интервал
      const interval = setInterval(() => {
        setPhaseTimeLeft(prev => {
          if (prev <= 1) {
            console.log('Timer finished')
            // Время вышло, очищаем интервал
            clearInterval(interval)
            intervalRef.current = null
            setTimerInterval(null)
            return 0
          }
          const newValue = prev - 1
          console.log(`Timer tick: ${newValue}`)
          return newValue
        })
      }, 1000)

      intervalRef.current = interval
      setTimerInterval(interval)
    },
    [stopTimer],
  )

  const syncTimerWithServer = useCallback(
    (game: GameState) => {
      if (!game?.phase || !game.phaseEndTime) {
        setPhaseTimeLeft(0)
        stopTimer()
        return
      }

      const now = Date.now()
      const endTime = new Date(String(game.phaseEndTime)).getTime()
      const secondsLeft = Math.max(0, Math.floor((endTime - now) / 1000))

      console.log(`Syncing timer with server: ${secondsLeft} seconds left`)

      setPhaseTimeLeft(secondsLeft)

      if (secondsLeft > 0) {
        startTimer(secondsLeft)
      } else {
        stopTimer()
      }
    },
    [startTimer, stopTimer],
  )

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      stopTimer()
    }
  }, [stopTimer])

  return {
    phaseTimeLeft,
    startTimer,
    stopTimer,
    syncTimerWithServer,
    setPhaseTimeLeft,
  }
}