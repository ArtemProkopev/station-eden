// apps/web/src/hooks/useGameSocket.ts
import { useWebSocket, WebSocketMessage } from '@/hooks/useWebSocket'

export function useGameSocket(
	baseUrl: string,
	onMessage: (data: WebSocketMessage) => void,
	gameId: string,
) {
	if (!gameId) {
		throw new Error('useGameSocket: gameId is required')
	}

	return useWebSocket(baseUrl, onMessage, { gameId }, { path: '/game' })
}

export default useGameSocket
