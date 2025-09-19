// apps/api/src/db/data-source.ts
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import 'reflect-metadata'
import { DataSource } from 'typeorm'

import { RefreshToken } from '../auth/refresh-token.entity'
import { EnvSchema } from '../config/env.schema'
import { User } from '../users/user.entity'

// подхватываем .env из корня монорепы (../../.env) или локальный рядом
const rootEnv = path.resolve(process.cwd(), '../../.env')
const localEnv = path.resolve(process.cwd(), '.env')
const envPath = fs.existsSync(rootEnv) ? rootEnv : localEnv

dotenv.config({ path: envPath })

// валидация переменных окружения (как и было)
const parsed = EnvSchema.safeParse(process.env)
if (!parsed.success) {
	throw new Error(JSON.stringify(parsed.error.format(), null, 2))
}
const env = parsed.data

// общая часть конфига
const base = {
	type: 'postgres' as const,
	entities: [User, RefreshToken],
	migrations: [path.join(__dirname, '../../migrations/*{.ts,.js}')],
	synchronize: false, // миграции, не автосинк
}

// если есть DATABASE_URL (Neon/Supabase/любой managed PG) — используем его
// и включаем SSL (важно для Neon)
const dataSource = env.DATABASE_URL
	? new DataSource({
			...base,
			url: env.DATABASE_URL,
			ssl: { rejectUnauthorized: false },
			// при желании можно ограничить пул, чтобы не жрать коннекты на free:
			// extra: { max: 5, connectionTimeoutMillis: 10000 },
	  })
	: new DataSource({
			...base,
			host: env.POSTGRES_HOST!,
			port: Number(env.POSTGRES_PORT ?? 5432),
			username: env.POSTGRES_USER!,
			password: env.POSTGRES_PASSWORD!,
			database: env.POSTGRES_DB!,
			// локально SSL не нужен
	  })

export default dataSource
