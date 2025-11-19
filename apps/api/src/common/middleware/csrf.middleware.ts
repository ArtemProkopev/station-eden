import { NextFunction, Request, Response } from 'express'
import crypto from 'node:crypto'

const CSRF_COOKIE = (process.env.CSRF_COOKIE_NAME || 'se_csrf').trim()
const CSRF_DOMAIN = process.env.CSRF_COOKIE_DOMAIN || '.stationeden.ru'

export function ensureCsrfCookie(req: Request, res: Response): string {
	let token = (req as any).cookies?.[CSRF_COOKIE] as string | undefined
	if (!token) {
		token = crypto.randomBytes(24).toString('hex')

		// Используем any для поддержки partitioned
		const opts: any = {
			httpOnly: false,
			// 'none' + secure + partitioned = работает везде
			sameSite: 'none',
			secure: true,
			path: '/',
			domain: CSRF_DOMAIN,
			partitioned: true,
		}

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
