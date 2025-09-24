import {
	Body,
	Controller,
	Get,
	InternalServerErrorException,
	NotFoundException,
	Post,
	Req,
	Res,
	UnauthorizedException,
	UseGuards,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import { randomBytes } from 'crypto'
import type { Request, Response } from 'express'
import { OAuth2Client } from 'google-auth-library'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { ensureCsrfCookie } from '../common/middleware/csrf.middleware'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'

type GoogleMode = 'login' | 'register'

@Controller('auth')
export class AuthController {
	constructor(
		private auth: AuthService,
		private jwt: JwtService
	) {}

	private cookieOpts() {
		const secure = process.env.COOKIE_SECURE === 'true'
		return { httpOnly: true, sameSite: 'lax' as const, secure, path: '/' }
	}
	private preauthCookieOpts() {
		const secure = process.env.COOKIE_SECURE === 'true'
		return {
			httpOnly: true,
			sameSite: 'lax' as const,
			secure,
			path: '/',
			maxAge: 10 * 60 * 1000,
		}
	}

	private googleEnabled() {
		return process.env.ENABLE_GOOGLE_LOGIN === 'true'
	}
	private googleClient() {
		return new OAuth2Client(process.env.GOOGLE_CLIENT_ID!)
	}
	private makeState(len = 24) {
		return randomBytes(len).toString('hex')
	}
	private setStateCookie(res: Response, raw: string) {
		res.cookie('google_oauth_state', raw, {
			...this.cookieOpts(),
			maxAge: 10 * 60 * 1000,
		})
	}
	private clearStateCookie(res: Response) {
		res.clearCookie('google_oauth_state', this.cookieOpts())
	}

	private webOrigin(): string {
		const after =
			process.env.WEB_AFTER_LOGIN_URL || 'http://localhost:3000/profile'
		try {
			return new URL(after).origin
		} catch {
			return 'http://localhost:3000'
		}
	}
	private urlTo(path: string) {
		return this.webOrigin() + path
	}

	/** Гарантирует наличие CSRF-куки и возвращает сам токен в ответе */
	@Get('csrf')
	csrf(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
		const token = ensureCsrfCookie(req, res)
		return { csrf: token }
	}

	// ===== Регистрация/логин (через шаг MFA) =====

	@UseGuards(ThrottlerGuard)
	@Throttle({ default: { limit: 50, ttl: 300000 } }) // на период тестов поднят до 50, нужно потом опустить до 5
	@Post('login')
	async login(
		@Body() dto: LoginDto,
		@Res({ passthrough: true }) res: Response
	) {
		const { user } = await this.auth.login(
			dto.email.toLowerCase(),
			dto.password
		)
		const pre = this.auth.signPreauth(user.id, user.email)
		res.cookie('preauth', pre, this.preauthCookieOpts())

		try {
			await this.auth.startEmailMfa(user.id, user.email)
		} catch (e) {
			console.error('[login] startEmailMfa failed', e)
			// Не валим 500 — код можно дослать с verify
		}

		return { mfa: 'email_code_sent', email: user.email }
	}

	@Post('register')
	async register(
		@Body() dto: RegisterDto,
		@Res({ passthrough: true }) res: Response
	) {
		const { user } = await this.auth.register(
			dto.email.toLowerCase(),
			dto.password
		)
		const pre = this.auth.signPreauth(user.id, user.email)
		res.cookie('preauth', pre, this.preauthCookieOpts())

		try {
			await this.auth.startEmailMfa(user.id, user.email)
		} catch (e) {
			console.error('[register] startEmailMfa failed', e)
			// НЕ роняем регистрацию — дальше пользователь сможет переслать код с verify
		}

		return { mfa: 'email_code_sent', email: user.email }
	}

	@Post('refresh')
	async refresh(
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response
	) {
		const payload = tryDecode(this.jwt, (req as any).cookies?.access_token)
		const userId = (payload as any)?.sub || (req.body as any)?.userId
		const rt = (req as any).cookies?.refresh_token
		if (!userId || !rt) throw new UnauthorizedException('No refresh')

		const { access, refreshToken, refreshExpires } = await this.auth.refresh(
			userId,
			rt
		)
		res.cookie('access_token', access, {
			...this.cookieOpts(),
			maxAge: 15 * 60 * 1000,
		})
		res.cookie('refresh_token', refreshToken, {
			...this.cookieOpts(),
			maxAge: refreshExpires.getTime() - Date.now(),
		})
		return { refreshed: true }
	}

	@Post('logout')
	async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
		const payload = tryDecode(this.jwt, (req as any).cookies?.access_token)
		const userId = (payload as any)?.sub
		const rt = (req as any).cookies?.refresh_token
		if (userId) await this.auth.logout(userId, rt)
		res.clearCookie('access_token', this.cookieOpts())
		res.clearCookie('refresh_token', this.cookieOpts())
		res.clearCookie('preauth', this.preauthCookieOpts())
		return { ok: true }
	}

	@UseGuards(JwtAuthGuard)
	@Get('me')
	me(@Req() req: Request & { user?: any }) {
		return { userId: (req.user as any).sub, email: (req.user as any).email }
	}

	// ===== Подтверждение e-mail кодом =====

	@UseGuards(ThrottlerGuard)
	@Throttle({ default: { limit: 10, ttl: 300000 } })
	@Post('verify-email-code')
	async verifyEmailCode(
		@Body() body: { code: string; email?: string },
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response
	) {
		const pre = (req as any).cookies?.preauth
		if (!pre) throw new UnauthorizedException('No preauth')

		let payload: any
		try {
			payload = this.jwt.verify(pre, { secret: process.env.JWT_ACCESS_SECRET })
		} catch {
			throw new UnauthorizedException('Preauth expired')
		}

		const email = body.email?.toLowerCase() || payload.email
		if (!email || email !== payload.email)
			throw new UnauthorizedException('Email mismatch')

		const { user, access, refreshToken, refreshExpires } =
			await this.auth.verifyEmailCode(payload.sub, email, body.code)

		res.cookie('access_token', access, {
			...this.cookieOpts(),
			maxAge: 15 * 60 * 1000,
		})
		res.cookie('refresh_token', refreshToken, {
			...this.cookieOpts(),
			maxAge: refreshExpires.getTime() - Date.now(),
		})
		res.clearCookie('preauth', this.preauthCookieOpts())

		return { user }
	}

	@UseGuards(ThrottlerGuard)
	@Throttle({ default: { limit: 6, ttl: 300000 } })
	@Post('resend-email-code')
	async resendEmailCode(@Req() req: Request) {
		const pre = (req as any).cookies?.preauth
		if (!pre) throw new UnauthorizedException('No preauth')

		let payload: any
		try {
			payload = this.jwt.verify(pre, { secret: process.env.JWT_ACCESS_SECRET })
		} catch {
			throw new UnauthorizedException('Preauth expired')
		}

		try {
			await this.auth.startEmailMfa(payload.sub, payload.email)
			return { ok: true }
		} catch (e) {
			console.error('[resend] startEmailMfa failed', e)
			throw new InternalServerErrorException('Failed to resend email')
		}
	}

	// ---------- Google OAuth (через MFA) ----------

	@Get('google')
	async google(@Req() req: Request, @Res() res: Response) {
		if (!this.googleEnabled())
			throw new NotFoundException('Google login disabled')

		const q = req.query as any
		const mode: GoogleMode = q?.mode === 'register' ? 'register' : 'login'

		const nonce = this.makeState()
		const packed = `${nonce}:${mode}`
		this.setStateCookie(res, packed)

		const params = new URLSearchParams({
			client_id: process.env.GOOGLE_CLIENT_ID!,
			redirect_uri: process.env.GOOGLE_REDIRECT_URL!,
			response_type: 'code',
			scope: 'openid email profile',
			access_type: 'offline',
			include_granted_scopes: 'true',
			state: packed,
			prompt: 'consent',
		})

		res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
		return
	}

	@Get('google/callback')
	async googleCallback(@Req() req: Request, @Res() res: Response) {
		if (!this.googleEnabled()) {
			res.status(404).send('Google login disabled')
			return
		}

		const { code, state } = req.query as { code?: string; state?: string }
		const stateCookie = (req as any).cookies?.google_oauth_state as
			| string
			| undefined
		if (!code || !state || !stateCookie || state !== stateCookie) {
			this.clearStateCookie(res)
			res.status(400).send('Invalid OAuth state/code')
			return
		}
		this.clearStateCookie(res)
		const [, modeRaw] = String(state).split(':')
		const mode: GoogleMode = modeRaw === 'register' ? 'register' : 'login'

		// Обмен кода на токены
		const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				code,
				client_id: process.env.GOOGLE_CLIENT_ID!,
				client_secret: process.env.GOOGLE_CLIENT_SECRET!,
				redirect_uri: process.env.GOOGLE_REDIRECT_URL!,
				grant_type: 'authorization_code',
			}),
		})
		if (!tokenResp.ok) {
			const txt = await tokenResp.text()
			res.status(401).send(`Token exchange failed: ${txt}`)
			return
		}
		const { id_token } = (await tokenResp.json()) as any
		if (!id_token) {
			res.status(401).send('No id_token')
			return
		}

		// Верификация id_token
		const ticket = await this.googleClient().verifyIdToken({
			idToken: id_token,
			audience: process.env.GOOGLE_CLIENT_ID!,
		})
		const payload = ticket.getPayload()
		const email = payload?.email?.toLowerCase()
		const emailVerified = payload?.email_verified
		if (!email || !emailVerified) {
			res.status(401).send('Google email not verified')
			return
		}

		// Логика login/register
		let user = await this.auth['users'].findByEmail(email)
		if (mode === 'login') {
			if (!user) {
				res.redirect(this.urlTo('/login?reason=google_no_account'))
				return
			}
		} else {
			if (user) {
				res.redirect(this.urlTo('/login?reason=google_exists'))
				return
			}
			user = await this.auth['users'].create({ email, passwordHash: 'google' })
		}

		await this.auth['users'].ensureAdminRoleFor(email)

		// preauth + (пытаемся отправить письмо) + всегда редиректим на verify
		const pre = this.auth.signPreauth(user!.id, user!.email)
		res.cookie('preauth', pre, this.preauthCookieOpts())

		try {
			await this.auth.startEmailMfa(user!.id, user!.email)
		} catch (e) {
			console.error('[google] startEmailMfa failed', e)
			// не прерываем — на verify доступна повторная отправка
		}

		const verifyUrl = this.urlTo(
			`/login/verify?email=${encodeURIComponent(user!.email)}`
		)
		res.redirect(verifyUrl)
		return
	}

	// --- Debug ---
	@Get('google/debug-env')
	debugGoogleEnv() {
		return {
			ENABLE_GOOGLE_LOGIN: process.env.ENABLE_GOOGLE_LOGIN,
			GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
			GOOGLE_REDIRECT_URL: process.env.GOOGLE_REDIRECT_URL,
		}
	}

	@Get('google/debug-url')
	debugGoogleUrl() {
		const params = new URLSearchParams({
			client_id: process.env.GOOGLE_CLIENT_ID!,
			redirect_uri: process.env.GOOGLE_REDIRECT_URL!,
			response_type: 'code',
			scope: 'openid email profile',
			access_type: 'offline',
			include_granted_scopes: 'true',
			state: 'debug:login',
			prompt: 'consent',
		})
		return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` }
	}
}

function tryDecode(jwt: JwtService, token?: string) {
	try {
		if (!token) return null
		return jwt.verify(token, { secret: process.env.JWT_ACCESS_SECRET })
	} catch {
		return null
	}
}
