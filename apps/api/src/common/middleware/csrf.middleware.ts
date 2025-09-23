import { NextFunction, Request, Response } from 'express'
import crypto from 'node:crypto'

const CSRF_COOKIE = (process.env.CSRF_COOKIE_NAME || 'se_csrf').trim()
const CSRF_DOMAIN = (process.env.CSRF_COOKIE_DOMAIN || '').trim() || undefined // напр. ".stationeden.ru"

export function CsrfMiddleware(
	req: Request,
	res: Response,
	next: NextFunction
) {
	// если куки нет — выдаём новую
	if (!req.cookies[CSRF_COOKIE]) {
		const token = crypto.randomBytes(24).toString('hex')
		res.cookie(CSRF_COOKIE, token, {
			httpOnly: false, // читаем из JS
			sameSite: 'lax',
			secure: process.env.COOKIE_SECURE === 'true',
			path: '/',
			...(CSRF_DOMAIN ? { domain: CSRF_DOMAIN } : {}),
		})
	}

	// проверяем только мутационные запросы к /auth*
	const needsCheck =
		['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) &&
		req.path.startsWith('/auth') &&
		!req.path.startsWith('/auth/telegram') &&
		req.path !== '/auth/csrf'

	if (!needsCheck) return next()

	const header = req.get('x-csrf-token')
	const cookie = req.cookies[CSRF_COOKIE]
	if (!header || !cookie || header !== cookie) {
		return res.status(403).json({ message: 'Invalid CSRF token' })
	}
	next()
}
