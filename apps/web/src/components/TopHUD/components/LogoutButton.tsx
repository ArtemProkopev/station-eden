// apps/web/src/components/TopHUD/components/LogoutButton.tsx
'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { api } from '../../../lib/api'
import {
	clearWebSocketCache,
	closeAllWebSockets,
} from '../../../lib/websocketUtils'
import styles from './UserDropdown.module.css'

// Функция для надежной очистки кук
const clearAllCookies = () => {
	try {
		const cookies = document.cookie.split(';')
		const domain = window.location.hostname.includes('stationeden.ru')
			? '.stationeden.ru'
			: window.location.hostname

		cookies.forEach(cookie => {
			const eqPos = cookie.indexOf('=')
			const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()

			// Очищаем все куки аутентификации
			if (name && name !== 'theme' && name !== 'locale') {
				// Основной домен
				document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
				// С доменом для поддоменов
				document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`
				// Дополнительные пути для безопасности
				document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/api;`
				document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/auth;`
			}
		})
	} catch (error) {
		console.error('[logout] Error clearing cookies:', error)
	}
}

// Функция для очистки хранилища
const clearAllStorage = () => {
	try {
		// Очищаем localStorage (кроме некоторых настроек)
		const preserveKeys = ['theme', 'locale', 'lastPath']
		const allKeys = Object.keys(localStorage)
		allKeys.forEach(key => {
			if (!preserveKeys.includes(key)) {
				localStorage.removeItem(key)
			}
		})

		// Очищаем sessionStorage полностью
		sessionStorage.clear()
	} catch (error) {
		console.error('[logout] Error clearing storage:', error)
	}
}

export default function LogoutButton() {
	const [loading, setLoading] = useState(false)
	const router = useRouter()
	const pathname = usePathname()

	const handleLogout = useCallback(async () => {
		if (loading) return

		console.log('[logout] Starting logout process...')
		setLoading(true)

		// 1. Устанавливаем глобальные флаги для блокировки keep-alive
		if (typeof window !== 'undefined') {
			;(window as any).__FORCED_LOGOUT__ = true
			;(window as any).__SESSION_KEEP_ALIVE_DISABLED__ = true
			;(window as any).__LOGOUT_IN_PROGRESS__ = true
		}

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

		// 6. Всегда выполняем клиентскую очистку
		console.log('[logout] Performing client-side cleanup...')

		// Очищаем куки
		clearAllCookies()

		// Очищаем хранилища
		clearAllStorage()

		// 7. Очищаем WebSocket кэш
		try {
			await clearWebSocketCache()
		} catch (cacheError) {
			console.warn('[logout] WebSocket cache clearing failed:', cacheError)
		}

		// 8. Дополнительная очистка кеша
		try {
			if ('caches' in window) {
				const cacheNames = await caches.keys()
				await Promise.all(cacheNames.map(name => caches.delete(name)))
				console.log('[logout] Service worker cache cleared')
			}
		} catch (cacheError) {
			console.warn('[logout] Cache clearing failed:', cacheError)
		}

		// 9. Отправляем финальные события
		try {
			// Событие для обновления UI
			window.dispatchEvent(new Event('auth-cleared'))
			window.dispatchEvent(new Event('storage'))

			// Если это вкладка с аудио/видео - останавливаем медиа
			if ('speechSynthesis' in window) {
				window.speechSynthesis.cancel()
			}
		} catch {}

		// 10. Редирект
		console.log('[logout] Redirecting...')
		setLoading(false)

		// Маленькая задержка для гарантии очистки
		setTimeout(() => {
			const timestamp = Date.now()

			if (pathname === '/') {
				// Если уже на главной, форсируем полную перезагрузку
				window.location.href = `/?logout=${timestamp}&cleared=1&ws=closed`
			} else {
				// Иначе используем router для плавного перехода
				router.push(`/?logout=${timestamp}&cleared=1&ws=closed`)

				// Страховка на случай если router не сработает
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
