import { INestApplication } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { ZodValidationPipe } from 'nestjs-zod'

import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor'
import { CsrfMiddleware } from '../src/common/middleware/csrf.middleware'

export function setupTestApp(app: INestApplication) {
	const expressApp = app.getHttpAdapter().getInstance()
	expressApp.set('trust proxy', 1)

	app.use(
		helmet({
			crossOriginEmbedderPolicy: false,
			crossOriginResourcePolicy: { policy: 'cross-origin' },
			contentSecurityPolicy: false,
		}),
	)

	app.use(cookieParser())

	app.enableCors({
		origin: ['http://localhost:3000'],
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
}
