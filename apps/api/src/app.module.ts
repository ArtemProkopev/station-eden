// apps/api/src/app.module.ts
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_FILTER } from '@nestjs/core'
import { ThrottlerModule } from '@nestjs/throttler'
import { TypeOrmModule } from '@nestjs/typeorm'
import * as fs from 'fs'
import * as path from 'path'

import { AuthModule } from './auth/auth.module'
import { EmailCode } from './auth/email-code.entity'
import { LoginAttempt } from './auth/login-attempt.entity'
import { OAuthAccount } from './auth/oauth-account.entity'
import { RefreshToken } from './auth/refresh-token.entity'
import { NotFoundExceptionFilter } from './common/filters/not-found.filter'
import { EnvSchema } from './config/env.schema'
import { GameModule } from './game/game.module'
import { LobbyModule } from './lobby/lobby.module'
import { TimeModule } from './time/time.module' // Добавляем импорт TimeModule
import { User } from './users/user.entity'
import { UsersModule } from './users/users.module'
import { VoiceModule } from './voice/voice.module'

function resolveEnvPaths(): string[] {
	const cwd = process.cwd()
	const rootEnv = path.resolve(cwd, '../../.env')
	const rootEnvLocal = path.resolve(cwd, '../../.env.local')
	const apiEnv = path.resolve(cwd, '.env')
	const apiEnvLocal = path.resolve(cwd, '.env.local')

	const paths: string[] = []

	if (fs.existsSync(rootEnv)) paths.push(rootEnv)
	if (fs.existsSync(apiEnv)) paths.push(apiEnv)

	const nodeEnv = process.env.NODE_ENV || 'development'
	if (nodeEnv !== 'production') {
		if (fs.existsSync(rootEnvLocal)) paths.push(rootEnvLocal)
		if (fs.existsSync(apiEnvLocal)) paths.push(apiEnvLocal)
	}

	if (paths.length === 0) {
		console.warn(
			'[config] .env/.env.local not found at:',
			rootEnv,
			'or',
			apiEnv,
			'— relying on process.env only',
		)
	} else {
		console.log('[config] loaded env files (in order):', paths.join(', '))
	}

	return paths
}

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: resolveEnvPaths(),
			validate: raw => {
				const parsed = EnvSchema.safeParse(raw)
				if (!parsed.success) {
					throw new Error(JSON.stringify(parsed.error.format(), null, 2))
				}
				return parsed.data
			},
		}),

		TypeOrmModule.forRootAsync({
			inject: [ConfigService],
			useFactory: async (cfg: ConfigService) => {
				/**
				 * Runtime (контейнер):
				 * WORKDIR=/app
				 * dist лежит в /app/dist
				 * миграции: /app/dist/migrations/*.js
				 */
				const migrationsGlob = path.join(process.cwd(), 'dist/migrations/*.js')

				const dbUrl =
					cfg.get<string>('DATABASE_URL') ?? process.env.DATABASE_URL

				const common = {
					type: 'postgres' as const,
					entities: [User, RefreshToken, EmailCode, OAuthAccount, LoginAttempt],
					migrations: [migrationsGlob],
					synchronize: false,
					extra: { connectionTimeoutMillis: 10_000, max: 10 },
				}

				if (dbUrl) {
					return {
						...common,
						url: dbUrl,
						ssl: { rejectUnauthorized: false },
					}
				}

				return {
					...common,
					host: cfg.get<string>('POSTGRES_HOST') ?? process.env.POSTGRES_HOST,
					port: Number(cfg.get<number>('POSTGRES_PORT', 5432)),
					username:
						cfg.get<string>('POSTGRES_USER') ?? process.env.POSTGRES_USER,
					password:
						cfg.get<string>('POSTGRES_PASSWORD') ??
						process.env.POSTGRES_PASSWORD,
					database: cfg.get<string>('POSTGRES_DB') ?? process.env.POSTGRES_DB,
					ssl: false,
				}
			},
		}),

		ThrottlerModule.forRoot([{ ttl: 300_000, limit: 100 }]),
		AuthModule,
		UsersModule,
		GameModule,
		LobbyModule,
		VoiceModule,
		TimeModule, // Добавляем TimeModule в imports
	],
	providers: [{ provide: APP_FILTER, useClass: NotFoundExceptionFilter }],
})
export class AppModule {}