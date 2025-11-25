// apps/web/src/hooks/useAuthLock.ts
import { useState, useEffect, useRef, useCallback } from 'react'
import { LockPayload } from '@station-eden/shared'
import { readLock, writeLock, clearLock, formatRemaining } from '@/src/utils/authLock'

interface UseAuthLockReturn {
  lockedUntilIso: string | null
  setLockedUntilIso: (iso: string | null) => void
  countdown: string | null
  attemptsLeft: number | null
  setAttemptsLeft: (attempts: number | null) => void
  locked: boolean
}

export const useAuthLock = (): UseAuthLockReturn => {
  const [lockedUntilIso, setLockedUntilIso] = useState<string | null>(null)
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null)
  const [countdown, setCountdown] = useState<string | null>(null)
  
  const timerRef = useRef<number | null>(null)

  // Восстановление из localStorage
  useEffect(() => {
    const applyFromStorage = () => {
      const saved = readLock()
      if (!saved) return
      const until = Date.parse(saved.lockedUntilIso)
      if (!Number.isNaN(until) && until > Date.now()) {
        setLockedUntilIso(saved.lockedUntilIso)
        setAttemptsLeft(null)
      } else {
        clearLock()
      }
    }

    applyFromStorage()
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') applyFromStorage()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Таймер обратного отсчета
  useEffect(() => {
    if (!lockedUntilIso) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setCountdown(null)
      return
    }

    const updateCountdown = () => {
      const until = Date.parse(lockedUntilIso)
      const rem = until - Date.now()
      
      if (rem <= 0) {
        setLockedUntilIso(null)
        setCountdown(null)
        setAttemptsLeft(null)
        clearLock()
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      } else {
        setCountdown(formatRemaining(rem))
      }
    }

    updateCountdown()
    timerRef.current = window.setInterval(updateCountdown, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [lockedUntilIso])

  const handleSetLockedUntilIso = useCallback((iso: string | null) => {
    setLockedUntilIso(iso)
  }, [])

  const handleSetAttemptsLeft = useCallback((attempts: number | null) => {
    setAttemptsLeft(attempts)
  }, [])

  return {
    lockedUntilIso,
    setLockedUntilIso: handleSetLockedUntilIso,
    countdown,
    attemptsLeft,
    setAttemptsLeft: handleSetAttemptsLeft,
    locked: Boolean(lockedUntilIso && countdown)
  }
}