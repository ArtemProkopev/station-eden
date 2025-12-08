// apps/web/src/lib/websocketUtils.ts
/**
 * Утилиты для управления WebSocket соединениями
 */

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
					name.includes('lobby')
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
export function hasAccessToken(): boolean {
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
