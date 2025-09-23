import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'

import { AppModule } from './app.module'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'
import { CsrfMiddleware } from './common/middleware/csrf.middleware'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)

	app.use(helmet())
	app.use(cookieParser())

	app.enableCors({
		origin: process.env.API_CORS_ORIGIN?.split(',') ?? [],
		credentials: true,
		allowedHeaders: ['Content-Type', 'x-csrf-token'], // важно для CSRF
	})

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
		})
	)

	app.useGlobalInterceptors(new ResponseInterceptor())
	app.use(CsrfMiddleware as any)

	const port = Number(process.env.API_PORT || 4000)
	await app.listen(port, '0.0.0.0')
	console.log(`API listening on http://0.0.0.0:${port}`)
}

bootstrap()
