import { z } from 'zod'

/**
 * Helpers
 */
const boolFromString = z.enum(['true', 'false']).transform(v => v === 'true')

const EmailList = z
	.string()
	.default('')
	.transform(s =>
		s
			.split(',')
			.map(x => x.trim().toLowerCase())
			.filter(Boolean)
	)

function hasSslRequire(url: string) {
	return (
		/(?:\?|&)sslmode=require(?:&|$)/i.test(url) || /sslmode=require/i.test(url)
	)
}

function looksLikeNeon(url: string) {
	return (
		/neon\.tech/i.test(url) ||
		/ep-[a-z0-9-]+\.c-\d+\.eu-central-1\.aws\.neon\.tech/i.test(url)
	)
}

function isLocalDbUrl(url: string) {
	return /(localhost|127\.0\.0\.1|0\.0\.0\.0|postgres|se-pg)/i.test(url)
}

const RawEnvSchema = z.object({
	// --- App ---
	NODE_ENV: z
		.enum(['development', 'test', 'production'])
		.default('development'),
	BIND_HOST: z.string().default('::'),

	// --- API ---
	API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
	API_CORS_ORIGIN: z.string().default(''),

	// --- Cookies / CSRF ---
	COOKIE_SECURE: boolFromString.default('false'),
	CSRF_COOKIE_NAME: z.string().default('se_csrf'),
	CSRF_COOKIE_DOMAIN: z.string().default(''),
	AUTH_COOKIE_DOMAIN: z.string().default(''),

	// --- JWT ---
	JWT_ACCESS_SECRET: z
		.string()
		.min(32, 'JWT_ACCESS_SECRET too short')
		.optional(),
	JWT_SECRET: z.string().min(32, 'JWT_SECRET too short').optional(),
	JWT_REFRESH_SECRET: z
		.string()
		.min(32, 'JWT_REFRESH_SECRET too short')
		.optional(),
	JWT_ACCESS_EXPIRES: z.string().default('15m'),
	JWT_REFRESH_TTL_MS: z.coerce.number().optional(),

	// --- Database ---
	DATABASE_URL: z.string().min(1).url(),

	// --- allow-list админов ---
	ADMIN_EMAILS: EmailList,

	// --- Frontend ---
	NEXT_PUBLIC_API_BASE: z.string().url().optional(),
	NEXT_PUBLIC_WS_BASE: z.string().url().optional(),

	// --- Google OAuth ---
	ENABLE_GOOGLE_LOGIN: boolFromString.default('false'),
	GOOGLE_CLIENT_ID: z.string().optional(),
	GOOGLE_CLIENT_SECRET: z.string().optional(),
	GOOGLE_REDIRECT_URL: z.string().url().optional(),
	WEB_AFTER_LOGIN_URL: z.string().url().optional(),

	// --- Email ---
	RESEND_API_KEY: z.string().optional(),
	EMAIL_FROM: z.string().optional(),

	// --- Dev mail mode ---
	MAIL_DEV_MODE: z.enum(['log', 'store']).optional(),
	DEV_EMAIL_PEEK_SECRET: z.string().optional(),

	// --- LiveKit ---
	LIVEKIT_URL: z.string().url().optional(),
	LIVEKIT_API_KEY: z.string().optional(),
	LIVEKIT_API_SECRET: z.string().optional(),

	// --- Telegram ---
	TELEGRAM_LOGIN_ENABLED: boolFromString.default('false'),
})

export const EnvSchema = RawEnvSchema.transform(env => {
	const jwtAccess = env.JWT_ACCESS_SECRET ?? env.JWT_SECRET
	return { ...env, JWT_ACCESS_SECRET: jwtAccess }
})
	.refine(e => !!e.JWT_ACCESS_SECRET, {
		path: ['JWT_ACCESS_SECRET'],
		message: 'Required (JWT_ACCESS_SECRET or JWT_SECRET)',
	})
	.superRefine((e, ctx) => {
		const url = e.DATABASE_URL

		// --- DB safety rails ---
		if (e.NODE_ENV === 'production') {
			if (!hasSslRequire(url)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['DATABASE_URL'],
					message:
						'In production DATABASE_URL must include sslmode=require (managed PG like Neon).',
				})
			}
			// чтобы не стартануть продом на localhost по ошибке
			if (isLocalDbUrl(url) && !looksLikeNeon(url)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['DATABASE_URL'],
					message:
						'DATABASE_URL looks like local in production. Refusing to start to prevent accidental misconfig.',
				})
			}

			// Cookies security
			if (e.COOKIE_SECURE !== true) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['COOKIE_SECURE'],
					message: 'In production COOKIE_SECURE must be true.',
				})
			}
			if (!e.CSRF_COOKIE_DOMAIN) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['CSRF_COOKIE_DOMAIN'],
					message:
						'In production CSRF_COOKIE_DOMAIN is required (e.g. .stationeden.ru).',
				})
			}
			if (!e.AUTH_COOKIE_DOMAIN) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['AUTH_COOKIE_DOMAIN'],
					message:
						'In production AUTH_COOKIE_DOMAIN is required (e.g. .stationeden.ru).',
				})
			}
		} else {
			if (hasSslRequire(url) || looksLikeNeon(url)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['DATABASE_URL'],
					message:
						'In development/test DATABASE_URL must be local (no sslmode=require / no Neon).',
				})
			}
		}

		// --- Google OAuth requirements ---
		if (e.ENABLE_GOOGLE_LOGIN) {
			if (!e.GOOGLE_CLIENT_ID) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['GOOGLE_CLIENT_ID'],
					message: 'Required when ENABLE_GOOGLE_LOGIN=true',
				})
			}
			if (!e.GOOGLE_CLIENT_SECRET) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['GOOGLE_CLIENT_SECRET'],
					message: 'Required when ENABLE_GOOGLE_LOGIN=true',
				})
			}
			if (!e.GOOGLE_REDIRECT_URL) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['GOOGLE_REDIRECT_URL'],
					message: 'Required when ENABLE_GOOGLE_LOGIN=true',
				})
			}
			if (!e.WEB_AFTER_LOGIN_URL) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['WEB_AFTER_LOGIN_URL'],
					message: 'Required when ENABLE_GOOGLE_LOGIN=true',
				})
			}
		}
	})

export type Env = z.infer<typeof EnvSchema>
