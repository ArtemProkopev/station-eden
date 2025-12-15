import { useGameSocket } from '@/hooks/useGameSocket'
import { GameState } from '@station-eden/shared'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

export function useGame(gameId?: string) {
	const router = useRouter()
	const [gameState, setGameState] = useState<GameState | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string>('')
	const [players, setPlayers] = useState<any[]>([])

	const normalizePlayers = useCallback((gs: any) => {
		if (!gs) return gs
		if (Array.isArray(gs.players)) {
			gs.players = gs.players.map((p: any) => ({
				...p,
				isAlive: p?.isAlive !== false,
			}))
		}
		return gs
	}, [])

	const handleWebSocketMessage = useCallback(
		(data: any) => {
			if (!data?.type) return

			switch (data.type) {
				case 'GAME_STATE': {
					const gs = normalizePlayers(data.gameState)
					setGameState(gs)
					setPlayers(gs?.players || [])
					setIsLoading(false)
					break
				}

				case 'GAME_UPDATE': {
					if (data.gameState) {
						const gs = normalizePlayers(data.gameState)
						setGameState(gs)
						setPlayers(gs?.players || [])
					}
					break
				}

				case 'PLAYER_LEFT_GAME': {
					setPlayers(prev => prev.filter(p => p.id !== data.playerId))
					break
				}

				case 'ERROR': {
					setError(data.message || 'Ошибка в игре')
					setIsLoading(false)
					break
				}

				case 'GAME_FINISHED': {
					if (data.gameState) {
						const gs = normalizePlayers(data.gameState)
						setGameState(gs)
						setPlayers(gs?.players || [])
					}
					break
				}
			}
		},
		[normalizePlayers]
	)

	// socket.io-client нужен http(s)
	const wsBase = process.env.NEXT_PUBLIC_WS_BASE || 'http://localhost:4000'

	const { sendMessage: sendWS, isConnected } = useGameSocket(
		wsBase,
		handleWebSocketMessage,
		gameId || ''
	)

	useEffect(() => {
		if (!gameId) {
			router.push('/')
			return
		}

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

	const handleGameAction = useCallback(
		(action: string, payload?: any) => {
			sendWS({ type: 'GAME_ACTION', action, payload, gameId })
		},
		[sendWS, gameId]
	)

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
