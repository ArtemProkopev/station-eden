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
import { RefreshToken } from './auth/refresh-token.entity'
import { NotFoundExceptionFilter } from './common/filters/not-found.filter'
import { EnvSchema } from './config/env.schema'
import { User } from './users/user.entity'
import { UsersModule } from './users/users.module'

function resolveEnvPaths(): string[] {
	const rootEnv = path.resolve(process.cwd(), '../../.env')
	const localEnv = path.resolve(process.cwd(), '.env')
	const paths: string[] = []
	if (fs.existsSync(rootEnv)) paths.push(rootEnv)
	if (fs.existsSync(localEnv)) paths.push(localEnv)
	if (paths.length === 0) {
		console.warn(
			'[config] .env not found at:',
			rootEnv,
			'or',
			localEnv,
			'— relying on process.env only'
		)
	} else {
		console.log('[config] loaded .env from:', paths.join(', '))
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
				if (!parsed.success)
					throw new Error(JSON.stringify(parsed.error.format(), null, 2))
				return parsed.data
			},
		}),

		TypeOrmModule.forRootAsync({
			inject: [ConfigService],
			useFactory: async (cfg: ConfigService) => {
				const dbUrl =
					cfg.get<string>('DATABASE_URL') ?? process.env.DATABASE_URL
				if (dbUrl) {
					return {
						type: 'postgres' as const,
						url: dbUrl,
						entities: [User, RefreshToken, EmailCode],
						synchronize: false,
					}
				}
				return {
					type: 'postgres' as const,
					host: cfg.get<string>('POSTGRES_HOST') ?? process.env.POSTGRES_HOST,
					port: cfg.get<number>('POSTGRES_PORT', 5432),
					username:
						cfg.get<string>('POSTGRES_USER') ?? process.env.POSTGRES_USER,
					password:
						cfg.get<string>('POSTGRES_PASSWORD') ??
						process.env.POSTGRES_PASSWORD,
					database: cfg.get<string>('POSTGRES_DB') ?? process.env.POSTGRES_DB,
					entities: [User, RefreshToken, EmailCode],
					synchronize: false,
				}
			},
		}),

		ThrottlerModule.forRoot([{ ttl: 300_000, limit: 100 }]),
		AuthModule,
		UsersModule,
	],
	providers: [
		// глобальная обработка 404 ошибок
		{
			provide: APP_FILTER,
			useClass: NotFoundExceptionFilter,
		},
	],
})
export class AppModule {}
