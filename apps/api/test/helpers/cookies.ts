import type { Response } from 'supertest'

export function getSetCookieArray(res: Response): string[] {
	const raw = res.headers['set-cookie']

	if (!raw) return []

	return Array.isArray(raw) ? raw : [raw]
}

export function getCookieHeader(res: Response): string {
	return getSetCookieArray(res)
		.map(cookie => cookie.split(';')[0])
		.join('; ')
}

export function mergeCookieHeaders(...headers: Array<string | undefined>) {
	return headers.filter(Boolean).join('; ')
}

export function getCookieValue(
	setCookie: string[] | undefined,
	name: string,
): string | undefined {
	const cookie = setCookie?.find(item => item.startsWith(`${name}=`))

	if (!cookie) return undefined

	return cookie.split(';')[0].split('=')[1]
}
