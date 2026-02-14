// apps/web/src/lib/authUtils.ts
declare global {
	interface Window {
		__FORCED_LOGOUT__?: boolean
		__SESSION_KEEP_ALIVE_DISABLED__?: boolean
		__LOGOUT_IN_PROGRESS__?: boolean
	}
}

export function isForcedLogout(): boolean {
	if (typeof window === 'undefined') return false
	return !!window.__FORCED_LOGOUT__ || !!window.__SESSION_KEEP_ALIVE_DISABLED__
}

export function setForcedLogout(): void {
	if (typeof window === 'undefined') return
	window.__FORCED_LOGOUT__ = true
	window.__SESSION_KEEP_ALIVE_DISABLED__ = true
	window.__LOGOUT_IN_PROGRESS__ = true
}

export function clearForcedLogoutFlags(): void {
	if (typeof window === 'undefined') return
	delete window.__FORCED_LOGOUT__
	delete window.__SESSION_KEEP_ALIVE_DISABLED__
	delete window.__LOGOUT_IN_PROGRESS__
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function hasRefreshToken(): boolean {
	if (typeof document === 'undefined') return false
	return document.cookie.includes('refresh_token=')
}

export function clearClientAuthData(): void {
	if (typeof window === 'undefined') return

	setForcedLogout()

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
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/api;`
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/auth;`
		})
	} catch (error) {
		console.error('Error clearing cookies:', error)
	}

	try {
		const preserveKeys = ['theme', 'locale', 'lastPath', 'ui_settings']
		const allKeys = Object.keys(localStorage)
		allKeys.forEach(key => {
			if (!preserveKeys.includes(key)) {
				localStorage.removeItem(key)
			}
		})
	} catch {
		// ignore
	}

	try {
		sessionStorage.clear()
	} catch {
		// ignore
	}

	try {
		window.dispatchEvent(new Event('logout'))
		window.dispatchEvent(
			new CustomEvent('session-changed', {
				detail: { loggedIn: false, logout: true },
			}),
		)
		window.dispatchEvent(new Event('auth-cleared'))
	} catch {
		// ignore
	}
}

export function isUserAuthenticated(): boolean {
	if (typeof window === 'undefined') return false
	if (isForcedLogout()) return false

	try {
		const userData = localStorage.getItem('userData')
		return !!userData
	} catch {
		return false
	}
}
