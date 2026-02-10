import { z } from 'zod'

const emptyToUndef = (v: unknown) => (v === '' ? undefined : v)

const boolStr = z.preprocess(
	emptyToUndef,
	z.enum(['true', 'false']).default('false'),
)
const strOpt = z.preprocess(emptyToUndef, z.string().optional())
const urlOpt = z.preprocess(emptyToUndef, z.string().url().optional())

const RawEnvSchema = z.object({
	NODE_ENV: z
		.enum(['development', 'test', 'production'])
		.default('development'),

	API_PORT: z.coerce.number().default(4000),
	API_CORS_ORIGIN: strOpt,

	COOKIE_SECURE: z.preprocess(
		emptyToUndef,
		z.enum(['true', 'false']).default('false'),
	),
	CSRF_COOKIE_NAME: z.preprocess(emptyToUndef, z.string().default('se_csrf')),
	CSRF_COOKIE_DOMAIN: strOpt,
	COOKIE_DOMAIN: strOpt,
	AUTH_COOKIE_DOMAIN: strOpt,

	JWT_ACCESS_SECRET: z.preprocess(emptyToUndef, z.string().min(32).optional()),
	JWT_SECRET: z.preprocess(emptyToUndef, z.string().min(32).optional()),
	JWT_ACCESS_EXPIRES: z.preprocess(emptyToUndef, z.string().default('15m')),
	JWT_REFRESH_TTL_MS: z.preprocess(emptyToUndef, z.coerce.number().optional()),

	DATABASE_URL: z.preprocess(emptyToUndef, z.string().url().optional()),
	POSTGRES_HOST: strOpt,
	POSTGRES_PORT: z.preprocess(emptyToUndef, z.coerce.number().optional()),
	POSTGRES_USER: strOpt,
	POSTGRES_PASSWORD: strOpt,
	POSTGRES_DB: strOpt,

	ADMIN_EMAILS: z.preprocess(emptyToUndef, z.string().optional().default('')),

	// Google
	ENABLE_GOOGLE_LOGIN: boolStr,
	GOOGLE_CLIENT_ID: strOpt,
	GOOGLE_CLIENT_SECRET: strOpt,
	GOOGLE_REDIRECT_URL: urlOpt,
	WEB_AFTER_LOGIN_URL: urlOpt,

	// Yandex
	ENABLE_YANDEX_LOGIN: boolStr,
	YANDEX_CLIENT_ID: strOpt,
	YANDEX_CLIENT_SECRET: strOpt,
	YANDEX_REDIRECT_URL: urlOpt,

	RESEND_API_KEY: strOpt,
	EMAIL_FROM: strOpt,

	LIVEKIT_URL: urlOpt,
	LIVEKIT_API_KEY: strOpt,
	LIVEKIT_API_SECRET: strOpt,
})

export const EnvSchema = RawEnvSchema.transform(env => ({
	...env,
	JWT_ACCESS_SECRET: env.JWT_ACCESS_SECRET ?? env.JWT_SECRET,
}))
	.refine(e => !!e.JWT_ACCESS_SECRET, {
		path: ['JWT_ACCESS_SECRET'],
		message: 'Required',
	})
	.superRefine((e, ctx) => {
		if (e.ENABLE_YANDEX_LOGIN === 'true') {
			if (!e.YANDEX_CLIENT_ID)
				ctx.addIssue({
					code: 'custom',
					path: ['YANDEX_CLIENT_ID'],
					message: 'Required when ENABLE_YANDEX_LOGIN=true',
				})
			if (!e.YANDEX_CLIENT_SECRET)
				ctx.addIssue({
					code: 'custom',
					path: ['YANDEX_CLIENT_SECRET'],
					message: 'Required when ENABLE_YANDEX_LOGIN=true',
				})
			if (!e.YANDEX_REDIRECT_URL)
				ctx.addIssue({
					code: 'custom',
					path: ['YANDEX_REDIRECT_URL'],
					message: 'Required when ENABLE_YANDEX_LOGIN=true',
				})
		}
	})
