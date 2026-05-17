import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import request from 'supertest'
import { Repository } from 'typeorm'

import { AppModule } from '../src/app.module'
import { EmailCode } from '../src/auth/email-code.entity'
import { User } from '../src/users/user.entity'
import { registerAndAuthorizeUser } from './helpers/auth'
import { cleanupE2EUsers } from './helpers/cleanup'
import { mergeCookieHeaders } from './helpers/cookies'
import { getCsrf } from './helpers/csrf'
import { setupTestApp } from './setup-test-app'

describe('Авторизация REST API', () => {
	let app: INestApplication
	let emailCodesRepo: Repository<EmailCode>
	let usersRepo: Repository<User>

	const createdEmails: string[] = []

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		}).compile()

		app = moduleRef.createNestApplication()
		setupTestApp(app)

		await app.init()

		emailCodesRepo = moduleRef.get<Repository<EmailCode>>(
			getRepositoryToken(EmailCode),
		)

		usersRepo = moduleRef.get<Repository<User>>(getRepositoryToken(User))
	})

	afterAll(async () => {
		await cleanupE2EUsers({
			emails: createdEmails,
			emailCodesRepo,
			usersRepo,
		})

		await app.close()
	})

	it('получает CSRF-токен и cookie', async () => {
		const { csrf, cookieHeader } = await getCsrf(app)

		expect(csrf).toBeTruthy()
		expect(cookieHeader).toContain('se_csrf=')
	})

	it('отклоняет регистрацию без CSRF-токена', async () => {
		await request(app.getHttpServer())
			.post('/auth/register')
			.send({
				email: `csrf_${Date.now()}@example.com`,
				username: `csrf${Date.now().toString().slice(-6)}`,
				password: 'Password123',
			})
			.expect(403)
	})

	it('отклоняет регистрацию с некорректным email', async () => {
		const { csrf, cookieHeader } = await getCsrf(app)

		await request(app.getHttpServer())
			.post('/auth/register')
			.set('Cookie', cookieHeader)
			.set('x-csrf-token', csrf)
			.send({
				email: 'invalid-email',
				username: 'validuser123',
				password: 'Password123',
			})
			.expect(400)
	})

	it('запрещает доступ к /auth/me без JWT-cookie', async () => {
		await request(app.getHttpServer()).get('/auth/me').expect(401)
	})

	it('регистрирует пользователя, подтверждает email-код и открывает /auth/me', async () => {
		const user = await registerAndAuthorizeUser(app, emailCodesRepo)

		createdEmails.push(user.email)

		const meRes = await request(app.getHttpServer())
			.get('/auth/me')
			.set('Cookie', user.authCookieHeader)
			.expect(200)

		const bodyText = JSON.stringify(meRes.body)

		expect(bodyText).toContain(user.email)
		expect(bodyText).toContain(user.username)
	})

	it('возвращает авторизованную сессию', async () => {
		const user = await registerAndAuthorizeUser(app, emailCodesRepo)

		createdEmails.push(user.email)

		const sessionRes = await request(app.getHttpServer())
			.get('/auth/session')
			.set('Cookie', user.authCookieHeader)
			.expect(200)

		const bodyText = JSON.stringify(sessionRes.body)

		expect(bodyText).toContain('signed-in')
		expect(bodyText).toContain(user.email)
		expect(bodyText).toContain(user.username)
	})

	it('отклоняет повторную регистрацию с тем же email', async () => {
		const user = await registerAndAuthorizeUser(app, emailCodesRepo)

		createdEmails.push(user.email)

		const { csrf, cookieHeader } = await getCsrf(app)

		await request(app.getHttpServer())
			.post('/auth/register')
			.set('Cookie', cookieHeader)
			.set('x-csrf-token', csrf)
			.send({
				email: user.email,
				username: `dup${Date.now().toString().slice(-8)}`,
				password: 'Password123',
			})
			.expect(409)
	})

	it('выполняет выход пользователя из системы', async () => {
		const user = await registerAndAuthorizeUser(app, emailCodesRepo)

		createdEmails.push(user.email)

		const { csrf, cookieHeader } = await getCsrf(app)

		const logoutRes = await request(app.getHttpServer())
			.post('/auth/logout')
			.set('Cookie', mergeCookieHeaders(cookieHeader, user.authCookieHeader))
			.set('x-csrf-token', csrf)
			.expect(201)

		const bodyText = JSON.stringify(logoutRes.body)

		expect(bodyText).toContain('ok')
	})
})
