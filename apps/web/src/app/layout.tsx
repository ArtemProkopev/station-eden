// apps/web/src/app/layout.tsx
'use client'

import CdnWarning from '@/src/components/CdnWarning'
import SessionKeepAliveClient from '@/src/components/SessionKeepAliveClient'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import './globals.css'

// Глобальный перехватчик fetch для блокировки запросов после логаута
const setupFetchInterceptor = () => {
	if (typeof window === 'undefined') return

	const originalFetch = window.fetch

	window.fetch = async function (...args) {
		// Проверяем, не был ли выполнен принудительный логаут
		if ((window as any).__FORCED_LOGOUT__) {
			const url = typeof args[0] === 'string' ? args[0] : ''

			// Если это запрос на refresh - блокируем его
			if (url.includes('/auth/refresh')) {
				console.log('[fetch-intercept] Blocking refresh request after logout')
				return Promise.reject(new Error('Refresh blocked after logout'))
			}

			// Если это запрос на logout - пропускаем его
			if (url.includes('/auth/logout')) {
				console.log(
					'[fetch-intercept] Allowing logout request despite forced logout flag'
				)
			}
		}

		return originalFetch.apply(this, args)
	}

	return () => {
		window.fetch = originalFetch
	}
}

// Глобальный перехватчик WebSocket для отслеживания соединений (исправленная версия)
const setupWebSocketInterceptor = () => {
	if (typeof window === 'undefined') return

	const OriginalWebSocket = window.WebSocket

	// Создаем глобальный массив для хранения всех WebSocket соединений
	if (!(window as any)._websocketConnections) {
		;(window as any)._websocketConnections = new Set<WebSocket>()
	}

	const connections = (window as any)._websocketConnections as Set<WebSocket>

	// Исправленный перехватчик - используем функцию вместо класса
	function PatchedWebSocket(
		this: any,
		url: string | URL,
		protocols?: string | string[]
	) {
		// Вызываем оригинальный конструктор
		const ws = protocols
			? new OriginalWebSocket(url, protocols)
			: new OriginalWebSocket(url)

		// Добавляем в реестр
		connections.add(ws)

		// Перехватываем метод close
		const originalClose = ws.close.bind(ws)
		ws.close = function (...args: any[]) {
			connections.delete(ws)
			return originalClose(...args)
		}

		// Обработчики для автоматического удаления
		ws.addEventListener('close', () => {
			connections.delete(ws)
		})

		ws.addEventListener('error', () => {
			connections.delete(ws)
		})

		return ws
	}

	// Копируем статические свойства
	Object.setPrototypeOf(PatchedWebSocket, OriginalWebSocket)

	// Копируем статические константы
	const staticProps = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'] as const
	staticProps.forEach(prop => {
		Object.defineProperty(PatchedWebSocket, prop, {
			value: (OriginalWebSocket as any)[prop],
			enumerable: true,
			configurable: true,
			writable: false,
		})
	})

	// Копируем остальные статические свойства
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
			} catch (e) {
				// Игнорируем свойства, которые нельзя скопировать
				console.warn(
					`[WebSocketInterceptor] Could not copy property: ${prop}`,
					e
				)
			}
		}
	})

	window.WebSocket = PatchedWebSocket as any

	return () => {
		window.WebSocket = OriginalWebSocket
	}
}

export default function RootLayout({ children }: { children: ReactNode }) {
	useEffect(() => {
		const cleanupFetch = setupFetchInterceptor()
		const cleanupWebSocket = setupWebSocketInterceptor()

		return () => {
			if (cleanupFetch) cleanupFetch()
			if (cleanupWebSocket) cleanupWebSocket()
		}
	}, [])

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

	return (
		<html lang='ru' dir='ltr' suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
				<title>Station Eden</title>
				<meta
					name='description'
					content='Station Eden — мультиплеерный проект'
				/>
				<link rel='icon' href='/favicon.ico?v=2' />
				<meta name='viewport' content='width=device-width, initial-scale=1' />
			</head>
			<body>
				<SessionKeepAliveClient />
				<main>{children}</main>
				<CdnWarning />
			</body>
		</html>
	)
}
