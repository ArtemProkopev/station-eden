import { useWebSocket } from '@/hooks/useWebSocket'

export function useGameSocket(
	baseUrl: string,
	onMessage: (data: any) => void,
	gameId: string
) {
	if (!gameId) {
		throw new Error('useGameSocket: gameId is required')
	}

	return useWebSocket(baseUrl, onMessage, { gameId }, { path: '/game' })
}
