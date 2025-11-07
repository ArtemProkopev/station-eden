import { useCallback, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

interface WebSocketMessage {
	type: string
	[key: string]: any
}

class MockSocketIO {
	private listeners: Map<string, ((data: any) => void)[]> = new Map()
	private bc: BroadcastChannel
	private lobbyId: string
	public connected = false
	public id = `mock-${Math.random().toString(36).slice(2, 9)}`

	constructor(url: string, options: any) {
		const u = new URL(url)
		this.lobbyId = u.searchParams.get('lobbyId') || 'default-lobby'
		this.bc = new BroadcastChannel(`mock-socketio:${this.lobbyId}`)

		setTimeout(() => {
			this.connected = true
			this.emitEvent('connect')

			// Эмулируем начальное состояние лобби с создателем
			setTimeout(() => {
				const creatorPlayer = {
					id: 'creator-123',
					name: 'Создатель',
					missions: 10,
					hours: 50,
					isReady: false,
				}

				this.emitEvent('LOBBY_STATE', {
					players: [creatorPlayer],
					settings: {
						maxPlayers: 4,
						gameMode: 'standard',
						isPrivate: false,
						password: '',
					},
				})
			}, 100)
		}, 200)

		this.bc.onmessage = (event: MessageEvent) => {
			const { type, data } = event.data
			this.emitEvent(type, data)
		}
	}

	private emitEvent(event: string, data?: any) {
		const callbacks = this.listeners.get(event) || []
		callbacks.forEach(callback => callback(data))
	}

	on(event: string, callback: (data: any) => void) {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, [])
		}
		this.listeners.get(event)!.push(callback)
		return this
	}

	emit(event: string, data?: any) {
		if (event === 'JOIN_LOBBY') {
			this.bc.postMessage({
				type: 'PLAYER_JOINED',
				data: { player: data.player },
			})
			setTimeout(() => {
				this.emitEvent('LOBBY_STATE', {
					players: [data.player],
					settings: {
						maxPlayers: 4,
						gameMode: 'standard',
						isPrivate: false,
						password: '',
					},
				})
			}, 50)
		} else if (event === 'UPDATE_PLAYER_PROFILE') {
			this.bc.postMessage({
				type: 'LOBBY_STATE',
				data: {
					players: [data.player],
					settings: {
						maxPlayers: 4,
						gameMode: 'standard',
						isPrivate: false,
						password: '',
					},
				},
			})
		} else if (event === 'SEND_MESSAGE') {
			this.bc.postMessage({
				type: 'CHAT_MESSAGE',
				data: { message: data.message },
			})
			setTimeout(() => {
				this.emitEvent('MESSAGE_SENT', { messageId: data.message.id })
			}, 50)
		} else if (event === 'TOGGLE_READY') {
			this.bc.postMessage({
				type: 'PLAYER_READY',
				data: {
					playerId: data.playerId,
					isReady: data.isReady,
				},
			})
			setTimeout(() => {
				this.emitEvent('LOBBY_STATE', {
					players: [
						{
							id: data.playerId,
							name: 'Игрок',
							missions: 0,
							hours: 0,
							isReady: data.isReady,
						},
					],
					settings: {
						maxPlayers: 4,
						gameMode: 'standard',
						isPrivate: false,
						password: '',
					},
				})
			}, 50)
		} else if (event === 'UPDATE_LOBBY_SETTINGS') {
			this.bc.postMessage({
				type: 'LOBBY_SETTINGS_UPDATED',
				data: { settings: data.settings },
			})
			setTimeout(() => {
				this.emitEvent('LOBBY_SETTINGS_UPDATE_SUCCESS', {
					settings: data.settings,
				})
				this.emitEvent('LOBBY_STATE', {
					players: [],
					settings: data.settings,
				})
			}, 50)
		} else if (event === 'PLAYER_LEFT') {
			this.bc.postMessage({
				type: 'PLAYER_LEFT',
				data: { playerId: data.playerId },
			})
			setTimeout(() => {
				this.emitEvent('LOBBY_STATE', {
					players: [],
					settings: {
						maxPlayers: 4,
						gameMode: 'standard',
						isPrivate: false,
						password: '',
					},
				})
			}, 50)
		}

		return this
	}

	disconnect() {
		this.connected = false
		this.bc.close()
		this.emitEvent('disconnect', 'io client disconnect')
	}
}

export const useWebSocket = (
	baseUrl: string,
	onMessage: (data: WebSocketMessage) => void,
	params?: Record<string, string | number | boolean | undefined>
) => {
	const socket = useRef<Socket | MockSocketIO | null>(null)
	const [isConnected, setIsConnected] = useState(false)

	const onMessageRef = useRef(onMessage)
	useEffect(() => {
		onMessageRef.current = onMessage
	}, [onMessage])

	const paramsRef = useRef(params)
	useEffect(() => {
		paramsRef.current = params
	}, [params])

	const buildUrl = useCallback(() => {
		const u = new URL(baseUrl)
		return u.origin
	}, [baseUrl])

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

	useEffect(() => {
		const url = buildUrl()

		let currentSocket: Socket | MockSocketIO

		if (useMock) {
			currentSocket = new MockSocketIO(url, {
				transports: ['websocket', 'polling'],
				withCredentials: true,
				autoConnect: true,
			}) as any
		} else {
			currentSocket = io(url, {
				path: '/lobby',
				query: paramsRef.current,
				transports: ['websocket', 'polling'],
				withCredentials: true,
				autoConnect: true,
				reconnection: true,
				reconnectionAttempts: Infinity,
				reconnectionDelay: 1000,
				reconnectionDelayMax: 5000,
				timeout: 20000,
			})
		}

		socket.current = currentSocket

		const handleConnect = () => {
			console.log('WebSocket connected')
			setIsConnected(true)
		}

		const handleDisconnect = (reason: string) => {
			console.log('WebSocket disconnected:', reason)
			setIsConnected(false)
		}

		const handleConnectError = (error: Error) => {
			console.error('WebSocket connection error:', error)
			setIsConnected(false)
		}

		// ИЗМЕНЕНИЕ: Правильно формируем сообщение с типом
		const handleEvent = (data: any) => {
			console.log('WebSocket event received:', data)
			// Для событий, которые приходят как объект, добавляем тип
			if (data && typeof data === 'object') {
				onMessageRef.current?.(data)
			}
		}

		// ИЗМЕНЕНИЕ: Обрабатываем каждое событие отдельно с правильным типом
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
			onMessageRef.current?.({ type: 'ERROR', ...data })
		}

		currentSocket.on('connect', handleConnect)
		currentSocket.on('disconnect', handleDisconnect)
		currentSocket.on('connect_error', handleConnectError)

		// Подписываемся на конкретные события с правильными обработчиками
		currentSocket.on('LOBBY_STATE', handleLobbyState)
		currentSocket.on('PLAYER_JOINED', handlePlayerJoined)
		currentSocket.on('PLAYER_LEFT', handlePlayerLeft)
		currentSocket.on('CHAT_MESSAGE', handleChatMessage)
		currentSocket.on('PLAYER_READY', handlePlayerReady)
		currentSocket.on('LOBBY_SETTINGS_UPDATED', handleLobbySettingsUpdated)
		currentSocket.on('MESSAGE_SENT', handleMessageSent)
		currentSocket.on(
			'LOBBY_SETTINGS_UPDATE_SUCCESS',
			handleLobbySettingsUpdateSuccess
		)
		currentSocket.on('ERROR', handleError)

		return () => {
			if (currentSocket) {
				currentSocket.disconnect()
				socket.current = null
			}
		}
	}, [buildUrl, useMock])

	const sendMessage = useCallback((message: WebSocketMessage) => {
		if (socket.current) {
			console.log('Sending WebSocket message:', message.type, message)
			socket.current.emit(message.type, message)
			return true
		}
		console.warn('WebSocket not connected, message not sent:', message.type)
		return false
	}, [])

	return { sendMessage, isConnected }
}
