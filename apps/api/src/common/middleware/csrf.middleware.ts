<<<<<<< HEAD
import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';

const CSRF_COOKIE = process.env.CSRF_COOKIE_NAME || 'csrf_token';

export function CsrfMiddleware(req: Request, res: Response, next: NextFunction) {
  // Генерация токена если нет (синхронизируем с фронтендом)
  if (!req.cookies[CSRF_COOKIE]) {
    const token = crypto.randomBytes(24).toString('hex');
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false, // Должно быть false чтобы фронтенд мог прочитать
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === 'true',
      path: '/'
    });
    // Сохраняем токен в request для consistency
    (req as any).csrfToken = token;
  } else {
    (req as any).csrfToken = req.cookies[CSRF_COOKIE];
  }

  // Проверка нужна только для защищенных методов и путей
  const needsCheck = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) &&
    req.path.startsWith('/auth') &&
    !req.path.startsWith('/auth/telegram') &&
    req.path !== '/auth/csrf';

  if (!needsCheck) return next();

  // Получаем токен из заголовка (именно так настроен ваш фронтенд)
  const headerToken = req.get('x-csrf-token');
  const cookieToken = req.cookies[CSRF_COOKIE];

  // Дебаг логи (можно убрать после фикса)
  console.log('CSRF Check:', {
    path: req.path,
    method: req.method,
    headerToken,
    cookieToken,
    headers: req.headers
  });

  if (!headerToken || !cookieToken) {
    console.log('CSRF Error: Missing token', { headerToken, cookieToken });
    return res.status(403).json({ message: 'CSRF token missing' });
  }

  if (headerToken !== cookieToken) {
    console.log('CSRF Error: Token mismatch', { headerToken, cookieToken });
    return res.status(403).json({ message: 'Invalid CSRF token' });
  }

  console.log('CSRF Check passed');
  next();
=======
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
>>>>>>> fded2967ddd8b67441304e7541be708337716d97
}
