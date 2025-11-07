import { useCallback, useEffect, useRef, useState } from 'react'

interface WebSocketMessage {
	type: string
	[key: string]: any
}

/**
 * Мок WebSocket:
 * - имитирует ответы сервера,
 * - рассылает события между вкладками через BroadcastChannel (общий "room"),
 * - подходит для локальной разработки без бэка.
 */
class MockWebSocket implements WebSocket {
	static readonly CONNECTING = 0
	static readonly OPEN = 1
	static readonly CLOSING = 2
	static readonly CLOSED = 3

	readonly CONNECTING = 0
	readonly OPEN = 1
	readonly CLOSING = 2
	readonly CLOSED = 3

	readonly url: string
	readyState: number
	bufferedAmount = 0
	extensions = ''
	protocol = ''
	binaryType: BinaryType = 'blob'

	onopen: ((this: WebSocket, ev: Event) => any) | null = null
	onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null
	onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null
	onerror: ((this: WebSocket, ev: Event) => any) | null = null

	private listeners: Record<string, EventListenerOrEventListenerObject[]> = {}
	private bc: BroadcastChannel
	private lobbyId: string

	constructor(url: string) {
		this.url = url
		const u = new URL(url)
		this.lobbyId = u.searchParams.get('lobbyId') || 'default-lobby'
		this.bc = new BroadcastChannel(`mock-ws:${this.lobbyId}`)
		this.readyState = WebSocket.CONNECTING

		// принимать сообщения из "комнаты"
		this.bc.onmessage = (ev: MessageEvent<any>) => {
			const payload = ev.data
			const msg = new MessageEvent('message', { data: JSON.stringify(payload) })
			// прокидываем наружу
			this.onmessage?.call(this as any, msg)
			this.dispatchEvent(msg)
		}

		setTimeout(() => {
			this.readyState = WebSocket.OPEN
			const open = new Event('open')
			this.onopen?.call(this as any, open)
			this.dispatchEvent(open)
			// отдать начальное состояние комнаты (минимум — настройки)
			const init = {
				type: 'LOBBY_STATE',
				players: [],
				settings: {
					maxPlayers: 4,
					gameMode: 'standard',
					isPrivate: false,
					password: '',
				},
			}
			const ev = new MessageEvent('message', { data: JSON.stringify(init) })
			this.onmessage?.call(this as any, ev)
			this.dispatchEvent(ev)
		}, 200)
	}

	send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
		if (this.readyState !== WebSocket.OPEN) throw new Error('MockWS not open')
		const asString =
			typeof data === 'string'
				? data
				: new TextDecoder().decode(data as ArrayBuffer)

		setTimeout(() => {
			try {
				const parsed = JSON.parse(asString)

				// эмуляция ACK для некоторых команд
				if (parsed.type === 'SEND_MESSAGE') {
					const ack = { type: 'MESSAGE_SENT', messageId: parsed.message.id }
					const ackEv = new MessageEvent('message', {
						data: JSON.stringify(ack),
					})
					this.onmessage?.call(this as any, ackEv)
					this.dispatchEvent(ackEv)
				}
				if (parsed.type === 'UPDATE_LOBBY_SETTINGS') {
					const ok = {
						type: 'LOBBY_SETTINGS_UPDATE_SUCCESS',
						settings: parsed.settings,
					}
					const okEv = new MessageEvent('message', { data: JSON.stringify(ok) })
					this.onmessage?.call(this as any, okEv)
					this.dispatchEvent(okEv)
				}

				// "рассылка по комнате"
				switch (parsed.type) {
					case 'JOIN_LOBBY':
						this.bc.postMessage({
							type: 'PLAYER_JOINED',
							player: parsed.player,
						})
						// и актуальное состояние отправителю
						this.bc.postMessage({
							type: 'LOBBY_STATE',
							players: [parsed.player],
							settings: {
								maxPlayers: 4,
								gameMode: 'standard',
								isPrivate: false,
								password: '',
							},
						})
						break
					case 'PLAYER_LEFT':
						this.bc.postMessage({
							type: 'PLAYER_LEFT',
							playerId: parsed.playerId,
						})
						break
					case 'SEND_MESSAGE':
						this.bc.postMessage({
							type: 'CHAT_MESSAGE',
							message: parsed.message,
						})
						break
					case 'TOGGLE_READY':
						this.bc.postMessage({
							type: 'PLAYER_READY',
							playerId: parsed.playerId,
							isReady: parsed.isReady,
						})
						break
					case 'UPDATE_LOBBY_SETTINGS':
						this.bc.postMessage({
							type: 'LOBBY_SETTINGS_UPDATED',
							settings: parsed.settings,
						})
						break
				}
			} catch (e) {
				console.error('[MockWS] parse error:', e)
			}
		}, 30)
	}

	close(code?: number, reason?: string) {
		this.readyState = WebSocket.CLOSING
		setTimeout(() => {
			this.readyState = WebSocket.CLOSED
			try {
				this.bc.close()
			} catch {}
			const ev = new CloseEvent('close', {
				code: code ?? 1000,
				reason: reason ?? 'Normal closure',
				wasClean: true,
			})
			this.onclose?.call(this as any, ev)
			this.dispatchEvent(ev)
		}, 60)
	}

	addEventListener(type: any, listener: any) {
		if (!this.listeners[type]) this.listeners[type] = []
		this.listeners[type].push(listener)
	}
	removeEventListener(type: any, listener: any) {
		if (!this.listeners[type]) return
		this.listeners[type] = this.listeners[type].filter(l => l !== listener)
	}
	dispatchEvent(event: Event): boolean {
		const list = this.listeners[event.type] || []
		list.forEach(l => {
			if (typeof l === 'function') l.call(this, event)
			else if ((l as any)?.handleEvent) (l as any).handleEvent(event)
		})
		return true
	}
}

/**
 * WebSocket-хук:
 *  - очередь сообщений до открытия,
 *  - экспоненциальный бэк-офф,
 *  - no-retry на 1000/1001 и при выгрузке,
 *  - стабильные onMessage/params,
 *  - dev/prod автоопределение и контролируемый мок.
 */
export const useWebSocket = (
	baseUrl: string,
	onMessage: (data: WebSocketMessage) => void,
	params?: Record<string, string | number | boolean | undefined>
) => {
	const ws = useRef<WebSocket | null>(null)
	const [isConnected, setIsConnected] = useState(false)

	// стабильные ссылки
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
		const p = paramsRef.current
		if (p)
			for (const [k, v] of Object.entries(p)) {
				if (v !== undefined && v !== null) u.searchParams.set(k, String(v))
			}
		return u.toString()
	}, [baseUrl])

	const queueRef = useRef<string[]>([])
	const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
	const reconnectAttempt = useRef(0)
	const connecting = useRef(false)
	const pageUnloading = useRef(false)

	// ----- универсальная логика выбора мока -----
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
	// --------------------------------------------

	const flushQueue = useCallback(() => {
		if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return
		while (queueRef.current.length) ws.current.send(queueRef.current.shift()!)
	}, [])

	const scheduleReconnect = useCallback((why: string) => {
		if (pageUnloading.current) return
		if (document.visibilityState === 'hidden') {
			const onVisible = () => {
				document.removeEventListener('visibilitychange', onVisible)
				scheduleReconnect('became-visible')
			}
			document.addEventListener('visibilitychange', onVisible)
			return
		}
		const step = Math.min(reconnectAttempt.current, 4)
		const delay = Math.min(1000 * Math.pow(2, step), 10000)
		if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
		reconnectTimer.current = setTimeout(() => {
			reconnectAttempt.current += 1
			connect()
		}, delay)
	}, []) // без deps намеренно

	const connect = useCallback(() => {
		if (connecting.current) return
		connecting.current = true

		try {
			const url = buildUrl()
			console.info('[WS] connecting to', url, 'mock=', useMock)
			ws.current = (
				useMock ? new MockWebSocket(url) : new WebSocket(url)
			) as WebSocket

			ws.current.onopen = () => {
				setIsConnected(true)
				reconnectAttempt.current = 0
				connecting.current = false
				if (reconnectTimer.current) {
					clearTimeout(reconnectTimer.current)
					reconnectTimer.current = null
				}
				flushQueue()
			}

			ws.current.onmessage = (event: MessageEvent) => {
				try {
					const data = JSON.parse(event.data)
					onMessageRef.current?.(data)
				} catch (e) {
					console.error('[WS] parse error:', e)
				}
			}

			ws.current.onclose = (e: CloseEvent) => {
				setIsConnected(false)
				connecting.current = false
				if (e.code === 1000 || e.code === 1001 || pageUnloading.current) return
				scheduleReconnect('abnormal-close')
			}

			ws.current.onerror = () => {
				/* реконнект пойдёт через onclose */
			}
		} catch {
			connecting.current = false
			scheduleReconnect('connect-failed')
		}
	}, [buildUrl, flushQueue, scheduleReconnect, useMock])

	useEffect(() => {
		const onBeforeUnload = () => {
			pageUnloading.current = true
			if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
			if (ws.current && ws.current.readyState === WebSocket.OPEN) {
				try {
					ws.current.close(1001, 'page unload')
				} catch {}
			}
		}
		window.addEventListener('beforeunload', onBeforeUnload)
		return () => window.removeEventListener('beforeunload', onBeforeUnload)
	}, [])

	useEffect(() => {
		connect()
		return () => {
			if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
			if (ws.current) {
				try {
					ws.current.close(1000, 'unmount')
				} catch {}
			}
		}
	}, [connect])

	const sendMessage = useCallback((message: WebSocketMessage) => {
		const payload = JSON.stringify(message)
		if (ws.current && ws.current.readyState === WebSocket.OPEN) {
			ws.current.send(payload)
			return true
		}
		queueRef.current.push(payload)
		return false
	}, [])

	return { sendMessage, isConnected }
}
