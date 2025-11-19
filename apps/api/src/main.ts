import { NestFactory } from '@nestjs/core'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { ZodValidationPipe } from 'nestjs-zod'
import { DataSource } from 'typeorm'

import { AppModule } from './app.module'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'
import { CsrfMiddleware } from './common/middleware/csrf.middleware'

async function bootstrap() {
	const app = await NestFactory.create(AppModule, {
		logger: ['error', 'warn', 'log'],
	})

	// Включаем доверие прокси Caddy (важно для OAuth/Cookies)
	const expressApp = app.getHttpAdapter().getInstance()
	expressApp.set('trust proxy', 1)

	// Миграции
	try {
		const dataSource = app.get(DataSource)
		if (dataSource.isInitialized) {
			console.log('[System] Running database migrations...')
			await dataSource.runMigrations()
			console.log('[System] Database migrations completed')
		} else {
			console.warn('[System] DataSource not initialized, skipping migrations')
		}
	} catch (error) {
		console.error('[System] Migration failed:', error)
	}

	app.use(
		helmet({
			crossOriginEmbedderPolicy: false,
			crossOriginResourcePolicy: { policy: 'cross-origin' },
			// ОТКЛЮЧАЕМ CSP НА API (он мешает OAuth и управляется фронтом)
			contentSecurityPolicy: false,
		})
	)
	app.use(cookieParser())

	const corsOrigins = process.env.API_CORS_ORIGIN?.split(',') || []
	app.enableCors({
		origin: corsOrigins,
		credentials: true,
		allowedHeaders: [
			'Content-Type',
			'X-CSRF-Token',
			'csrf-token',
			'x-csrf-token',
		],
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
	})

	app.useGlobalPipes(new ZodValidationPipe())

	app.useGlobalInterceptors(new ResponseInterceptor())
	app.use(CsrfMiddleware as any)

	const port = Number(process.env.API_PORT || 4000)
	const host = process.env.BIND_HOST || '::'
	await app.listen(port, host)

	const shownHost = host === '::' ? 'localhost' : host
	console.log(`[System] API listening on http://${shownHost}:${port}`)
	console.log(`[System] CORS origins: ${corsOrigins.join(', ')}`)
}

bootstrap()
