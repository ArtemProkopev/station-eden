// apps/api/src/common/cookies.ts

const COOKIE_SECURE = (process.env.COOKIE_SECURE || '').toLowerCase() === 'true'
const NODE_ENV = process.env.NODE_ENV || 'development'

export function getCookieOptions(isHttpOnly = true) {
	// DOMAIN:
	// 1) Если явно задано AUTH_COOKIE_DOMAIN → используем его
	// 2) Если prod и домен не задан → по умолчанию .stationeden.ru
	// 3) В dev (localhost) домен НЕ ставим (пусть будет host-only cookie)
	const rawDomain = process.env.AUTH_COOKIE_DOMAIN
	let domain: string | undefined

	if (typeof rawDomain === 'string' && rawDomain.length > 0) {
		domain = rawDomain
	} else if (NODE_ENV === 'production') {
		domain = '.stationeden.ru'
	}

	const options: any = {
		httpOnly: isHttpOnly,
		path: '/',
		secure: COOKIE_SECURE,
		// Если secure=true -> только SameSite=None (иначе браузеры режут куки в кросс-сценариях)
		// Если secure=false -> Lax, чтобы локалка нормально жила на http
		sameSite: COOKIE_SECURE ? 'none' : 'lax',
		maxAge: 1000 * 60 * 60 * 24 * 30, // 30 дней
	}

	if (domain) options.domain = domain

	return options
}
