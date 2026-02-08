// apps/web/src/lib/csrf.ts

/**
 * Безопасное чтение cookie в браузере.
 * Возвращает null на сервере или если куки нет.
 */
function readCookie(name: string): string | null {
	if (typeof document === 'undefined') {
		console.log(`[CSRF] readCookie called on server for: ${name}`)
		return null
	}
	const escaped = name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1')
	const m = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'))
	console.log(`[CSRF] readCookie "${name}":`, m ? 'found' : 'not found')
	return m ? decodeURIComponent(m[1]) : null
}

/**
 * Возвращает CSRF-токен из куки (по умолчанию 'se_csrf').
 */
export function getCsrfToken(cookieName = 'se_csrf'): string | null {
	const token = readCookie(cookieName)
	console.log(`[CSRF] getCsrfToken "${cookieName}":`, token ? token.substring(0, 8) + '...' : 'null')
	return token
}
