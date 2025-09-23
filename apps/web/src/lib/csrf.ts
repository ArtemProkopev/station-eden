// apps/web/src/lib/csrf.ts
export function getCookie(name: string) {
	const pattern = new RegExp(
		'(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'
	)
	const match = document.cookie.match(pattern)
	return match ? decodeURIComponent(match[1]) : ''
}

export function getCsrfToken(name = 'se_csrf') {
	return getCookie(name)
}
