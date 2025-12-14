import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { isForcedLogout } from '../lib/websocketUtils'

interface WebSocketMessage {
	type: string
	[key: string]: any
}

interface CommonSocket {
	on(event: string, callback: (data: any) => void): CommonSocket
	off(event: string, callback?: (data: any) => void): CommonSocket
	emit(event: string, data?: any): CommonSocket
	disconnect(): void
	connected: boolean
	id: string
}

// --- Mock socket ---
class MockSocketIO implements CommonSocket {
	private listeners: Map<string, ((data: any) => void)[]> = new Map()
	private bc: BroadcastChannel
	private lobbyId: string
	public connected = false
	public id = `mock-${Math.random().toString(36).slice(2, 9)}`
	private players = new Map<string, any>()
	private settings = {
		maxPlayers: 4,
		gameMode: 'standard',
		isPrivate: false,
		password: '',
	}
	private creatorId: string | undefined

	constructor(_url: string, _options: any) {
		this.lobbyId = 'default-lobby'
		this.bc = new BroadcastChannel(`mock-socketio:${this.lobbyId}`)

		setTimeout(() => {
			this.connected = true
			this.emitEvent('connect')
			this.emitEvent('LOBBY_STATE', {
				players: [],
				settings: this.settings,
				creatorId: this.creatorId,
			})
		}, 200)

		this.bc.onmessage = (event: MessageEvent) => {
			const { type, data } = event.data
			this.emitEvent(type, data)
		}
	}

	private emitEvent(event: string, data?: any) {
		const callbacks = this.listeners.get(event) || []
		callbacks.forEach(cb => cb(data))
	}

	on(event: string, callback: (data: any) => void): MockSocketIO {
		if (!this.listeners.has(event)) this.listeners.set(event, [])
		this.listeners.get(event)!.push(callback)
		return this
	}

	off(event: string, callback?: (data: any) => void): MockSocketIO {
		if (!callback) {
			this.listeners.delete(event)
			return this
		}
		const arr = this.listeners.get(event) || []
		this.listeners.set(
			event,
			arr.filter(cb => cb !== callback)
		)
		return this
	}

	emit(event: string, data?: any): MockSocketIO {
		if (event === 'JOIN_LOBBY') {
			const p = data.player
			if (!this.creatorId) this.creatorId = p.id
			const prev = this.players.get(p.id) || {}
			this.players.set(p.id, { ...prev, ...p })

			this.emitEvent('JOIN_LOBBY_SUCCESS', {
				player: p,
				lobbyState: {
					players: Array.from(this.players.values()),
					settings: this.settings,
					creatorId: this.creatorId,
				},
			})

			this.bc.postMessage({ type: 'PLAYER_JOINED', data: { player: p } })
			this.emitEvent('LOBBY_STATE', {
				players: Array.from(this.players.values()),
				settings: this.settings,
				creatorId: this.creatorId,
			})
		} else if (event === 'UPDATE_PLAYER_PROFILE') {
			const p = data.player
			if (p?.id) {
				const prev = this.players.get(p.id) || {}
				this.players.set(p.id, { ...prev, ...p })
			}
			this.bc.postMessage({
				type: 'LOBBY_STATE',
				data: {
					players: Array.from(this.players.values()),
					settings: this.settings,
					creatorId: this.creatorId,
				},
			})
		} else if (event === 'SEND_MESSAGE') {
			const msg = { ...data.message }
			if (typeof msg.text === 'string') msg.text = msg.text.slice(0, 300)

			this.bc.postMessage({ type: 'CHAT_MESSAGE', data: { message: msg } })
			setTimeout(() => {
				this.emitEvent('MESSAGE_SENT', { messageId: data.message?.id })
			}, 50)
		} else if (event === 'TOGGLE_READY') {
			const ex = this.players.get(data.playerId)
			if (ex) this.players.set(data.playerId, { ...ex, isReady: data.isReady })

			this.bc.postMessage({
				type: 'PLAYER_READY',
				data: { playerId: data.playerId, isReady: data.isReady },
			})

			this.emitEvent('LOBBY_STATE', {
				players: Array.from(this.players.values()),
				settings: this.settings,
				creatorId: this.creatorId,
			})
		} else if (event === 'UPDATE_LOBBY_SETTINGS') {
			if (
				this.creatorId &&
				data?.__userId &&
				data.__userId !== this.creatorId
			) {
				const err = { message: 'Only lobby creator can change settings' }
				this.bc.postMessage({ type: 'ERROR', data: err })
				this.emitEvent('ERROR', err)
				return this
			}
			this.settings = { ...this.settings, ...data.settings }
			this.bc.postMessage({
				type: 'LOBBY_SETTINGS_UPDATED',
				data: { settings: this.settings },
			})
			this.emitEvent('LOBBY_SETTINGS_UPDATE_SUCCESS', {
				settings: this.settings,
			})
			this.emitEvent('LOBBY_STATE', {
				players: Array.from(this.players.values()),
				settings: this.settings,
				creatorId: this.creatorId,
			})
		} else if (event === 'PLAYER_LEFT') {
			if (data?.playerId) this.players.delete(data.playerId)
			this.bc.postMessage({
				type: 'PLAYER_LEFT',
				data: { playerId: data.playerId },
			})
			this.emitEvent('LOBBY_STATE', {
				players: Array.from(this.players.values()),
				settings: this.settings,
				creatorId: this.creatorId,
			})
		}

		return this
	}

	disconnect(): void {
		this.connected = false
		this.bc.close()
		this.emitEvent('disconnect', 'io client disconnect')
	}
}

// --- helpers ---
function normalizeSocketIoOrigin(baseUrl: string): string {
	const u = new URL(baseUrl)
	if (u.protocol === 'ws:') u.protocol = 'http:'
	if (u.protocol === 'wss:') u.protocol = 'https:'
	return u.origin
}

function stableKey(origin: string, path: string, query?: Record<string, any>) {
	const q = query ? JSON.stringify(query, Object.keys(query).sort()) : ''
	return `${origin}::${path}::${q}`
}

// --- shared socket registry ---
type SharedEntry = {
	socket: CommonSocket
	refCount: number
	disconnectTimer: number | null
}

const sharedSockets = new Map<string, SharedEntry>()

function acquireSocket(
	key: string,
	create: () => CommonSocket
): { socket: CommonSocket; release: () => void } {
	let entry = sharedSockets.get(key)

	if (!entry) {
		entry = { socket: create(), refCount: 0, disconnectTimer: null }
		sharedSockets.set(key, entry)
	}

	if (entry.disconnectTimer) {
		window.clearTimeout(entry.disconnectTimer)
		entry.disconnectTimer = null
	}

	entry.refCount += 1

	const release = () => {
		const e = sharedSockets.get(key)
		if (!e) return

		e.refCount = Math.max(0, e.refCount - 1)
		if (e.refCount === 0) {
			e.disconnectTimer = window.setTimeout(() => {
				try {
					e.socket.disconnect()
				} finally {
					sharedSockets.delete(key)
				}
			}, 1500)
		}
	}

	return { socket: entry.socket, release }
}

export const useWebSocket = (
	baseUrl: string,
	onMessage: (data: WebSocketMessage) => void,
	params?: Record<string, string | number | boolean | undefined>
) => {
	const [isConnected, setIsConnected] = useState(false)
	const socketRef = useRef<CommonSocket | null>(null)
	const releaseRef = useRef<(() => void) | null>(null)
	const shouldReconnectRef = useRef(true)

	const onMessageRef = useRef(onMessage)
	useEffect(() => {
		onMessageRef.current = onMessage
	}, [onMessage])

	const paramsMemo = useMemo(() => params ?? {}, [params])

	const isProd = process.env.NODE_ENV === 'production'
	const urlMockFlag =
		typeof window !== 'undefined' &&
		new URLSearchParams(window.location.search).get('wsMock') === '1'
	const lsMockFlag =
		typeof window !== 'undefined' &&
		window.localStorage?.getItem('WS_MOCK') === '1'
	const envMockFlag =
		process.env.NEXT_PUBLIC_WS_MOCK === 'true' ||
		process.env.NEXT_PUBLIC_WS_USE_MOCK === 'true'
	const useMock = !isProd && (urlMockFlag || lsMockFlag || envMockFlag)

	const origin = useMemo(() => normalizeSocketIoOrigin(baseUrl), [baseUrl])

	const key = useMemo(
		() => stableKey(origin, '/lobby', paramsMemo),
		[origin, paramsMemo]
	)

	const forceDisconnect = useCallback(() => {
		console.log('[useWebSocket] Force disconnecting WebSocket')
		shouldReconnectRef.current = false

		if (releaseRef.current) {
			releaseRef.current()
			releaseRef.current = null
		}

		socketRef.current = null
		setIsConnected(false)
	}, [])

	useEffect(() => {
		if (typeof window === 'undefined') return

		if (isForcedLogout()) {
			console.log('[useWebSocket] Skipping connection due to forced logout')
			return
		}

		const { socket, release } = acquireSocket(key, () => {
			if (useMock) {
				return new MockSocketIO(origin, {
					transports: ['websocket'],
					withCredentials: true,
					autoConnect: true,
				})
			}

			const s = io(origin, {
				path: '/lobby',
				query: paramsMemo,
				transports: ['websocket'],
				withCredentials: true,
				autoConnect: true,
				reconnection: shouldReconnectRef.current,
				reconnectionAttempts: 10,
				reconnectionDelay: 500,
				reconnectionDelayMax: 5000,
				timeout: 20000,
			}) as unknown as Socket

			return s as unknown as CommonSocket
		})

		socketRef.current = socket
		releaseRef.current = release

		// ✅ ВАЖНО: handlers — стабильные ссылки
		const handleConnect = () => {
			console.log('[useWebSocket] WebSocket connected')
			setIsConnected(true)
		}

		const handleDisconnect = (reason: string) => {
			console.log(`[useWebSocket] WebSocket disconnected: ${reason}`)
			setIsConnected(false)

			if (reason === 'io server disconnect' || reason.includes('auth')) {
				shouldReconnectRef.current = false
				return
			}
			if (isForcedLogout()) {
				shouldReconnectRef.current = false
				return
			}
		}

		const handleConnectError = (error: Error) => {
			console.error('[useWebSocket] WebSocket connection error:', error)
			setIsConnected(false)
		}

		const handleJoinLobbySuccess = (data: any) => {
			onMessageRef.current?.({ type: 'JOIN_LOBBY_SUCCESS', ...data })
		}

		const handleLobbyState = (data: any) => {
			onMessageRef.current?.({ type: 'LOBBY_STATE', ...data })
		}
		const handlePlayerJoined = (data: any) => {
			onMessageRef.current?.({ type: 'PLAYER_JOINED', ...data })
		}
		const handlePlayerLeft = (data: any) => {
			onMessageRef.current?.({ type: 'PLAYER_LEFT', ...data })
		}
		const handleChatMessage = (data: any) => {
			onMessageRef.current?.({ type: 'CHAT_MESSAGE', ...data })
		}
		const handlePlayerReady = (data: any) => {
			onMessageRef.current?.({ type: 'PLAYER_READY', ...data })
		}
		const handleLobbySettingsUpdated = (data: any) => {
			onMessageRef.current?.({ type: 'LOBBY_SETTINGS_UPDATED', ...data })
		}
		const handleMessageSent = (data: any) => {
			onMessageRef.current?.({ type: 'MESSAGE_SENT', ...data })
		}
		const handleLobbySettingsUpdateSuccess = (data: any) => {
			onMessageRef.current?.({ type: 'LOBBY_SETTINGS_UPDATE_SUCCESS', ...data })
		}

		const handleError = (data: any) => {
			console.error('[useWebSocket] Server error:', data?.message)

			if (
				data?.message === 'Authentication required' ||
				data?.message === 'Invalid authentication token'
			) {
				console.log('[useWebSocket] Authentication error, closing connection')
				forceDisconnect()
			}

			onMessageRef.current?.({ type: 'ERROR', ...data })
		}

		socket.on('connect', handleConnect)
		socket.on('disconnect', handleDisconnect)
		socket.on('connect_error', handleConnectError)

		socket.on('JOIN_LOBBY_SUCCESS', handleJoinLobbySuccess)
		socket.on('LOBBY_STATE', handleLobbyState)
		socket.on('PLAYER_JOINED', handlePlayerJoined)
		socket.on('PLAYER_LEFT', handlePlayerLeft)
		socket.on('CHAT_MESSAGE', handleChatMessage)
		socket.on('PLAYER_READY', handlePlayerReady)
		socket.on('LOBBY_SETTINGS_UPDATED', handleLobbySettingsUpdated)
		socket.on('MESSAGE_SENT', handleMessageSent)
		socket.on('LOBBY_SETTINGS_UPDATE_SUCCESS', handleLobbySettingsUpdateSuccess)
		socket.on('ERROR', handleError)

		const handleLogout = () => {
			console.log('[useWebSocket] Logout event received, disconnecting')
			forceDisconnect()
		}

		const handleSessionChanged = (e: Event) => {
			const customEvent = e as CustomEvent
			if (customEvent.detail?.loggedIn === false) {
				console.log(
					'[useWebSocket] Session changed to logged out, disconnecting'
				)
				forceDisconnect()
			}
		}

		window.addEventListener('logout', handleLogout)
		window.addEventListener('session-changed', handleSessionChanged)

		return () => {
			window.removeEventListener('logout', handleLogout)
			window.removeEventListener('session-changed', handleSessionChanged)

			socket.off('connect', handleConnect)
			socket.off('disconnect', handleDisconnect)
			socket.off('connect_error', handleConnectError)

			socket.off('JOIN_LOBBY_SUCCESS', handleJoinLobbySuccess)
			socket.off('LOBBY_STATE', handleLobbyState)
			socket.off('PLAYER_JOINED', handlePlayerJoined)
			socket.off('PLAYER_LEFT', handlePlayerLeft)
			socket.off('CHAT_MESSAGE', handleChatMessage)
			socket.off('PLAYER_READY', handlePlayerReady)
			socket.off('LOBBY_SETTINGS_UPDATED', handleLobbySettingsUpdated)
			socket.off('MESSAGE_SENT', handleMessageSent)
			socket.off(
				'LOBBY_SETTINGS_UPDATE_SUCCESS',
				handleLobbySettingsUpdateSuccess
			)
			socket.off('ERROR', handleError)

			release()
			if (releaseRef.current === release) releaseRef.current = null
			socketRef.current = null
		}
	}, [key, origin, useMock, forceDisconnect, paramsMemo])

	const sendMessage = useCallback(
		(message: WebSocketMessage) => {
			if (isForcedLogout()) return false
			if (!socketRef.current || !isConnected) return false

			try {
				if (
					message?.type === 'SEND_MESSAGE' &&
					typeof message?.message?.text === 'string'
				) {
					message.message.text = message.message.text.slice(0, 300)
				}

				console.log('Sending WebSocket message:', message.type, message)
				socketRef.current.emit(message.type, message)
				return true
			} catch (error) {
				console.error('[useWebSocket] Failed to send message:', error)
				return false
			}
		},
		[isConnected]
	)

	return { sendMessage, isConnected }
}
