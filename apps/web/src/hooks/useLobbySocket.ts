// apps/web/src/hooks/useLobbySocket.ts
import { useWebSocket, WebSocketMessage } from '@/hooks/useWebSocket'

export function useLobbySocket(
	baseUrl: string,
	onMessage: (data: WebSocketMessage) => void,
	lobbyId: string,
) {
	if (!lobbyId) {
		throw new Error('useLobbySocket: lobbyId is required')
	}

	return useWebSocket(baseUrl, onMessage, { lobbyId }, { path: '/lobby' })
}
