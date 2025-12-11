'use client'

import CdnWarning from '@/src/components/CdnWarning'
import SessionKeepAliveClient from '@/src/components/SessionKeepAliveClient'
import Script from 'next/script'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

// --- fetch interceptor ---
const setupFetchInterceptor = () => {
	if (typeof window === 'undefined') return

	const originalFetch = window.fetch

	window.fetch = async function (...args) {
		if ((window as any).__FORCED_LOGOUT__) {
			const url = typeof args[0] === 'string' ? args[0] : ''

			if (url.includes('/auth/refresh')) {
				console.log('[fetch-intercept] Blocking refresh request after logout')
				return Promise.reject(new Error('Refresh blocked after logout'))
			}

			if (url.includes('/auth/logout')) {
				console.log(
					'[fetch-intercept] Allowing logout request despite forced logout flag'
				)
			}
		}

		return originalFetch.apply(this, args as any)
	}

	return () => {
		window.fetch = originalFetch
	}
}

// --- WebSocket interceptor ---
const setupWebSocketInterceptor = () => {
	if (typeof window === 'undefined') return

	const OriginalWebSocket = window.WebSocket

	if (!(window as any)._websocketConnections) {
		;(window as any)._websocketConnections = new Set<WebSocket>()
	}

	const connections = (window as any)._websocketConnections as Set<WebSocket>

	function PatchedWebSocket(
		this: any,
		url: string | URL,
		protocols?: string | string[]
	) {
		const ws = protocols
			? new OriginalWebSocket(url, protocols)
			: new OriginalWebSocket(url)

		connections.add(ws)

		const originalClose = ws.close.bind(ws)
		ws.close = function (...args: any[]) {
			connections.delete(ws)
			return originalClose(...args)
		}

		ws.addEventListener('close', () => {
			connections.delete(ws)
		})
		ws.addEventListener('error', () => {
			connections.delete(ws)
		})

		return ws
	}

	Object.setPrototypeOf(PatchedWebSocket, OriginalWebSocket)

	const staticProps = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'] as const
	staticProps.forEach(prop => {
		Object.defineProperty(PatchedWebSocket, prop, {
			value: (OriginalWebSocket as any)[prop],
			enumerable: true,
			configurable: true,
			writable: false,
		})
	})

	Object.getOwnPropertyNames(OriginalWebSocket).forEach(prop => {
		if (
			!staticProps.includes(prop as any) &&
			prop !== 'length' &&
			prop !== 'name' &&
			prop !== 'prototype'
		) {
			try {
				Object.defineProperty(PatchedWebSocket, prop, {
					value: (OriginalWebSocket as any)[prop],
					enumerable: true,
					configurable: true,
					writable: true,
				})
			} catch {
				// ignore
			}
		}
	})

	window.WebSocket = PatchedWebSocket as any

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
