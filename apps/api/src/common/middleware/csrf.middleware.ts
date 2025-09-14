import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
const CSRF_COOKIE = process.env.CSRF_COOKIE_NAME || 'csrf_token';

export function CsrfMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.cookies[CSRF_COOKIE]) {
    const token = crypto.randomBytes(24).toString('hex');
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === 'true',
      path: '/'
    });
  }
  const needsCheck = ['POST','PUT','PATCH','DELETE'].includes(req.method)
    && req.path.startsWith('/auth')
    && !req.path.startsWith('/auth/telegram')
    && req.path !== '/auth/csrf';
  if (!needsCheck) return next();

  const header = req.get('x-csrf-token');
  const cookie = req.cookies[CSRF_COOKIE];
  if (!header || !cookie || header !== cookie) {
    return res.status(403).json({ message: 'Invalid CSRF token' });
  }
  next();
}
