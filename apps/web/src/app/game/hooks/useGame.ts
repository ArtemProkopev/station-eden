// apps/web/src/app/game/hooks/useGame.ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWebSocket } from '@/hooks/useWebSocket'
import { GameState } from '@station-eden/shared'

export function useGame(gameId?: string) {
  const router = useRouter()
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [players, setPlayers] = useState<any[]>([])

  const handleWebSocketMessage = useCallback((data: any) => {
    if (!data?.type) return

    switch (data.type) {
      case 'GAME_STATE':
        setGameState(data.gameState)
        setPlayers(data.gameState?.players || [])
        setIsLoading(false)
        break
        
      case 'GAME_UPDATE':
        if (data.gameState) {
          setGameState(data.gameState)
          setPlayers(data.gameState.players || [])
        }
        break
        
      case 'PLAYER_LEFT_GAME':
        setPlayers(prev => prev.filter(p => p.id !== data.playerId))
        break
        
      case 'ERROR':
        setError(data.message || 'Ошибка в игре')
        break
        
      case 'GAME_FINISHED':
        if (data.gameState) {
          setGameState(data.gameState)
          setPlayers(data.gameState.players || [])
        }
        break
    }
  }, [])

  const wsBase = process.env.NEXT_PUBLIC_WS_BASE || 'http://localhost:4000'
  const wsUrl = wsBase.startsWith('http') ? wsBase.replace('http', 'ws') : wsBase
  const { sendMessage: sendWS, isConnected } = useWebSocket(
    wsUrl,
    handleWebSocketMessage,
    { gameId }
  )

  useEffect(() => {
    if (!gameId) {
      router.push('/')
      return
    }

    // При подключении запрашиваем состояние игры
    if (isConnected) {
      sendWS({ type: 'JOIN_GAME', gameId })
    }
  }, [gameId, isConnected, sendWS, router])

  const handleLeaveGame = useCallback(() => {
    if (window.confirm('Вы уверены, что хотите покинуть игру?')) {
      sendWS({ type: 'LEAVE_GAME', gameId })
      router.push('/lobby')
    }
  }, [sendWS, gameId, router])

  const handleGameAction = useCallback((action: string, payload?: any) => {
    sendWS({ type: 'GAME_ACTION', action, ...payload })
  }, [sendWS])

  return {
    gameState,
    players,
    isLoading,
    error,
    isConnected,
    handleLeaveGame,
    handleGameAction,
  }
}