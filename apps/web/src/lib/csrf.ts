// apps/web/src/lib/csrf.ts

/**
 * Безопасное чтение cookie в браузере.
 * Возвращает null на сервере или если куки нет.
 */
export function readCookie(name: string): string | null {
	if (typeof document === 'undefined') return null
	const escaped = name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1')
	const m = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'))
	return m ? decodeURIComponent(m[1]) : null
}

/**
 * Возвращает CSRF-токен из куки (по умолчанию 'se_csrf').
 */
export function getCsrfToken(cookieName = 'se_csrf'): string | null {
	return readCookie(cookieName)
}
