import { NextFunction, Request, Response } from 'express'
import crypto from 'node:crypto'

/** Имя и домен CSRF-куки, читаемые и фронтом, и API */
export const CSRF_COOKIE = (process.env.CSRF_COOKIE_NAME || 'se_csrf').trim()
export const CSRF_DOMAIN =
	(process.env.CSRF_COOKIE_DOMAIN || '').trim() || undefined // напр. ".stationeden.ru"

function issueToken() {
	return crypto.randomBytes(24).toString('hex')
}

export function setCsrfCookie(res: Response) {
	const token = issueToken()
	res.cookie(CSRF_COOKIE, token, {
		httpOnly: false, // читаем из JS на фронте
		sameSite: 'lax',
		secure: process.env.COOKIE_SECURE === 'true',
		path: '/',
		...(CSRF_DOMAIN ? { domain: CSRF_DOMAIN } : {}),
	})
	return token
}

/** Вернёт существующий токен из куки или создаст новый и вернёт его */
export function ensureCsrfCookie(req: Request, res: Response) {
	const existing = req.cookies?.[CSRF_COOKIE]
	if (existing) return existing
	return setCsrfCookie(res)
}

/** Global CSRF middleware: double-submit cookie для /auth* */
export function CsrfMiddleware(
	req: Request,
	res: Response,
	next: NextFunction
) {
	// если куки нет — выдаём новую (для GET-запросов и т.п.)
	if (!req.cookies?.[CSRF_COOKIE]) {
		setCsrfCookie(res)
	}

	// проверяем только мутационные запросы к /auth*
	const needsCheck =
		['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) &&
		req.path.startsWith('/auth') &&
		!req.path.startsWith('/auth/telegram') &&
		req.path !== '/auth/csrf'

	if (!needsCheck) return next()

	const header = req.get('x-csrf-token')
	const cookie = req.cookies?.[CSRF_COOKIE]
	if (!header || !cookie || header !== cookie) {
		return res.status(403).json({ message: 'Invalid CSRF token' })
	}
	next()
}
