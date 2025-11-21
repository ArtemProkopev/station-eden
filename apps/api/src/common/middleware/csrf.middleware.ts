import { NextFunction, Request, Response } from 'express'
import crypto from 'node:crypto'

const CSRF_COOKIE = (process.env.CSRF_COOKIE_NAME || 'se_csrf').trim()
const rawCsrfDomain = process.env.CSRF_COOKIE_DOMAIN
const CSRF_DOMAIN =
	typeof rawCsrfDomain === 'string' && rawCsrfDomain.length > 0
		? rawCsrfDomain
		: undefined

const COOKIE_SECURE = (process.env.COOKIE_SECURE || '').toLowerCase() === 'true'

export function ensureCsrfCookie(req: Request, res: Response): string {
	let token = (req as any).cookies?.[CSRF_COOKIE] as string | undefined
	if (!token) {
		token = crypto.randomBytes(24).toString('hex')

		const opts: any = {
			httpOnly: false,
			sameSite: COOKIE_SECURE ? 'none' : 'lax',
			secure: COOKIE_SECURE,
			path: '/',
		}

		if (CSRF_DOMAIN) opts.domain = CSRF_DOMAIN
		if (COOKIE_SECURE) opts.partitioned = true

		res.cookie(CSRF_COOKIE, token, opts)
	}
	return token
}

export function CsrfMiddleware(
	req: Request,
	res: Response,
	next: NextFunction
) {
	ensureCsrfCookie(req, res)

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
