// apps/web/src/app/client-root.tsx
'use client'

import CdnWarning from '@/src/components/CdnWarning'
import SessionKeepAliveClient from '@/src/components/SessionKeepAliveClient'
import Script from 'next/script'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

declare global {
	interface Window {
		__FORCED_LOGOUT__?: boolean
		__SESSION_KEEP_ALIVE_DISABLED__?: boolean
		__LOGOUT_IN_PROGRESS__?: boolean
		_websocketConnections?: Set<WebSocket>
	}
}

// --- fetch interceptor ---
const setupFetchInterceptor = (): (() => void) | undefined => {
	if (typeof window === 'undefined') return undefined

	const originalFetch: typeof window.fetch = window.fetch.bind(window)

	window.fetch = (async (
		...args: Parameters<typeof window.fetch>
	): Promise<Response> => {
		if (window.__FORCED_LOGOUT__) {
			const url = typeof args[0] === 'string' ? args[0] : ''

			if (url.includes('/auth/refresh')) {
				console.log('[fetch-intercept] Blocking refresh request after logout')
				throw new Error('Refresh blocked after logout')
			}

			if (url.includes('/auth/logout')) {
				console.log(
					'[fetch-intercept] Allowing logout request despite forced logout flag',
				)
			}
		}

		return originalFetch(...args)
	}) as typeof window.fetch

	return () => {
		window.fetch = originalFetch
	}
}

// --- WebSocket interceptor ---
const setupWebSocketInterceptor = (): (() => void) | undefined => {
	if (typeof window === 'undefined') return undefined

	const OriginalWebSocket = window.WebSocket

	if (!window._websocketConnections) {
		window._websocketConnections = new Set<WebSocket>()
	}

	const connections = window._websocketConnections

	type WebSocketCtor = typeof WebSocket
	type WSStaticsKey = 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED'

	const PatchedWebSocket = function (
		this: WebSocket,
		url: string | URL,
		protocols?: string | string[],
	): WebSocket {
		const ws =
			protocols !== undefined
				? new OriginalWebSocket(url, protocols)
				: new OriginalWebSocket(url)

		connections.add(ws)

		const originalClose = ws.close.bind(ws)
		ws.close = ((code?: number, reason?: string) => {
			connections.delete(ws)
			return originalClose(code, reason)
		}) as typeof ws.close

		ws.addEventListener('close', () => connections.delete(ws))
		ws.addEventListener('error', () => connections.delete(ws))

		return ws
	} as unknown as WebSocketCtor

	Object.setPrototypeOf(PatchedWebSocket, OriginalWebSocket)

	const staticProps: readonly WSStaticsKey[] = [
		'CONNECTING',
		'OPEN',
		'CLOSING',
		'CLOSED',
	] as const

	const originalWSRecord = OriginalWebSocket as unknown as Record<
		string,
		unknown
	>

	staticProps.forEach(prop => {
		Object.defineProperty(PatchedWebSocket, prop, {
			value: originalWSRecord[prop],
			enumerable: true,
			configurable: true,
			writable: false,
		})
	})

	Object.getOwnPropertyNames(OriginalWebSocket).forEach(prop => {
		if (
			!staticProps.includes(prop as WSStaticsKey) &&
			prop !== 'length' &&
			prop !== 'name' &&
			prop !== 'prototype'
		) {
			try {
				Object.defineProperty(PatchedWebSocket, prop, {
					value: originalWSRecord[prop],
					enumerable: true,
					configurable: true,
					writable: true,
				})
			} catch {
				// ignore
			}
		}
	})

	window.WebSocket = PatchedWebSocket

	return () => {
		window.WebSocket = OriginalWebSocket
	}
}

const themeInitScript = `
(function() {
  try {
    var match = document.cookie.match(/(?:^|; )theme=([^;]+)/);
    if (!match) return;
    var theme = decodeURIComponent(match[1]);
    if (!theme) return;
    document.documentElement.className = theme;
  } catch (e) {}
})();
`

export default function ClientRoot({ children }: { children: ReactNode }) {
	useEffect(() => {
		const cleanupFetch = setupFetchInterceptor()
		const cleanupWebSocket = setupWebSocketInterceptor()

		return () => {
			if (cleanupFetch) cleanupFetch()
			if (cleanupWebSocket) cleanupWebSocket()
		}
	}, [])

	return (
		<>
			<Script id='theme-init' strategy='beforeInteractive'>
				{themeInitScript}
			</Script>
			<SessionKeepAliveClient />
			<main>{children}</main>
			<CdnWarning />
		</>
	)
}
