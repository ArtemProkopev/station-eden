import { useWebSocket } from '@/hooks/useWebSocket'

export function useLobbySocket(
	baseUrl: string,
	onMessage: (data: any) => void,
	lobbyId: string
) {
	if (!lobbyId) {
		throw new Error('useLobbySocket: lobbyId is required')
	}

	return useWebSocket(baseUrl, onMessage, { lobbyId }, { path: '/lobby' })
}
