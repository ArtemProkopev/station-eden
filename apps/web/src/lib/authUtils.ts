// apps/web/src/lib/authUtils.ts
/**
 * Утилиты для работы с аутентификацией на клиенте.
 *
 * ВАЖНО:
 * - refresh_token хранится в HttpOnly-куке, JS его не видит.
 * - Все решения «авторизован ли пользователь» принимаем по своим флажкам/хранилищам.
 */

// Проверка флага принудительного логаута / отключения keep-alive
export function isForcedLogout(): boolean {
	if (typeof window === 'undefined') return false
	const w = window as any
	return !!w.__FORCED_LOGOUT__ || !!w.__SESSION_KEEP_ALIVE_DISABLED__
}

// Установка флага принудительного логаута
export function setForcedLogout(): void {
	if (typeof window === 'undefined') return
	const w = window as any
	w.__FORCED_LOGOUT__ = true
	w.__SESSION_KEEP_ALIVE_DISABLED__ = true
	w.__LOGOUT_IN_PROGRESS__ = true
}

// Сброс флагов принудительного логаута (после успешного логина)
export function clearForcedLogoutFlags(): void {
	if (typeof window === 'undefined') return
	const w = window as any
	delete w.__FORCED_LOGOUT__
	delete w.__SESSION_KEEP_ALIVE_DISABLED__
	delete w.__LOGOUT_IN_PROGRESS__
}

// Проверка наличия refresh_token (эвристика, не для бизнес-логики!)
export function hasRefreshToken(): boolean {
	if (typeof document === 'undefined') return false
	// HttpOnly-куки в document.cookie не видны; функция годится только для best-effort UI.
	return document.cookie.includes('refresh_token=')
}

// Очистка всех данных аутентификации на клиенте
export function clearClientAuthData(): void {
	if (typeof window === 'undefined') return

	// Фиксируем принудительный логаут, чтобы никакой авто-refresh не зацепился за старые куки
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
			// Текущий хост
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
			// Домен для поддоменов
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`
			// Доп. пути
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/api;`
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/auth;`
		})
	} catch (error) {
		console.error('Error clearing cookies:', error)
	}

	// Очищаем localStorage (кроме настроек)
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

	// Шлём события наружу
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

/**
 * Проверка «пользователь авторизован» для UI.
 *
 * Мы НЕ можем смотреть на HttpOnly-куки, поэтому опираемся на:
 *  - отсутствие принудительного логаута
 *  - наличие userData в localStorage (заполняется после логина)
 */
export function isUserAuthenticated(): boolean {
	if (typeof window === 'undefined') return false

	// Принудительный логаут → считаем неавторизованным
	if (isForcedLogout()) return false

	try {
		const userData = localStorage.getItem('userData')
		return !!userData
	} catch {
		return false
	}
}
