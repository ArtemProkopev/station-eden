// apps/api/src/db/data-source.ts
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { RefreshToken } from '../auth/refresh-token.entity'
import { EnvSchema } from '../config/env.schema'
import { User } from '../users/user.entity'

const rootEnv = path.resolve(process.cwd(), '../../.env')
const localEnv = path.resolve(process.cwd(), '.env')
const envPath = fs.existsSync(rootEnv) ? rootEnv : localEnv

dotenv.config({ path: envPath })

const parsed = EnvSchema.safeParse(process.env)
if (!parsed.success) {
	throw new Error(JSON.stringify(parsed.error.format(), null, 2))
}
const env = parsed.data

const base = {
	type: 'postgres' as const,
	entities: [User, RefreshToken],
	migrations: [path.join(__dirname, '../../migrations/*{.ts,.js}')],
	synchronize: false,
}

const dataSource = env.DATABASE_URL
	? new DataSource({ ...base, url: env.DATABASE_URL })
	: new DataSource({
			...base,
			host: env.POSTGRES_HOST!,
			port: Number(env.POSTGRES_PORT ?? 5432),
			username: env.POSTGRES_USER!,
			password: env.POSTGRES_PASSWORD!,
			database: env.POSTGRES_DB!,
	  })

export default dataSource
