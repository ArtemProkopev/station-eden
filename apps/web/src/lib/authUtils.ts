// apps/web/src/lib/authUtils.ts
/**
 * Утилиты для работы с аутентификацией
 */

// Проверка флага принудительного логаута
export function isForcedLogout(): boolean {
	if (typeof window === 'undefined') return false
	return !!(window as any).__FORCED_LOGOUT__
}

// Установка флага принудительного логаута
export function setForcedLogout(): void {
	if (typeof window !== 'undefined') {
		;(window as any).__FORCED_LOGOUT__ = true
		;(window as any).__SESSION_KEEP_ALIVE_DISABLED__ = true
	}
}

// Проверка наличия refresh_token
export function hasRefreshToken(): boolean {
	if (typeof document === 'undefined') return false
	return document.cookie.includes('refresh_token=')
}

// Очистка всех данных аутентификации на клиенте
export function clearClientAuthData(): void {
	if (typeof window === 'undefined') return

	// Устанавливаем флаги
	setForcedLogout()

	// Очищаем куки
	try {
		const domain = window.location.hostname.includes('stationeden.ru')
			? '.stationeden.ru'
			: window.location.hostname

		const cookiesToClear = [
			'access_token',
			'refresh_token',
			'preauth',
			'se_csrf',
			'google_oauth_state',
			'auth_token',
			'session',
		]

		cookiesToClear.forEach(name => {
			// Очищаем для текущего пути
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
			// Очищаем для домена
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`
			// Очищаем для пути /api
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/api;`
			// Очищаем для пути /auth
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/auth;`
		})
	} catch (error) {
		console.error('Error clearing cookies:', error)
	}

	// Очищаем localStorage (кроме некоторых настроек)
	try {
		const preserveKeys = ['theme', 'locale', 'lastPath', 'ui_settings']
		const allKeys = Object.keys(localStorage)
		allKeys.forEach(key => {
			if (!preserveKeys.includes(key)) {
				localStorage.removeItem(key)
			}
		})
	} catch {}

	// Очищаем sessionStorage
	try {
		sessionStorage.clear()
	} catch {}

	// Отправляем события
	try {
		window.dispatchEvent(new Event('logout'))
		window.dispatchEvent(
			new CustomEvent('session-changed', {
				detail: { loggedIn: false, logout: true },
			})
		)
		window.dispatchEvent(new Event('auth-cleared'))
	} catch {}
}

// Проверка авторизации пользователя
export function isUserAuthenticated(): boolean {
	if (typeof window === 'undefined') return false

	// Проверяем флаг принудительного логаута
	if (isForcedLogout()) return false

	// Проверяем наличие refresh_token
	return hasRefreshToken()
}
