import * as path from 'path'
import 'reflect-metadata'
import { DataSource } from 'typeorm'

import { EnvSchema } from '../config/env.schema'

import { EmailCode } from '../auth/email-code.entity'
import { LoginAttempt } from '../auth/login-attempt.entity'
import { OAuthAccount } from '../auth/oauth-account.entity'
import { RefreshToken } from '../auth/refresh-token.entity'
import { User } from '../users/user.entity'

/**
 * Этот файл НЕ читает .env/.env.local сам.
 * Env должен быть загружен снаружи (dotenv-cli в scripts),
 * чтобы не было “путаницы” из-за process.cwd().
 */

const parsed = EnvSchema.safeParse(process.env)
if (!parsed.success) {
	throw new Error(JSON.stringify(parsed.error.format(), null, 2))
}
const env = parsed.data

const databaseUrl: string = env.DATABASE_URL

function sslFromUrl(url: string): false | { rejectUnauthorized: boolean } {
	// Neon/managed PG обычно требует sslmode=require
	// Локалка: sslmode=disable (или без параметра)
	if (url.includes('sslmode=require')) return { rejectUnauthorized: false }
	return false
}

const migrationsGlob = path.resolve(__dirname, '../../migrations/*{.ts,.js}')

const dataSource = new DataSource({
	type: 'postgres',
	url: databaseUrl,
	ssl: sslFromUrl(databaseUrl),

	entities: [User, RefreshToken, EmailCode, OAuthAccount, LoginAttempt],
	migrations: [migrationsGlob],

	synchronize: false,
	migrationsRun: false,

	extra: { connectionTimeoutMillis: 10_000, max: 10 },
})

export default dataSource
