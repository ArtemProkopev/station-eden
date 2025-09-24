import { NextFunction, Request, Response } from 'express'
import crypto from 'node:crypto'

const CSRF_COOKIE = (process.env.CSRF_COOKIE_NAME || 'se_csrf').trim()
const RAW_DOMAIN = (process.env.CSRF_COOKIE_DOMAIN || '').trim()
const CSRF_DOMAIN = RAW_DOMAIN ? RAW_DOMAIN : undefined // напр. ".stationeden.ru"

/**
 * Унифицированная функция: гарантирует наличие CSRF-куки, возвращает её значение.
 * Можно вызывать из контроллеров (например, /auth/csrf).
 */
export function ensureCsrfCookie(req: Request, res: Response): string {
	let token = (req as any).cookies?.[CSRF_COOKIE] as string | undefined
	if (!token) {
		token = crypto.randomBytes(24).toString('hex')
		res.cookie(CSRF_COOKIE, token, {
			httpOnly: false, // читаемо из JS
			sameSite: 'lax',
			secure: process.env.COOKIE_SECURE === 'true',
			path: '/',
			...(CSRF_DOMAIN ? { domain: CSRF_DOMAIN } : {}),
		})
	}
	return token
}

/**
 * Middleware: создаёт CSRF-куку, если её нет, и проверяет mutating-запросы к /auth*.
 */
export function CsrfMiddleware(
	req: Request,
	res: Response,
	next: NextFunction
) {
	// всегда убеждаемся, что кука существует (безопасно и идемпотентно)
	ensureCsrfCookie(req, res)

	// проверяем только мутационные запросы к /auth* (кроме /auth/csrf и /auth/telegram*)
	const needsCheck =
		['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) &&
		req.path.startsWith('/auth') &&
		!req.path.startsWith('/auth/telegram') &&
		req.path !== '/auth/csrf'

	if (!needsCheck) return next()

	const header = req.get('x-csrf-token')
	const cookie = (req as any).cookies?.[CSRF_COOKIE] as string | undefined
	if (!header || !cookie || header !== cookie) {
		return res.status(403).json({ message: 'Invalid CSRF token' })
	}
	next()
}
