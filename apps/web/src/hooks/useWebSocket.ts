// apps/web/src/hooks/useWebSocket.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { isForcedLogout } from '../lib/websocketUtils'

interface WebSocketMessage {
	type: string
	[key: string]: any
}

interface CommonSocket {
	on(event: string, callback: (data: any) => void): CommonSocket
	emit(event: string, data?: any): CommonSocket
	disconnect(): void
	onAny?(callback: (eventName: string, ...args: any[]) => void): CommonSocket
}

export type UseWebSocketOptions = {
	/**
	 * Engine.IO path (на сервере NestJS это WebSocketGateway({ path: ... }))
	 * ДОЛЖЕН быть явно указан: '/lobby' или '/game'
	 */
	path: '/lobby' | '/game'
	debugAllEvents?: boolean
	/**
	 * Управляет тем, подключаться ли к сокету вообще.
	 * Если false — соединение не создаём.
	 */
	enabled?: boolean
}

function safeParseUrl(input: string) {
	const trimmed = (input || '').trim()
	if (!trimmed) return null
	try {
		return new URL(trimmed)
	} catch {
		try {
			return new URL(`https://${trimmed}`)
		} catch {
			return null
		}
	}
}

export const useWebSocket = (
	baseUrl: string,
	onMessage: (data: WebSocketMessage) => void,
	params?: Record<string, string | number | boolean | undefined>,
	options?: UseWebSocketOptions
) => {
	const socket = useRef<CommonSocket | null>(null)
	const [isConnected, setIsConnected] = useState(false)
	const shouldReconnectRef = useRef(true)

	const onMessageRef = useRef(onMessage)
	useEffect(() => {
		onMessageRef.current = onMessage
	}, [onMessage])

	// ✅ path обязателен: убираем "молчаливый" дефолт '/lobby'
	const socketPath = options?.path
	if (!socketPath) {
		throw new Error(
			'[useWebSocket] options.path is required: "/lobby" or "/game"'
		)
	}

	const isProd = process.env.NODE_ENV === 'production'
	const debugAllEvents = options?.debugAllEvents ?? !isProd
	const enabled = options?.enabled ?? true

	// ✅ Защита ОТ ВСЕХ сред (включая prod)
	// gameId не может идти в /lobby, lobbyId не может идти в /game
	const hasGameId =
		!!params && Object.prototype.hasOwnProperty.call(params, 'gameId')
	const hasLobbyId =
		!!params && Object.prototype.hasOwnProperty.call(params, 'lobbyId')

	if (hasGameId && socketPath !== '/game') {
		throw new Error(
			'[useWebSocket] Mismatch: gameId passed with non-/game socket path'
		)
	}
	if (hasLobbyId && socketPath !== '/lobby') {
		throw new Error(
			'[useWebSocket] Mismatch: lobbyId passed with non-/lobby socket path'
		)
	}

	// ✅ baseUrl нормализуем до origin
	const resolvedIoUrl = useMemo(() => {
		const u = safeParseUrl(baseUrl)
		if (!u) return baseUrl
		return `${u.origin}`
	}, [baseUrl])

	// ✅ ключ для пересоздания сокета при изменении query
	const paramsKey = useMemo(() => JSON.stringify(params || {}), [params])

	const forceDisconnect = useCallback(() => {
		shouldReconnectRef.current = false
		if (socket.current) {
			socket.current.disconnect()
			socket.current = null
		}
		setIsConnected(false)
	}, [])

	useEffect(() => {
		// ✅ если выключено — не создаём сокет вообще
		if (!enabled) {
			if (debugAllEvents)
				console.log('[useWebSocket] disabled, skipping connection')
			return
		}

		if (isForcedLogout()) {
			if (debugAllEvents) {
				console.log('[useWebSocket] Skipping connection due to forced logout')
			}
			return
		}

		const currentSocket = io(resolvedIoUrl, {
			path: socketPath,
			query: params || {},
			transports: ['websocket'],
			withCredentials: true,
			autoConnect: true,
			reconnection: shouldReconnectRef.current,
			reconnectionAttempts: 5,
			reconnectionDelay: 1000,
			reconnectionDelayMax: 5000,
			timeout: 20000,
		}) as unknown as CommonSocket

		socket.current = currentSocket

		const handleConnect = () => {
			if (debugAllEvents) console.log('[useWebSocket] WebSocket connected')
			setIsConnected(true)
		}

		const handleDisconnect = (reason: string) => {
			if (debugAllEvents) {
				console.log(`[useWebSocket] WebSocket disconnected: ${reason}`)
			}
			setIsConnected(false)

			if (
				reason === 'io server disconnect' ||
				(reason && reason.includes('auth'))
			) {
				if (debugAllEvents) {
					console.log(
						'[useWebSocket] Not reconnecting (server disconnect or auth error)'
					)
				}
				shouldReconnectRef.current = false
				return
			}

			if (isForcedLogout()) {
				if (debugAllEvents) {
					console.log('[useWebSocket] Not reconnecting due to forced logout')
				}
				shouldReconnectRef.current = false
				return
			}
		}

		const handleConnectError = (error: Error) => {
			console.error('[useWebSocket] WebSocket connection error:', error)
			setIsConnected(false)
		}

		const handleError = (data: any) => {
			console.error('[useWebSocket] Server error:', data?.message ?? data)

			if (
				data?.message === 'Authentication required' ||
				data?.message === 'Invalid authentication token'
			) {
				if (debugAllEvents) {
					console.log('[useWebSocket] Authentication error, closing connection')
				}
				forceDisconnect()
			}

			onMessageRef.current?.({ type: 'ERROR', ...(data || {}) })
		}

		const handleGenericEvent = (eventName: string, data: any) => {
			if (debugAllEvents) {
				console.log(`[useWebSocket] Event ${eventName}:`, data)
			}
			onMessageRef.current?.({ type: eventName, ...(data || {}) })
		}

		currentSocket.on('connect', handleConnect)
		currentSocket.on('disconnect', handleDisconnect)
		currentSocket.on('connect_error', handleConnectError)
		currentSocket.on('ERROR', handleError)

		if (currentSocket.onAny) {
			currentSocket.onAny(handleGenericEvent)
		}

		const handleLogout = () => {
			if (debugAllEvents) {
				console.log('[useWebSocket] Logout event received, disconnecting')
			}
			forceDisconnect()
		}

		const handleSessionChanged = (e: Event) => {
			const customEvent = e as CustomEvent
			if (customEvent?.detail?.loggedIn === false) {
				if (debugAllEvents) {
					console.log(
						'[useWebSocket] Session changed to logged out, disconnecting'
					)
				}
				forceDisconnect()
			}
		}

		if (typeof window !== 'undefined') {
			window.addEventListener('logout', handleLogout)
			window.addEventListener('session-changed', handleSessionChanged)
		}

		return () => {
			if (typeof window !== 'undefined') {
				window.removeEventListener('logout', handleLogout)
				window.removeEventListener('session-changed', handleSessionChanged)
			}
			currentSocket.disconnect()
			socket.current = null
		}
	}, [
		resolvedIoUrl,
		socketPath,
		paramsKey,
		debugAllEvents,
		forceDisconnect,
		enabled,
	])

	const sendMessage = useCallback(
		(message: WebSocketMessage) => {
			if (isForcedLogout()) {
				if (debugAllEvents) {
					console.log('[useWebSocket] Cannot send message - forced logout')
				}
				return false
			}

			if (!socket.current || !isConnected) {
				if (debugAllEvents) {
					console.warn('[useWebSocket] Cannot send message - not connected')
				}
				return false
			}

			try {
				if (
					message?.type === 'SEND_MESSAGE' &&
					typeof message?.message?.text === 'string'
				) {
					message.message.text = message.message.text.slice(0, 300)
				}

				if (debugAllEvents) {
					console.log('[useWebSocket] Sending:', message.type, message)
				}

				socket.current.emit(message.type, message)
				return true
			} catch (error) {
				console.error('[useWebSocket] Failed to send message:', error)
				return false
			}
		},
		[isConnected, debugAllEvents]
	)

	return { sendMessage, isConnected }
}
