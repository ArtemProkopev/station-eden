// apps/api/src/config/env.schema.ts
import { z } from 'zod'

const RawEnvSchema = z.object({
	NODE_ENV: z
		.enum(['development', 'test', 'production'])
		.default('development'),

	// API
	API_PORT: z.coerce.number().default(4000),
	API_CORS_ORIGIN: z.string().optional(), // "a,b,c"

	// Cookies / CSRF
	COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
	CSRF_COOKIE_NAME: z.string().default('csrf_token'),

	// JWT
	JWT_ACCESS_SECRET: z
		.string()
		.min(32, 'JWT_ACCESS_SECRET too short')
		.optional(),
	JWT_SECRET: z.string().min(32, 'JWT_SECRET too short').optional(), // fallback
	JWT_ACCESS_EXPIRES: z.string().default('15m'),
	JWT_REFRESH_TTL_MS: z.coerce.number().optional(),

	// БД
	DATABASE_URL: z.string().url().optional(),
	POSTGRES_HOST: z.string().optional(),
	POSTGRES_PORT: z.coerce.number().optional(),
	POSTGRES_USER: z.string().optional(),
	POSTGRES_PASSWORD: z.string().optional(),
	POSTGRES_DB: z.string().optional(),

	// фронт (только для прокидки в респонсы/редиректы при надобности)
	NEXT_PUBLIC_API_BASE: z.string().url().optional(),

	// allow-list админов
	ADMIN_EMAILS: z.string().optional().default(''),

	// Google OAuth
	ENABLE_GOOGLE_LOGIN: z.enum(['true', 'false']).default('false'),
	GOOGLE_CLIENT_ID: z.string().optional(),
	GOOGLE_CLIENT_SECRET: z.string().optional(),
	GOOGLE_REDIRECT_URL: z.string().url().optional(),
	WEB_AFTER_LOGIN_URL: z.string().url().optional(),
})

export const EnvSchema = RawEnvSchema.transform(env => ({
	...env,
	JWT_ACCESS_SECRET: env.JWT_ACCESS_SECRET ?? env.JWT_SECRET,
})).refine(e => !!e.JWT_ACCESS_SECRET, {
	path: ['JWT_ACCESS_SECRET'],
	message: 'Required',
})

export type Env = z.infer<typeof EnvSchema>
