function setEnv(name: string, value: string) {
	if (!process.env[name]) {
		process.env[name] = value
	}
}

function patchConsoleOutput() {
	const ignoredMessages = ['[config] loaded env files', '[DEV][EmailService]']

	const originalLog = console.log.bind(console)
	const originalWarn = console.warn.bind(console)

	function shouldIgnore(message?: unknown) {
		return (
			typeof message === 'string' &&
			ignoredMessages.some(ignored => message.includes(ignored))
		)
	}

	console.log = (message?: unknown, ...args: unknown[]) => {
		if (shouldIgnore(message)) return
		originalLog(message, ...args)
	}

	console.warn = (message?: unknown, ...args: unknown[]) => {
		if (shouldIgnore(message)) return
		originalWarn(message, ...args)
	}
}

patchConsoleOutput()

process.env['NODE' + '_ENV'] = 'test'

setEnv('API_PORT', '4001')
setEnv('API_CORS_ORIGIN', 'http://localhost:3000')

process.env['COOKIE_SECURE'] = 'false'
setEnv('CSRF_COOKIE_NAME', 'se_csrf')

setEnv('JWT_ACCESS_SECRET', 'test_access_secret_12345678901234567890')
setEnv('JWT_SECRET', 'test_access_secret_12345678901234567890')

setEnv('JWT_ACCESS_EXPIRES', '15m')
setEnv('JWT_REFRESH_TTL_MS', String(7 * 24 * 60 * 60 * 1000))

process.env['ENABLE_GOOGLE_LOGIN'] = 'false'
process.env['ENABLE_YANDEX_LOGIN'] = 'false'

setEnv('ADMIN_EMAILS', 'admin@example.com')

process.env['MAIL_DEV_MODE'] = 'store'
setEnv('EMAIL_FROM', 'test@example.com')

// Используется локальная dev-БД.
// DATABASE_URL очищается, чтобы AppModule не включал SSL.
process.env['DATABASE_URL'] = ''

setEnv('POSTGRES_HOST', '127.0.0.1')
setEnv('POSTGRES_PORT', '5432')
setEnv('POSTGRES_USER', 'postgres')
setEnv('POSTGRES_PASSWORD', 'postgres')
setEnv('POSTGRES_DB', 'station_eden_dev')
