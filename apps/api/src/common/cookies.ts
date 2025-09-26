export function getCookieOptions(isHttpOnly = true) {
	const isProd = process.env.NODE_ENV === 'production'
	const secure = process.env.COOKIE_SECURE === 'true' || isProd
	const domain = process.env.AUTH_COOKIE_DOMAIN || undefined

	return {
		httpOnly: isHttpOnly,
		path: '/',
		secure,
		sameSite: isProd ? 'none' : 'lax',
		...(domain ? { domain } : {}),
		maxAge: 1000 * 60 * 60 * 24 * 30,
	} as const
}
