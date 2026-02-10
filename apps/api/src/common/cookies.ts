// apps/api/src/common/cookies.ts
type SameSite = 'lax' | 'strict' | 'none'

const NODE_ENV = process.env.NODE_ENV || 'development'

// В проде secure всегда должен быть true (у тебя так и есть)
const COOKIE_SECURE =
	(process.env.COOKIE_SECURE || '').toLowerCase() === 'true' ||
	NODE_ENV === 'production'

// SameSite по умолчанию LAX — для поддоменов stationeden.ru этого достаточно.
// None нужно только если реально third-party (не твой кейс).
const COOKIE_SAMESITE =
	((process.env.COOKIE_SAMESITE || 'lax').toLowerCase() as SameSite) || 'lax'

export function getCookieOptions(isHttpOnly = true) {
	// DOMAIN:
	// 1) Если явно задано AUTH_COOKIE_DOMAIN → используем его
	// 2) Если прод и домен не задан → по умолчанию .stationeden.ru
	const rawDomain = process.env.AUTH_COOKIE_DOMAIN
	let domain: string | undefined

	if (typeof rawDomain === 'string' && rawDomain.trim().length > 0) {
		domain = rawDomain.trim()
	} else if (NODE_ENV === 'production') {
		domain = '.stationeden.ru'
	}

	const options: any = {
		httpOnly: isHttpOnly,
		path: '/',
		secure: COOKIE_SECURE,
		sameSite: COOKIE_SAMESITE,
		maxAge: 1000 * 60 * 60 * 24 * 30, // 30 дней
	}

	if (domain) options.domain = domain

	return options
}
