import { INestApplication } from '@nestjs/common'
import request from 'supertest'

import { getCookieHeader, getCookieValue, getSetCookieArray } from './cookies'

export interface CsrfData {
	csrf: string
	cookieHeader: string
}

export async function getCsrf(app: INestApplication): Promise<CsrfData> {
	const res = await request(app.getHttpServer()).get('/auth/csrf').expect(200)

	const setCookies = getSetCookieArray(res)
	const csrf = getCookieValue(setCookies, 'se_csrf')

	if (!csrf) {
		throw new Error('CSRF cookie was not returned')
	}

	return {
		csrf,
		cookieHeader: getCookieHeader(res),
	}
}
