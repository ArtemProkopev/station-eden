// apps/web/src/app/game/[gameId]/hooks/useGameTimer.ts
import { useState, useCallback, useEffect } from 'react'
import { GameState } from '../types/game.types'

export function useGameTimer() {
  const [phaseTimeLeft, setPhaseTimeLeft] = useState<number>(0)
  const [timerInterval, setTimerInterval] = useState<ReturnType<typeof setInterval> | null>(null)

  const stopTimer = useCallback(() => {
    if (timerInterval) {
      clearInterval(timerInterval)
      setTimerInterval(null)
    }
  }, [timerInterval])

  const startTimer = useCallback(
    (duration: number) => {
      stopTimer()

      if (duration <= 0) {
        setPhaseTimeLeft(0)
        return
      }

      setPhaseTimeLeft(duration)

      const interval = setInterval(() => {
        setPhaseTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval)
            setTimerInterval(null)
            return 0
          }
          return prev - 1
        })
      }, 1000)

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

      setPhaseTimeLeft(secondsLeft)

      if (secondsLeft > 0) {
        startTimer(secondsLeft)
      } else {
        stopTimer()
      }
    },
    [startTimer, stopTimer],
  )

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