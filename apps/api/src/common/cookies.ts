// apps/api/src/common/cookies.ts
const COOKIE_SECURE = (process.env.COOKIE_SECURE || '').toLowerCase() === 'true'
const NODE_ENV = process.env.NODE_ENV || 'development'

export function getCookieOptions(isHttpOnly = true) {
	// DOMAIN:
	// 1) Если явно задано AUTH_COOKIE_DOMAIN → используем его
	// 2) Если прод и домен не задан → по умолчанию .stationeden.ru
	const rawDomain = process.env.AUTH_COOKIE_DOMAIN
	let domain: string | undefined

	if (typeof rawDomain === 'string' && rawDomain.length > 0) {
		domain = rawDomain
	} else if (NODE_ENV === 'production') {
		// ⚠️ если у тебя другой боевой домен — поменяй тут
		domain = '.stationeden.ru'
	}

	const options: any = {
		httpOnly: isHttpOnly,
		path: '/',
		secure: COOKIE_SECURE,
		sameSite: COOKIE_SECURE ? 'none' : 'lax',
		maxAge: 1000 * 60 * 60 * 24 * 30, // 30 дней
	}

	if (domain) options.domain = domain

	// partitioned-куки нужны только для third-party-кейсов.
	// Для нашего сценария (поддомены) можно вообще не трогать.
	// Если прям нужно — оставь, но это не обязательно.
	if (COOKIE_SECURE) {
		// options.partitioned = true
	}

	return options
}
