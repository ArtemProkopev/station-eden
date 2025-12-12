'use client'

import { useState, useEffect, useCallback } from 'react'
import { GamePhase, Card, GamePlayer, Crisis } from '../types/game.types'

interface GameLogic {
  phase: GamePhase
  round: number
  timeLeft: number
  players: GamePlayer[]
  currentCrisis: Crisis | null
  revealedCards: Record<string, Card[]>
  handlePhaseAction: () => Promise<void>
  handleRevealCard: (playerId: string, cardId: string) => Promise<void>
  handleVote: (voterId: string, targetPlayerId: string) => Promise<void>
  handleCrisisSolution: (solution: string) => Promise<void>
  startTimer: (duration: number) => void
  syncWithServer: () => Promise<void>
}

const API_BASE = '/api/game'

export const useGameLogic = (gameId: string, initialPlayers: any[] = []) => {
  const [phase, setPhase] = useState<GamePhase>('preparation')
  const [round, setRound] = useState(1)
  const [timeLeft, setTimeLeft] = useState(60)
  const [players, setPlayers] = useState<GamePlayer[]>([])
  const [currentCrisis, setCurrentCrisis] = useState<Crisis | null>(null)
  const [revealedCards, setRevealedCards] = useState<Record<string, Card[]>>({})
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  // Загрузка игры с сервера
  const loadGameFromServer = useCallback(async () => {
    try {
      console.log('🔄 Loading game from server:', gameId)
      const response = await fetch(`${API_BASE}/${gameId}`)
      if (!response.ok) throw new Error('Failed to load game')
      
      const gameData = await response.json()
      console.log('✅ Game loaded:', gameData)
      
      if (gameData.status === 'active') {
        setPhase(gameData.phase)
        setRound(gameData.round)
        setTimeLeft(gameData.timeLeft)
        setPlayers(gameData.players || [])
        setCurrentCrisis(gameData.currentCrisis)
        setRevealedCards(gameData.revealedCards || {})
      }
      
      return gameData
    } catch (error) {
      console.error('❌ Error loading game:', error)
      return null
    }
  }, [gameId])

  // Синхронизация с сервером
  const syncWithServer = useCallback(async () => {
    if (isSyncing) return
    
    setIsSyncing(true)
    try {
      const response = await fetch(`${API_BASE}/${gameId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_game' })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.game) {
          setPhase(data.game.phase)
          setRound(data.game.round)
          setTimeLeft(data.game.timeLeft)
          setPlayers(data.game.players || [])
          setCurrentCrisis(data.game.currentCrisis)
          setRevealedCards(data.game.revealedCards || {})
        }
      }
    } catch (error) {
      console.error('❌ Error syncing with server:', error)
    } finally {
      setIsSyncing(false)
    }
  }, [gameId, isSyncing])

  // Отправка действия на сервер
  const sendGameAction = useCallback(async (action: string, data: any = {}) => {
    try {
      const response = await fetch(`${API_BASE}/${gameId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data })
      })
      
      if (!response.ok) throw new Error('API error')
      return await response.json()
    } catch (error) {
      console.error('❌ API action failed:', error)
      throw error
    }
  }, [gameId])

  // Таймер
  const startTimer = useCallback((duration: number) => {
    if (timerInterval) {
      clearInterval(timerInterval)
    }
    
    setTimeLeft(duration)
    
    const interval = setInterval(async () => {
      setTimeLeft(prev => {
        const newTime = prev - 1
        if (newTime <= 0) {
          clearInterval(interval)
          handleTimeUp()
          return 0
        }
        return newTime
      })
      
      // Синхронизируем таймер с сервером каждые 10 секунд
      if (timeLeft % 10 === 0) {
        await sendGameAction('update_timer', { timeLeft: timeLeft - 1 })
      }
    }, 1000)
    
    setTimerInterval(interval)
  }, [timerInterval, timeLeft, sendGameAction])

  // Обработка окончания времени
  const handleTimeUp = useCallback(async () => {
    console.log('⏰ Time up! Current phase:', phase)
    
    try {
      const result = await sendGameAction('phase_action')
      if (result.success && result.game) {
        // Обновляем локальное состояние с серверными данными
        setPhase(result.game.phase)
        setRound(result.game.round)
        setTimeLeft(result.game.timeLeft)
        setPlayers(result.game.players || [])
        setCurrentCrisis(result.game.currentCrisis)
        setRevealedCards(result.game.revealedCards || {})
      } else {
        // Fallback к локальной логике
        handleLocalTimeUp()
      }
    } catch (error) {
      console.error('❌ Error processing phase end:', error)
      handleLocalTimeUp()
    }
  }, [phase, sendGameAction])

  // Локальная обработка окончания времени (fallback)
  const handleLocalTimeUp = useCallback(() => {
    console.log('🔄 Using local time up logic')
    switch (phase) {
      case 'preparation':
        setPhase('discussion')
        startTimer(180)
        break
      case 'discussion':
        setPhase('voting')
        startTimer(60)
        break
      case 'voting':
        setPhase('reveal')
        startTimer(30)
        break
      case 'reveal':
        if (round >= 3) {
          setPhase('crisis')
          generateLocalCrisis()
        } else {
          setPhase('discussion')
          setRound(prev => prev + 1)
          startTimer(180)
        }
        break
      case 'crisis':
        setPhase('discussion')
        setRound(prev => prev + 1)
        startTimer(180)
        setCurrentCrisis(null)
        break
    }
  }, [phase, round, startTimer])

  // Генерация локального кризиса
  const generateLocalCrisis = useCallback(() => {
    const crisis: Crisis = {
      id: 'local-crisis',
      type: 'technological',
      title: 'Локальный кризис',
      description: 'Тестовый кризис (локальный режим)',
      priority: ['Инженер', 'Техник'],
      penalty: '-1 место',
      duration: 120,
      solutions: ['Решение 1', 'Решение 2', 'Решение 3']
    }
    setCurrentCrisis(crisis)
    startTimer(crisis.duration)
  }, [startTimer])

  // Раскрытие карты
  const handleRevealCard = useCallback(async (playerId: string, cardId: string) => {
    console.log(`🃏 Revealing card: ${cardId} for player: ${playerId}`)
    
    try {
      const result = await sendGameAction('reveal_card', { playerId, cardId })
      if (result.success) {
        // Синхронизируем состояние после успешного раскрытия
        await syncWithServer()
      } else {
        throw new Error('Server rejected card reveal')
      }
    } catch (error) {
      console.error('❌ Error revealing card, using local logic:', error)
      // Локальный fallback
      setPlayers(prevPlayers =>
        prevPlayers.map(player => {
          if (player.id === playerId) {
            const updatedCards = player.cards.map(card =>
              card.id === cardId ? { ...card, isRevealed: true } : card
            )
            
            setRevealedCards(prev => ({
              ...prev,
              [playerId]: [...(prev[playerId] || []), { ...player.cards.find(c => c.id === cardId)!, isRevealed: true }]
            }))
            
            return {
              ...player,
              cards: updatedCards,
              hasRevealedCard: true
            }
          }
          return player
        })
      )
    }
  }, [sendGameAction, syncWithServer])

  // Голосование
  const handleVote = useCallback(async (voterId: string, targetPlayerId: string) => {
    console.log(`🗳️ Player ${voterId} voting against ${targetPlayerId}`)
    
    try {
      const result = await sendGameAction('vote', { voterId, targetPlayerId })
      if (result.success) {
        await syncWithServer()
      } else {
        throw new Error('Server rejected vote')
      }
    } catch (error) {
      console.error('❌ Error voting, using local logic:', error)
      // Локальный fallback
      setPlayers(prevPlayers =>
        prevPlayers.map(player => 
          player.id === voterId 
            ? { ...player, votedFor: targetPlayerId }
            : player
        )
      )
    }
  }, [sendGameAction, syncWithServer])

  // Действие по фазе
  const handlePhaseAction = useCallback(async () => {
    console.log('🎮 Phase action triggered:', phase)
    
    try {
      const result = await sendGameAction('phase_action')
      if (result.success && result.game) {
        // Обновляем состояние с сервера
        setPhase(result.game.phase)
        setRound(result.game.round)
        setTimeLeft(result.game.timeLeft)
        setPlayers(result.game.players || [])
        setCurrentCrisis(result.game.currentCrisis)
      } else {
        throw new Error('Server rejected phase action')
      }
    } catch (error) {
      console.error('❌ Error in phase action, using local logic:', error)
      // Локальный fallback
      switch (phase) {
        case 'discussion':
          setPhase('voting')
          startTimer(60)
          break
        case 'voting':
          setPhase('reveal')
          startTimer(30)
          break
        case 'reveal':
          if (round >= 3) {
            setPhase('crisis')
            generateLocalCrisis()
          } else {
            setPhase('discussion')
            setRound(prev => prev + 1)
            startTimer(180)
          }
          break
        case 'crisis':
          setPhase('discussion')
          setRound(prev => prev + 1)
          startTimer(180)
          setCurrentCrisis(null)
          break
      }
    }
  }, [phase, round, sendGameAction, startTimer, generateLocalCrisis])

  // Решение кризиса
  const handleCrisisSolution = useCallback(async (solution: string) => {
    console.log('🚨 Solving crisis with solution:', solution)
    
    try {
      const result = await sendGameAction('solve_crisis', { solution })
      if (result.success) {
        await syncWithServer()
      } else {
        throw new Error('Server rejected crisis solution')
      }
    } catch (error) {
      console.error('❌ Error solving crisis, using local logic:', error)
      setPhase('discussion')
      setRound(prev => prev + 1)
      startTimer(180)
      setCurrentCrisis(null)
    }
  }, [sendGameAction, syncWithServer, startTimer])

  // Инициализация игры
  useEffect(() => {
    if (gameId) {
      loadGameFromServer()
    }
  }, [gameId, loadGameFromServer])

  // Запуск таймера при загрузке
  useEffect(() => {
    if (phase === 'preparation' && players.length > 0) {
      startTimer(60)
    }
  }, [phase, players, startTimer])

  // Периодическая синхронизация
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (!isSyncing) {
        syncWithServer()
      }
    }, 30000) // Синхронизация каждые 30 секунд
    
    return () => clearInterval(syncInterval)
  }, [isSyncing, syncWithServer])

  // Очистка таймера
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval)
      }
    }
  }, [timerInterval])

  return {
    phase,
    round,
    timeLeft,
    players,
    currentCrisis,
    revealedCards,
    handlePhaseAction,
    handleRevealCard,
    handleVote,
    handleCrisisSolution,
    startTimer,
    syncWithServer
  }
}