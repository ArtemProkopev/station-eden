// apps/web/src/hooks/useWebSocket.ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { isForcedLogout } from '../lib/websocketUtils'

interface WebSocketMessage {
	type: string
	[key: string]: any
}

// Общий интерфейс для WebSocket/MockSocket
interface CommonSocket {
	on(event: string, callback: (data: any) => void): CommonSocket
	emit(event: string, data?: any): CommonSocket
	disconnect(): void
}

// Функция для генерации ID игры (если не установлен uuid)
function generateGameId(): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID().replace(/-/g, '').substring(0, 8)
	}
	
	// Fallback для старых браузеров
	const timestamp = Date.now().toString(36)
	const random = Math.random().toString(36).substring(2, 10)
	return (timestamp + random).substring(0, 8)
}

class MockSocketIO implements CommonSocket {
	private listeners: Map<string, ((data: any) => void)[]> = new Map()
	private bc: BroadcastChannel
	private lobbyId: string
	private gameId: string | null = null
	public connected = false
	public id = `mock-${Math.random().toString(36).slice(2, 9)}`
	private players = new Map<string, any>()
	private gamePlayers = new Map<string, any>()
	private settings = {
		maxPlayers: 4,
		gameMode: 'standard',
		isPrivate: false,
		password: '',
	}
	private creatorId: string | undefined
	private gameState: any = null

	constructor(url: string, options: any) {
		// Определяем тип комнаты (лобби или игра)
		const query = options?.query || {}
		this.lobbyId = (query.lobbyId as string) || 'default-lobby'
		this.gameId = (query.gameId as string) || null
		
		if (this.gameId) {
			// Подключение к игре
			this.bc = new BroadcastChannel(`mock-socketio:game:${this.gameId}`)
		} else {
			// Подключение к лобби
			this.bc = new BroadcastChannel(`mock-socketio:lobby:${this.lobbyId}`)
		}

		setTimeout(() => {
			this.connected = true
			this.emitEvent('connect')
			
			if (this.gameId) {
				// Отправляем состояние игры
				this.emitEvent('GAME_STATE', {
					gameState: this.gameState || {
						id: this.gameId,
						status: 'active',
						players: Array.from(this.gamePlayers.values()),
						round: 1,
						startedAt: new Date().toISOString(),
						settings: this.settings
					}
				})
			} else {
				// Отправляем состояние лобби
				this.emitEvent('LOBBY_STATE', {
					players: [],
					settings: this.settings,
					creatorId: this.creatorId,
				})
			}
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

	on(event: string, callback: (data: any) => void): MockSocketIO {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, [])
		}
		this.listeners.get(event)!.push(callback)
		return this
	}

	emit(event: string, data?: any): MockSocketIO {
		console.log('MockSocketIO emit:', event, data)

		if (event === 'JOIN_LOBBY') {
			const p: any = data.player
			if (!this.creatorId) this.creatorId = p.id
			const prev = this.players.get(p.id) || {}
			this.players.set(p.id, { ...prev, ...p })

			this.bc.postMessage({ type: 'PLAYER_JOINED', data: { player: p } })
			this.emitEvent('LOBBY_STATE', {
				players: Array.from(this.players.values()),
				settings: this.settings,
				creatorId: this.creatorId,
			})
		} else if (event === 'START_GAME') {
			// Создание игры
			const gameId = generateGameId()
			
			// Конвертируем игроков лобби в игроков игры
			const gamePlayers = Array.from(this.players.values()).map((player: any, index: number) => ({
				...player,
				score: 0,
				isActive: true,
				order: index + 1
			}))
			
			this.gameState = {
				id: gameId,
				lobbyId: this.lobbyId,
				status: 'active',
				players: gamePlayers,
				currentPlayerId: gamePlayers[0]?.id,
				round: 1,
				startedAt: new Date().toISOString(),
				settings: this.settings
			}
			
			// Сохраняем игроков для игры
			gamePlayers.forEach((player: any) => {
				this.gamePlayers.set(player.id, player)
			})
			
			// Отправляем всем игрокам команду перейти в игру
			this.bc.postMessage({
				type: 'GAME_STARTED',
				data: {
					gameId,
					redirectUrl: `/game/${gameId}`,
					gameState: this.gameState
				}
			})
			
		} else if (event === 'JOIN_GAME') {
			// Подключение к существующей игре
			if (data.gameId === this.gameId && this.gameState) {
				this.emitEvent('GAME_STATE', {
					gameState: this.gameState
				})
			}
		} else if (event === 'UPDATE_PLAYER_PROFILE') {
			const p: any = data.player
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
			if (typeof msg.text === 'string') {
				msg.text = msg.text.slice(0, 300)
			}
			const messageType = this.gameId ? 'GAME_CHAT_MESSAGE' : 'CHAT_MESSAGE'
			this.bc.postMessage({
				type: messageType,
				data: { message: msg },
			})
			setTimeout(() => {
				this.emitEvent('MESSAGE_SENT', { messageId: data.message?.id })
			}, 50)
		} else if (event === 'TOGGLE_READY') {
			const ex = this.players.get(data.playerId)
			if (ex) this.players.set(data.playerId, { ...ex, isReady: data.isReady })

			this.bc.postMessage({
				type: 'PLAYER_READY',
				data: {
					playerId: data.playerId,
					isReady: data.isReady,
				},
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
		} else if (event === 'GAME_ACTION') {
			// Обработка игровых действий
			if (this.gameState && this.gameId) {
				if (data.action === 'skip_turn') {
					// Логика пропуска хода
					const players = this.gameState.players
					const currentIndex = players.findIndex((p: any) => p.id === this.gameState.currentPlayerId)
					const nextIndex = (currentIndex + 1) % players.length
					this.gameState.currentPlayerId = players[nextIndex]?.id
					this.gameState.round = currentIndex === players.length - 1 ? this.gameState.round + 1 : this.gameState.round
					
					this.bc.postMessage({
						type: 'GAME_UPDATE',
						data: { gameState: this.gameState }
					})
				} else if (data.action === 'end_game') {
					// Завершение игры
					this.gameState.status = 'finished'
					const highestScore = Math.max(...this.gameState.players.map((p: any) => p.score))
					this.gameState.winnerId = this.gameState.players.find((p: any) => p.score === highestScore)?.id
					this.gameState.finishedAt = new Date().toISOString()
					
					this.bc.postMessage({
						type: 'GAME_FINISHED',
						data: { gameState: this.gameState }
					})
				}
			}
		} else if (event === 'LEAVE_GAME') {
			// Выход из игры
			if (this.gameId) {
				this.bc.postMessage({
					type: 'PLAYER_LEFT_GAME',
					data: { playerId: data.playerId || 'unknown' }
				})
			}
		}

		return this
	}

	disconnect(): void {
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
	const socket = useRef<CommonSocket | null>(null)
	const [isConnected, setIsConnected] = useState(false)
	const shouldReconnectRef = useRef(true)

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

	const forceDisconnect = useCallback(() => {
		console.log('[useWebSocket] Force disconnecting WebSocket')
		shouldReconnectRef.current = false

		if (socket.current) {
			socket.current.disconnect()
			socket.current = null
		}

		setIsConnected(false)
	}, [])

	useEffect(() => {
		// Если был принудительный логаут, не подключаемся
		if (isForcedLogout()) {
			console.log('[useWebSocket] Skipping connection due to forced logout')
			return
		}

		const url = buildUrl()
		let currentSocket: CommonSocket

		if (useMock) {
			currentSocket = new MockSocketIO(url, {
				transports: ['websocket'],
				withCredentials: true,
				autoConnect: true,
				query: paramsRef.current
			})
		} else {
			const ioSocket = io(url, {
				path: '/socket.io',
				query: paramsRef.current,
				transports: ['websocket'],
				withCredentials: true,
				autoConnect: true,
				reconnection: shouldReconnectRef.current,
				reconnectionAttempts: 5,
				reconnectionDelay: 1000,
				reconnectionDelayMax: 5000,
				timeout: 20000,
			}) as unknown as CommonSocket

			currentSocket = ioSocket
		}

		socket.current = currentSocket

		const handleConnect = () => {
			console.log('[useWebSocket] WebSocket connected')
			setIsConnected(true)
		}

		const handleDisconnect = (reason: string) => {
			console.log(`[useWebSocket] WebSocket disconnected: ${reason}`)
			setIsConnected(false)

			// Если это нормальное закрытие или аутентификация не удалась, не переподключаемся
			if (reason === 'io server disconnect' || reason.includes('auth')) {
				console.log(
					'[useWebSocket] Not reconnecting (server disconnect or auth error)'
				)
				shouldReconnectRef.current = false
				return
			}

			// Если был принудительный логаут, не переподключаемся
			if (isForcedLogout()) {
				console.log('[useWebSocket] Not reconnecting due to forced logout')
				shouldReconnectRef.current = false
				return
			}
		}

		const handleConnectError = (error: Error) => {
			console.error('[useWebSocket] WebSocket connection error:', error)
			setIsConnected(false)
		}

		// Обработчики для лобби
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

		// Обработчики для игры
		const handleGameStarted = (data: any) => {
			onMessageRef.current?.({ type: 'GAME_STARTED', ...data })
		}

		const handleGameState = (data: any) => {
			onMessageRef.current?.({ type: 'GAME_STATE', ...data })
		}

		const handleGameUpdate = (data: any) => {
			onMessageRef.current?.({ type: 'GAME_UPDATE', ...data })
		}

		const handleGameFinished = (data: any) => {
			onMessageRef.current?.({ type: 'GAME_FINISHED', ...data })
		}

		const handleGameChatMessage = (data: any) => {
			onMessageRef.current?.({ type: 'CHAT_MESSAGE', ...data })
		}

		const handlePlayerLeftGame = (data: any) => {
			onMessageRef.current?.({ type: 'PLAYER_LEFT_GAME', ...data })
		}

		const handleError = (data: any) => {
			console.error('[useWebSocket] Server error:', data.message)

			// Если ошибка аутентификации, закрываем соединение и дальше не пробуем
			if (
				data.message === 'Authentication required' ||
				data.message === 'Invalid authentication token'
			) {
				console.log('[useWebSocket] Authentication error, closing connection')
				forceDisconnect()
			}

			onMessageRef.current?.({ type: 'ERROR', ...data })
		}

		// Подписки
		currentSocket.on('connect', handleConnect)
		currentSocket.on('disconnect', handleDisconnect)
		currentSocket.on('connect_error', handleConnectError)

		// Подписки для лобби
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

		// Подписки для игры
		currentSocket.on('GAME_STARTED', handleGameStarted)
		currentSocket.on('GAME_STATE', handleGameState)
		currentSocket.on('GAME_UPDATE', handleGameUpdate)
		currentSocket.on('GAME_FINISHED', handleGameFinished)
		currentSocket.on('GAME_CHAT_MESSAGE', handleGameChatMessage)
		currentSocket.on('PLAYER_LEFT_GAME', handlePlayerLeftGame)

		currentSocket.on('ERROR', handleError)

		// Событие логаута
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

			if (currentSocket) {
				currentSocket.disconnect()
				socket.current = null
			}
		}
	}, [buildUrl, useMock, forceDisconnect])

	const sendMessage = useCallback(
		(message: WebSocketMessage) => {
			// Если был принудительный логаут, не отправляем сообщения
			if (isForcedLogout()) {
				console.log('[useWebSocket] Cannot send message - forced logout')
				return false
			}

			if (!socket.current || !isConnected) {
				console.warn('[useWebSocket] Cannot send message - not connected')
				return false
			}

			try {
				// client-side ограничим длину текстов
				if (
					message?.type === 'SEND_MESSAGE' &&
					typeof message?.message?.text === 'string'
				) {
					message.message.text = message.message.text.slice(0, 300)
				}

				console.log('Sending WebSocket message:', message.type, message)
				socket.current.emit(message.type, message)
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