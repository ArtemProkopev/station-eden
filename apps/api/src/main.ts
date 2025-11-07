import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'

import { AppModule } from './app.module'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'
import { CsrfMiddleware } from './common/middleware/csrf.middleware'

async function bootstrap() {
	const app = await NestFactory.create(AppModule, {
		logger: ['error', 'warn', 'log'],
	})

	app.use(
		helmet({
			crossOriginEmbedderPolicy: false,
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

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		})
	)

	app.useGlobalInterceptors(new ResponseInterceptor())
	app.use(CsrfMiddleware as any)

	const port = Number(process.env.API_PORT || 4000)
	const host = process.env.BIND_HOST || '::'
	await app.listen(port, host)

	const shownHost = host === '::' ? 'localhost' : host
	console.log(`API listening on http://${shownHost}:${port}`)
	console.log(`CORS origins: ${corsOrigins.join(', ')}`)
	console.log(`Socket.IO enabled on path /lobby`)
}

bootstrap()
