// apps/web/src/hooks/useSessionKeepAlive.ts
'use client'

import { useEffect, useRef } from 'react'
import { api } from '../lib/api'

/**
 * Интервал авто-рефреша (если не задан в env)
 */
const DEFAULT_INTERVAL = 10 * 60 * 1000 // 10 минут

/**
 * Минимальный безопасный интервал между refresh-запросами,
 * чтобы вкладка не спамила сервер.
 */
const MIN_REFRESH_GAP = 10 * 1000 // 10 секунд

/**
 * Хук, который безопасно и стабильно поддерживает живую сессию пользователя.
 * Реализует:
 *  - автоматический refresh по таймеру
 *  - refresh при возвращении вкладки в фокус
 *  - защиту от избыточных запросов (throttle на 10 сек)
 */
export function useSessionKeepAlive() {
	const lastCallRef = useRef(0)
	const isMounted = useRef(false)

	useEffect(() => {
		isMounted.current = true

		const intervalMs = Number(
			process.env.NEXT_PUBLIC_REFRESH_INTERVAL_MS || DEFAULT_INTERVAL
		)

		/**
		 * Защищённый вызов refresh() — не дергается чаще чем MIN_REFRESH_GAP.
		 */
		const safeRefresh = async () => {
			const now = Date.now()
			const delta = now - lastCallRef.current

			if (delta < MIN_REFRESH_GAP) return
			lastCallRef.current = now

			try {
				await api.refresh()
			} catch (e) {
				// Ошибки refresh() подавляем, чтобы UI не ломался
				console.warn('[keep-alive] refresh failed:', e)
			}
		}

		// Первый тихий вызов после небольшой задержки
		const firstTimeout = window.setTimeout(() => {
			if (isMounted.current) safeRefresh()
		}, 2500)

		// Интервальный вызов
		const intervalId = window.setInterval(() => {
			if (isMounted.current) safeRefresh()
		}, intervalMs)

		// Refresh при возврате вкладки
		let visUnlock = true
		const onVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				// Делаем refresh только один раз при рефокусе
				if (visUnlock) {
					visUnlock = false
					safeRefresh()
					setTimeout(() => (visUnlock = true), 1500)
				}
			}
		}

		document.addEventListener('visibilitychange', onVisibilityChange)

		return () => {
			isMounted.current = false
			clearTimeout(firstTimeout)
			clearInterval(intervalId)
			document.removeEventListener('visibilitychange', onVisibilityChange)
		}
	}, [])
}
