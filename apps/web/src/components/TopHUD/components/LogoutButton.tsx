// apps/web/src/components/TopHUD/components/LogoutButton.tsx
'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { api } from '../../../lib/api'
import { clearClientAuthData, setForcedLogout } from '../../../lib/authUtils'
import {
	clearWebSocketCache,
	closeAllWebSockets,
} from '../../../lib/websocketUtils'
import styles from './UserDropdown.module.css'

export default function LogoutButton() {
	const [loading, setLoading] = useState(false)
	const router = useRouter()
	const pathname = usePathname()

	const handleLogout = useCallback(async () => {
		if (loading) return

		console.log('[logout] Starting logout process...')
		setLoading(true)

		// 1. Устанавливаем глобальные флаги для блокировки keep-alive и ретраев
		setForcedLogout()

		// 2. Закрываем все WebSocket соединения
		console.log('[logout] Closing WebSocket connections...')
		closeAllWebSockets()

		// 3. Отправляем события для всех компонентов
		try {
			window.dispatchEvent(new Event('logout'))
			window.dispatchEvent(
				new CustomEvent('session-changed', {
					detail: { loggedIn: false, logout: true },
				})
			)
			window.dispatchEvent(new Event('force-close-websocket'))
		} catch {}

		let logoutSuccess = false

		try {
			// 4. Пытаемся выполнить POST logout (основной метод)
			console.log('[logout] Attempting POST logout...')
			await api.logout()
			console.log('[logout] POST logout successful')
			logoutSuccess = true
		} catch (postError) {
			console.warn('[logout] POST logout failed:', postError)

			// 5. Fallback: пробуем GET logout
			try {
				console.log('[logout] Attempting GET logout as fallback...')
				await api.logoutGet()
				console.log('[logout] GET logout successful')
				logoutSuccess = true
			} catch (getError) {
				console.warn('[logout] GET logout also failed:', getError)
				// Даже если запросы упали, продолжаем с клиентской очисткой
			}
		}

		console.log('[logout] API logout result:', logoutSuccess ? 'ok' : 'failed')

		// 6. Всегда выполняем клиентскую очистку (куки, storages, события)
		console.log('[logout] Performing client-side cleanup...')
		clearClientAuthData()

		// 7. Очищаем WebSocket кэш
		try {
			await clearWebSocketCache()
		} catch (cacheError) {
			console.warn('[logout] WebSocket cache clearing failed:', cacheError)
		}

		// 8. Дополнительная очистка кеша Service Worker
		try {
			if ('caches' in window) {
				const cacheNames = await caches.keys()
				await Promise.all(cacheNames.map(name => caches.delete(name)))
				console.log('[logout] Service worker cache cleared')
			}
		} catch (cacheError) {
			console.warn('[logout] Cache clearing failed:', cacheError)
		}

		// 9. Финальные события
		try {
			if ('speechSynthesis' in window) {
				window.speechSynthesis.cancel()
			}
		} catch {}

		// 10. Редирект
		console.log('[logout] Redirecting...')
		setLoading(false)

		setTimeout(() => {
			const timestamp = Date.now()

			if (pathname === '/') {
				// Если уже на главной, форсируем полную перезагрузку
				window.location.href = `/?logout=${timestamp}&cleared=1&ws=closed`
			} else {
				// Иначе используем router для плавного перехода
				router.push(`/?logout=${timestamp}&cleared=1&ws=closed`)

				// Страховка, если router не сработает
				setTimeout(() => {
					if (window.location.pathname !== '/') {
						window.location.href = `/?logout=${timestamp}&ws=closed`
					}
				}, 300)
			}
		}, 150)
	}, [loading, pathname, router])

	return (
		<button
			className={styles.menuItem}
			onClick={handleLogout}
			disabled={loading}
			aria-label='Выйти из аккаунта'
			data-logout-button='true'
			style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				gap: '8px',
			}}
		>
			{loading ? (
				<>
					<span className={styles.spinner}></span>
					<span>Покидаем станцию...</span>
				</>
			) : (
				'Покинуть станцию'
			)}
		</button>
	)
}
