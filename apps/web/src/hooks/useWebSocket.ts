// apps/web/src/hooks/useWebSocket.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { isForcedLogout } from '../lib/websocketUtils'

type JsonObject = Record<string, unknown>

export type WebSocketMessage = {
	type: string
} & JsonObject

interface CommonSocket {
	on(event: string, callback: (data: unknown) => void): CommonSocket
	emit(event: string, data?: unknown): CommonSocket
	disconnect(): void
	onAny?(
		callback: (eventName: string, ...args: unknown[]) => void,
	): CommonSocket
}

type UseWebSocketOptions = {
	/**
	 * Engine.IO path (на сервере NestJS это WebSocketGateway({ path: ... }))
	 * ДОЛЖЕН быть явно указан: '/lobby' или '/game'
	 */
	path: '/lobby' | '/game'
	debugAllEvents?: boolean
	/**
	 * Управляет тем, подключаться ли к сокету вообще.
	 * Если false — соединение не создаём (и если было — отключаем).
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

function isRecord(v: unknown): v is Record<string, unknown> {
	return !!v && typeof v === 'object' && !Array.isArray(v)
}

export const useWebSocket = (
	baseUrl: string,
	onMessage: (data: WebSocketMessage) => void,
	params?: Record<string, string | number | boolean | undefined>,
	options?: UseWebSocketOptions,
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
			'[useWebSocket] options.path is required: "/lobby" or "/game"',
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
			'[useWebSocket] Mismatch: gameId passed with non-/game socket path',
		)
	}
	if (hasLobbyId && socketPath !== '/lobby') {
		throw new Error(
			'[useWebSocket] Mismatch: lobbyId passed with non-/lobby socket path',
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
		// ✅ если выключено — отключаем текущий сокет (если был) и выходим
		if (!enabled) {
			if (socket.current) {
				socket.current.disconnect()
				socket.current = null
			}
			setIsConnected(false)
			if (debugAllEvents) console.log('[useWebSocket] disabled, disconnected')
			return
		}

		if (isForcedLogout()) {
			if (debugAllEvents) {
				console.log('[useWebSocket] Skipping connection due to forced logout')
			}
			return
		}

		// ✅ FIX: если раньше был forceDisconnect() / shouldReconnectRef=false,
		// при нормальном enabled снова разрешаем реконнекты
		shouldReconnectRef.current = true

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

		const handleDisconnect = (reason: unknown) => {
			const reasonStr = typeof reason === 'string' ? reason : 'unknown'
			if (debugAllEvents) {
				console.log(`[useWebSocket] WebSocket disconnected: ${reasonStr}`)
			}
			setIsConnected(false)

			if (
				reasonStr === 'io server disconnect' ||
				(reasonStr && reasonStr.includes('auth'))
			) {
				if (debugAllEvents) {
					console.log(
						'[useWebSocket] Not reconnecting (server disconnect or auth error)',
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

		const handleConnectError = (error: unknown) => {
			console.error('[useWebSocket] WebSocket connection error:', error)
			setIsConnected(false)
		}

		const handleError = (data: unknown) => {
			const msg =
				isRecord(data) && typeof data.message === 'string'
					? data.message
					: undefined

			console.error('[useWebSocket] Server error:', msg ?? data)

			if (
				msg === 'Authentication required' ||
				msg === 'Invalid authentication token'
			) {
				if (debugAllEvents) {
					console.log('[useWebSocket] Authentication error, closing connection')
				}
				forceDisconnect()
			}

			const payload: WebSocketMessage = {
				type: 'ERROR',
				...(isRecord(data) ? data : {}),
			}
			onMessageRef.current?.(payload)
		}

		const handleGenericEvent = (eventName: string, data: unknown) => {
			if (debugAllEvents) {
				console.log(`[useWebSocket] Event ${eventName}:`, data)
			}
			const payload: WebSocketMessage = {
				type: eventName,
				...(isRecord(data) ? data : {}),
			}
			onMessageRef.current?.(payload)
		}

		currentSocket.on('connect', handleConnect)
		currentSocket.on('disconnect', handleDisconnect)
		currentSocket.on('connect_error', handleConnectError)
		currentSocket.on('ERROR', handleError)

		if (currentSocket.onAny) {
			currentSocket.onAny((eventName: string, ...args: unknown[]) => {
				handleGenericEvent(eventName, args[0])
			})
		}

		const handleLogout = () => {
			if (debugAllEvents) {
				console.log('[useWebSocket] Logout event received, disconnecting')
			}
			forceDisconnect()
		}

		const handleSessionChanged = (e: Event) => {
			const customEvent = e as CustomEvent<unknown>
			const detail = customEvent?.detail
			if (
				isRecord(detail) &&
				Object.prototype.hasOwnProperty.call(detail, 'loggedIn') &&
				detail.loggedIn === false
			) {
				if (debugAllEvents) {
					console.log(
						'[useWebSocket] Session changed to logged out, disconnecting',
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
				// ограничение длины текста чата (если структура подходит)
				if (
					message.type === 'SEND_MESSAGE' &&
					isRecord(message.message) &&
					isRecord(message.message.message) &&
					typeof message.message.message.text === 'string'
				) {
					message.message.message.text = message.message.message.text.slice(
						0,
						300,
					)
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
		[isConnected, debugAllEvents],
	)

	return { sendMessage, isConnected }
}
