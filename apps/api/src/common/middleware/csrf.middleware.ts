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
}
