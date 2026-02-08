// apps/web/src/lib/websocketUtils.ts
/**
 * Закрытие всех WebSocket соединений
 */
export function closeAllWebSockets(): void {
	if (typeof window === 'undefined') return

	console.log('[WebSocketUtils] Closing all WebSocket connections')

	try {
		const connections = (window as any)._websocketConnections as Set<WebSocket>
		if (connections && connections.size > 0) {
			// Создаем копию массива соединений, так как они будут удаляться при закрытии
			const connectionsArray = Array.from(connections)

			connectionsArray.forEach(ws => {
				try {
					if (
						ws.readyState === WebSocket.OPEN ||
						ws.readyState === WebSocket.CONNECTING
					) {
						ws.close(1000, 'User logged out')
					}
				} catch (error) {
					console.warn('[WebSocketUtils] Failed to close WebSocket:', error)
				}
			})

			connections.clear()
		}
	} catch (error) {
		console.error('[WebSocketUtils] Error closing WebSockets:', error)
	}
}

/**
 * Создание WebSocket соединения для игры
 */
function createGameWebSocket(gameId: string): WebSocket | null {
	if (typeof window === 'undefined') return null

	const wsBase = process.env.NEXT_PUBLIC_WS_BASE || 'ws://localhost:4000'
	const wsUrl = `${wsBase}?gameId=${encodeURIComponent(gameId)}`
	
	try {
		const ws = new WebSocket(wsUrl)
		
		// Сохраняем соединение для последующего управления
		if (!(window as any)._websocketConnections) {
			(window as any)._websocketConnections = new Set()
		}
		(window as any)._websocketConnections.add(ws)
		
		return ws
	} catch (error) {
		console.error('[WebSocketUtils] Failed to create game WebSocket:', error)
		return null
	}
}

/**
 * Очистка WebSocket кэша
 */
export async function clearWebSocketCache(): Promise<void> {
	try {
		if ('caches' in window) {
			const cacheNames = await caches.keys()
			const wsCacheNames = cacheNames.filter(
				name =>
					name.includes('websocket') ||
					name.includes('ws') ||
					name.includes('socket') ||
					name.includes('lobby') ||
					name.includes('game')
			)

			await Promise.all(wsCacheNames.map(name => caches.delete(name)))
			console.log(
				'[WebSocketUtils] Cache cleared:',
				wsCacheNames.length,
				'items'
			)
		}
	} catch (error) {
		console.error('[WebSocketUtils] Failed to clear cache:', error)
	}
}

/**
 * Проверка наличия access_token
 */
function hasAccessToken(): boolean {
	if (typeof document === 'undefined') return false
	return document.cookie.includes('access_token=')
}

/**
 * Проверка флага принудительного логаута
 */
export function isForcedLogout(): boolean {
	if (typeof window === 'undefined') return false
	return !!(window as any).__FORCED_LOGOUT__
}

/**
 * Генерация уникального ID для игры
 */
function generateGameId(): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID().replace(/-/g, '').substring(0, 8)
	}
	
	// Fallback для старых браузеров
	const timestamp = Date.now().toString(36)
	const random = Math.random().toString(36).substring(2, 10)
	return (timestamp + random).substring(0, 8)
}