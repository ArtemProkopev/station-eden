// apps/web/src/app/game/hooks/useGame.ts
import { useWebSocket, WebSocketMessage } from '@/hooks/useWebSocket'
import { GameState } from '@station-eden/shared'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

type GamePlayer = {
	id: string
	isAlive?: boolean
	[key: string]: unknown
}

function isRecord(v: unknown): v is Record<string, unknown> {
	return !!v && typeof v === 'object' && !Array.isArray(v)
}

function isGameState(v: unknown): v is GameState {
	// минимальный shape-check под TS2352
	if (!isRecord(v)) return false
	return (
		typeof v.id === 'string' &&
		typeof v.lobbyId === 'string' &&
		typeof v.status === 'string' &&
		Array.isArray(v.players)
	)
}

function normalizePlayersFromState(state: GameState): GameState {
	const s = state as unknown as Record<string, unknown>
	const playersRaw = s.players
	if (!Array.isArray(playersRaw)) return state

	const normalizedPlayers: GamePlayer[] = playersRaw
		.map(p => (isRecord(p) ? (p as GamePlayer) : null))
		.filter((p): p is GamePlayer => !!p && typeof p.id === 'string')
		.map(p => ({
			...p,
			isAlive: p.isAlive !== false,
		}))

	// возвращаем новый объект с players (без unsafe cast Record->GameState)
	return {
		...state,
		players: normalizedPlayers as unknown as GameState['players'],
	}
}

export function useGame(gameId?: string) {
	const router = useRouter()
	const [gameState, setGameState] = useState<GameState | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string>('')
	const [players, setPlayers] = useState<GamePlayer[]>([])

	const handleWebSocketMessage = useCallback((data: WebSocketMessage) => {
		if (!data?.type) return

		switch (data.type) {
			case 'GAME_STATE': {
				const candidate = (data as Record<string, unknown>).gameState
				if (isGameState(candidate)) {
					const gs = normalizePlayersFromState(candidate)
					setGameState(gs)
					setPlayers((gs.players as unknown as GamePlayer[]) ?? [])
					setIsLoading(false)
				}
				break
			}

			case 'GAME_UPDATE': {
				const candidate = (data as Record<string, unknown>).gameState
				if (isGameState(candidate)) {
					const gs = normalizePlayersFromState(candidate)
					setGameState(gs)
					setPlayers((gs.players as unknown as GamePlayer[]) ?? [])
				}
				break
			}

			case 'PLAYER_LEFT_GAME': {
				const playerId =
					typeof (data as Record<string, unknown>).playerId === 'string'
						? ((data as Record<string, unknown>).playerId as string)
						: ''
				if (playerId) setPlayers(prev => prev.filter(p => p.id !== playerId))
				break
			}

			case 'ERROR': {
				const msg =
					typeof (data as Record<string, unknown>).message === 'string'
						? ((data as Record<string, unknown>).message as string)
						: 'Ошибка в игре'
				setError(msg)
				setIsLoading(false)
				break
			}

			case 'GAME_FINISHED': {
				const candidate = (data as Record<string, unknown>).gameState
				if (isGameState(candidate)) {
					const gs = normalizePlayersFromState(candidate)
					setGameState(gs)
					setPlayers((gs.players as unknown as GamePlayer[]) ?? [])
				}
				break
			}
		}
	}, [])

	// socket.io-client нужен http(s)
	const wsBase = process.env.NEXT_PUBLIC_WS_BASE || 'http://localhost:4000'

	// ✅ ВАЖНО: game всегда должен ходить в path '/game'
	const { sendMessage: sendWS, isConnected } = useWebSocket(
		wsBase,
		handleWebSocketMessage,
		{ gameId },
		{ path: '/game' },
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
		if (!gameId) return
		if (window.confirm('Вы уверены, что хотите покинуть игру?')) {
			sendWS({ type: 'LEAVE_GAME', gameId })
			router.push('/lobby')
		}
	}, [sendWS, gameId, router])

	const handleGameAction = useCallback(
		(action: string, payload?: unknown) => {
			if (!gameId) return
			sendWS({ type: 'GAME_ACTION', action, payload, gameId })
		},
		[sendWS, gameId],
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
