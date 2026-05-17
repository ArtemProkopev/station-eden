import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { Repository } from 'typeorm'

import { EmailCode } from '../../src/auth/email-code.entity'
import { getCookieHeader, mergeCookieHeaders } from './cookies'
import { getCsrf } from './csrf'

export interface RegisteredAuthUser {
	email: string
	username: string
	password: string
	authCookieHeader: string
}

function createUniqueSuffix() {
	const timePart = Date.now().toString().slice(-6)
	const randomPart = Math.floor(Math.random() * 10000)
		.toString()
		.padStart(4, '0')

	return `${timePart}${randomPart}`
}

export async function registerAndAuthorizeUser(
	app: INestApplication,
	emailCodesRepo: Repository<EmailCode>,
): Promise<RegisteredAuthUser> {
	const { csrf, cookieHeader } = await getCsrf(app)

	const suffix = createUniqueSuffix()

	const email = `e2e_${suffix}@example.com`
	const username = `e2e${suffix}`
	const password = 'Password123'

	const registerRes = await request(app.getHttpServer())
		.post('/auth/register')
		.set('Cookie', cookieHeader)
		.set('x-csrf-token', csrf)
		.send({
			email,
			username,
			password,
		})
		.expect(201)

	const preauthCookieHeader = getCookieHeader(registerRes)

	if (!preauthCookieHeader.includes('preauth=')) {
		throw new Error('Preauth cookie was not returned after registration')
	}

	const emailCode = await emailCodesRepo.findOne({
		where: {
			email,
			used: false,
		},
		order: {
			createdAt: 'DESC',
		},
	})

	if (!emailCode) {
		throw new Error(`Email code for ${email} was not created`)
	}

	const verifyRes = await request(app.getHttpServer())
		.post('/auth/verify-email-code')
		.set('Cookie', mergeCookieHeaders(cookieHeader, preauthCookieHeader))
		.set('x-csrf-token', csrf)
		.send({
			email,
			code: emailCode.code,
		})
		.expect(201)

	const authCookieHeader = getCookieHeader(verifyRes)

	if (!authCookieHeader.includes('access_token=')) {
		throw new Error('Access token cookie was not returned')
	}

	if (!authCookieHeader.includes('refresh_token=')) {
		throw new Error('Refresh token cookie was not returned')
	}

	return {
		email,
		username,
		password,
		authCookieHeader,
	}
}
