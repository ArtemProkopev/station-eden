const COOKIE_SECURE = (process.env.COOKIE_SECURE || '').toLowerCase() === 'true'

export function getCookieOptions(isHttpOnly = true) {
	const rawDomain = process.env.AUTH_COOKIE_DOMAIN
	const domain =
		typeof rawDomain === 'string' && rawDomain.length > 0
			? rawDomain
			: undefined

	const options: any = {
		httpOnly: isHttpOnly,
		path: '/',
		secure: COOKIE_SECURE,
		sameSite: COOKIE_SECURE ? 'none' : 'lax',
		maxAge: 1000 * 60 * 60 * 24 * 30,
	}

	if (domain) options.domain = domain
	if (COOKIE_SECURE) options.partitioned = true

	return options
}
