// apps/api/src/common/middleware/csrf.middleware.ts
import { NextFunction, Request, Response } from 'express'
import crypto from 'node:crypto'

const CSRF_COOKIE = (process.env.CSRF_COOKIE_NAME || 'se_csrf').trim()

const rawCsrfDomain = process.env.CSRF_COOKIE_DOMAIN
const CSRF_DOMAIN =
	typeof rawCsrfDomain === 'string' && rawCsrfDomain.trim().length > 0
		? rawCsrfDomain.trim()
		: undefined

const NODE_ENV = process.env.NODE_ENV || 'development'
const COOKIE_SECURE =
	(process.env.COOKIE_SECURE || '').toLowerCase() === 'true' ||
	NODE_ENV === 'production'

// SameSite для CSRF тоже LAX — для твоей схемы /api на том же домене это идеально.
const COOKIE_SAMESITE =
	((process.env.COOKIE_SAMESITE || 'lax').toLowerCase() as
		| 'lax'
		| 'strict'
		| 'none') || 'lax'

export function ensureCsrfCookie(req: Request, res: Response): string {
	let token = (req as any).cookies?.[CSRF_COOKIE] as string | undefined
	if (!token) {
		token = crypto.randomBytes(24).toString('hex')

		const opts: any = {
			httpOnly: false,
			sameSite: COOKIE_SAMESITE,
			secure: COOKIE_SECURE,
			path: '/',
		}

		if (CSRF_DOMAIN) opts.domain = CSRF_DOMAIN

		// ВАЖНО: убрали Partitioned — он часто ломает поведение между браузерами.
		// opts.partitioned = true

		res.cookie(CSRF_COOKIE, token, opts)
	}
	return token
}

export function CsrfMiddleware(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	ensureCsrfCookie(req, res)

	const needsCheck =
		['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) &&
		req.path.startsWith('/auth') &&
		req.path !== '/auth/csrf'

	if (!needsCheck) return next()

	const header = req.get('x-csrf-token')
	const cookie = (req as any).cookies?.[CSRF_COOKIE] as string | undefined
	if (!header || !cookie || header !== cookie) {
		return res.status(403).json({ message: 'Invalid CSRF token' })
	}
	next()
}
