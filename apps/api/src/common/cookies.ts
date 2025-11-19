export function getCookieOptions(isHttpOnly = true) {
	// Поскольку мы за Caddy с HTTPS, Secure обязан быть true для SameSite: none
	const secure = true
	const domain = process.env.AUTH_COOKIE_DOMAIN || '.stationeden.ru'

	// Используем any, чтобы TypeScript не ругался на partitioned
	const options: any = {
		httpOnly: isHttpOnly,
		path: '/',
		secure,
		// 'none' критически важен для OAuth редиректов
		sameSite: 'none',
		domain,
		maxAge: 1000 * 60 * 60 * 24 * 30,
		// Требование Chrome для сторонних кук (разные поддомены считаются таковыми в контексте iframe/fetch)
		partitioned: true,
	}

	return options
}
