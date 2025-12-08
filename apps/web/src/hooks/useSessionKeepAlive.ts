// apps/web/src/hooks/useSessionKeepAlive.ts
'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { api } from '../lib/api'

const DEFAULT_INTERVAL = 10 * 60 * 1000 // 10 минут
const MIN_REFRESH_GAP = 10 * 1000 // 10 секунд

// Вспомогательная функция для проверки куки
function hasCookie(name: string): boolean {
	if (typeof document === 'undefined') return false
	return document.cookie.split(';').some(c => c.trim().startsWith(`${name}=`))
}

// Проверка флага принудительного логаута
function isForcedLogout(): boolean {
	if (typeof window === 'undefined') return false
	return !!(window as any).__FORCED_LOGOUT__
}

export function useSessionKeepAlive() {
	const lastCallRef = useRef(0)
	const isMounted = useRef(false)
	const pathname = usePathname()

	useEffect(() => {
		// На страницах логина/регистрации keep-alive не нужен
		if (!pathname) return
		if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
			return
		}

		isMounted.current = true

		const intervalMs = Number(
			process.env.NEXT_PUBLIC_REFRESH_INTERVAL_MS || DEFAULT_INTERVAL
		)

		let firstTimeout: NodeJS.Timeout | null = null
		let intervalId: NodeJS.Timeout | null = null

		const stopLoop = () => {
			isMounted.current = false
			if (firstTimeout !== null) {
				clearTimeout(firstTimeout)
				firstTimeout = null
			}
			if (intervalId !== null) {
				clearInterval(intervalId)
				intervalId = null
			}
		}

		// Обработчик события logout
		const handleLogoutEvent = () => {
			console.info('[keep-alive] Logout event received, stopping loop')
			stopLoop()
		}

		// Обработчик события session-changed
		const handleSessionChanged = (e: Event) => {
			const customEvent = e as CustomEvent
			if (customEvent.detail?.loggedIn === false) {
				console.info(
					'[keep-alive] Session changed to logged out, stopping loop'
				)
				stopLoop()
			}
		}

		const safeRefresh = async () => {
			if (!isMounted.current) return

			// Проверяем флаг принудительного логаута
			if (isForcedLogout()) {
				console.info('[keep-alive] Forced logout detected, stopping loop')
				stopLoop()
				return
			}

			// Проверяем наличие refresh_token
			if (!hasCookie('refresh_token')) {
				console.info('[keep-alive] No refresh token found, stopping loop')
				stopLoop()
				return
			}

			const now = Date.now()
			const delta = now - lastCallRef.current

			if (delta < MIN_REFRESH_GAP) return
			lastCallRef.current = now

			try {
				await api.refresh()
				console.debug('[keep-alive] Refresh successful')
			} catch (e: any) {
				// Извлекаем статус ошибки
				let status: number | undefined
				if (e && typeof e === 'object') {
					if ('status' in e) {
						status = e.status as number
					} else if ('statusCode' in e) {
						status = e.statusCode as number
					} else if (e instanceof Error && e.message.includes('401')) {
						status = 401
					}
				}

				if (status === 401 || status === 403) {
					// Пользователь разлогинен - останавливаем keep-alive
					console.info('[keep-alive] Unauthorized, stopping loop')
					stopLoop()
					return
				}

				// Другие ошибки просто логируем
				console.warn('[keep-alive] Refresh failed:', e.message || e)
			}
		}

		// Первый тихий вызов после небольшой задержки
		firstTimeout = setTimeout(() => {
			if (isMounted.current) safeRefresh()
		}, 2500)

		// Интервальный вызов
		intervalId = setInterval(() => {
			if (isMounted.current) safeRefresh()
		}, intervalMs)

		// Refresh при возврате вкладки
		let visUnlock = true
		const onVisibilityChange = () => {
			if (!isMounted.current) return
			if (document.visibilityState === 'visible') {
				// Делаем refresh только один раз при рефокусе
				if (visUnlock) {
					visUnlock = false
					safeRefresh()
					setTimeout(() => (visUnlock = true), 1500)
				}
			}
		}

		// Подписываемся на события
		document.addEventListener('visibilitychange', onVisibilityChange)
		window.addEventListener('logout', handleLogoutEvent)
		window.addEventListener('session-changed', handleSessionChanged)

		return () => {
			stopLoop()
			document.removeEventListener('visibilitychange', onVisibilityChange)
			window.removeEventListener('logout', handleLogoutEvent)
			window.removeEventListener('session-changed', handleSessionChanged)
		}
	}, [pathname])
}
