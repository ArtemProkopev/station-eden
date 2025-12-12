'use client'

import { useState, useEffect } from 'react'

export const useGame = (gameId: string) => {
  const [isLoading, setIsLoading] = useState(true)
  const [phase, setPhase] = useState('preparation')
  const [round, setRound] = useState(1)
  const [timeLeft, setTimeLeft] = useState(60)

  useEffect(() => {
    // Симуляция загрузки
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const handlePhaseAction = () => {
    console.log('Phase action')
  }

  return {
    isLoading,
    phase,
    round,
    timeLeft,
    handlePhaseAction
  }
}