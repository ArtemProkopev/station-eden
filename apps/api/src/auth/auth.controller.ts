import {
	BadRequestException,
	Body,
	Controller,
	Get,
	HttpException,
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
import { ensureCsrfCookie, getCookieOptions } from '../common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface'
import { AuthService } from './auth.service'
import { BruteForceService } from './brute-force.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'

type OAuthMode = 'login' | 'register' | 'link'

function parseDurationMs(raw: string | undefined, fallbackMs: number) {
	const s = (raw || '').trim()
	const m = s.match(/^(\d+)([mhd])$/i)
	if (!m) return fallbackMs
	const n = Number(m[1])
	const u = m[2].toLowerCase()
	if (u === 'm') return n * 60_000
	if (u === 'h') return n * 3_600_000
	if (u === 'd') return n * 86_400_000
	return fallbackMs
}

@Controller('auth')
export class AuthController {
	private readonly isProd = process.env.NODE_ENV === 'production'

	constructor(
		private auth: AuthService,
		private jwt: JwtService,
		private brute: BruteForceService,
	) {}

	private authCookieOpts() {
		return getCookieOptions(true)
	}

	private preauthCookieOpts() {
		return { ...getCookieOptions(true), maxAge: 10 * 60 * 1000 }
	}

	private oauthCookieOpts() {
		const isProd = process.env.NODE_ENV === 'production'
		const authDomain =
			process.env.AUTH_COOKIE_DOMAIN ||
			process.env.COOKIE_DOMAIN ||
			'.stationeden.ru'

		const base: any = {
			httpOnly: true,
			sameSite: 'lax' as const,
			path: '/',
			maxAge: 10 * 60 * 1000,
		}

		if (isProd) {
			base.secure = true
			base.domain = authDomain
		} else {
			// DEV: localhost + разные порты — домен НЕ ставим вообще
			base.secure = false
			// base.domain = undefined
		}

		return base
	}

	private clearWithSameAttrs(
		res: Response,
		name: string,
		opts: Record<string, any>,
	) {
		const { maxAge, expires, ...rest } = opts || {}
		res.clearCookie(name, rest)
	}

	private accessMaxAgeMs() {
		return parseDurationMs(process.env.JWT_ACCESS_EXPIRES, 15 * 60 * 1000)
	}

	private googleEnabled() {
		return process.env.ENABLE_GOOGLE_LOGIN === 'true'
	}

	private yandexEnabled() {
		return process.env.ENABLE_YANDEX_LOGIN === 'true'
	}

	private makeState(len = 24) {
		return randomBytes(len).toString('hex')
	}

	/**
	 * ✅ FIX: безопасно считаем maxAge для refresh куки
	 * refreshExpires может прилететь как Date | string | number
	 */
	private msUntil(expires: any): number {
		try {
			if (!expires) return 0
			if (expires instanceof Date) return expires.getTime() - Date.now()
			if (typeof expires === 'number') return expires - Date.now()
			const t = new Date(String(expires)).getTime()
			if (!Number.isFinite(t)) return 0
			return t - Date.now()
		} catch {
			return 0
		}
	}

	// ---------- provider state cookies ----------
	private setGoogleStateCookie(res: Response, raw: string) {
		res.cookie('google_oauth_state', raw, this.oauthCookieOpts())
	}

	private clearGoogleStateCookie(res: Response) {
		this.clearWithSameAttrs(res, 'google_oauth_state', this.oauthCookieOpts())
	}

	private setYandexStateCookie(res: Response, raw: string) {
		res.cookie('yandex_oauth_state', raw, this.oauthCookieOpts())
	}

	private clearYandexStateCookie(res: Response) {
		this.clearWithSameAttrs(res, 'yandex_oauth_state', this.oauthCookieOpts())
	}
	// -----------------------------------------

	// ---------- NEXT cookie for OAuth ----------
	private oauthNextCookieOpts() {
		return this.oauthCookieOpts()
	}

	private sanitizeNext(raw: any): string {
		const s = String(raw || '').trim()
		if (!s) return '/profile'
		if (!s.startsWith('/')) return '/profile'
		if (s.startsWith('//')) return '/profile'
		return s
	}

	private setNextCookie(res: Response, next: string) {
		res.cookie('oauth_next', next, this.oauthNextCookieOpts())
	}

	private readNextCookie(req: Request): string | undefined {
		return ((req as any).cookies?.oauth_next as string | undefined) || undefined
	}

	private clearNextCookie(res: Response) {
		this.clearWithSameAttrs(res, 'oauth_next', this.oauthNextCookieOpts())
	}
	// -----------------------------------------

	private webOrigin(): string {
		const after =
			process.env.WEB_AFTER_LOGIN_URL || 'https://stationeden.ru/profile'
		try {
			return new URL(after).origin
		} catch {
			return 'https://stationeden.ru'
		}
	}

	private urlTo(path: string) {
		return this.webOrigin() + path
	}

	private async sendMfaOrThrow(fn: () => Promise<any>, context: string) {
		try {
			await fn()
		} catch (e) {
			console.error(`[auth] ${context} failed`, e)
			if (this.isProd) {
				throw new InternalServerErrorException(
					'Failed to send verification email',
				)
			}
		}
	}

	@Get('csrf')
	csrf(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
		const token = ensureCsrfCookie(req, res)
		return { csrf: token }
	}

	@UseGuards(ThrottlerGuard)
	@Throttle({ default: { limit: 50, ttl: 300000 } })
	@Post('login')
	async login(
		@Body() dto: LoginDto,
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response,
	) {
		const login = dto.login.trim().toLowerCase()
		const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login)

		const block = await this.brute.isBlocked(login)
		if (block.blocked) {
			throw new UnauthorizedException({
				message: `Account temporarily locked.`,
				minutesLeft: block.minutesLeft,
				lockedUntil: block.lockedUntil?.toISOString?.() ?? undefined,
			})
		}

		if (isEmail) {
			const existing = await this.auth['users'].findByEmailWithHash(login)
			if (existing && !existing.passwordHash) {
				const pre = this.auth.signPreauth(existing.id, existing.email)
				res.cookie('preauth', pre, this.preauthCookieOpts())

				await this.sendMfaOrThrow(
					() => this.auth.startEmailMfa(existing.id, existing.email),
					'startEmailMfa(oauth-only-email)',
				)

				return {
					mfa: 'email_code_sent',
					email: existing.email,
					needSetPassword: true,
				}
			}
		} else {
			const byUsername = await this.auth['users'].findByUsernameWithHash(login)
			if (byUsername && !byUsername.passwordHash) {
				const pre = this.auth.signPreauth(byUsername.id, byUsername.email)
				res.cookie('preauth', pre, this.preauthCookieOpts())

				await this.sendMfaOrThrow(
					() => this.auth.startEmailMfa(byUsername.id, byUsername.email),
					'startEmailMfa(oauth-only-username)',
				)

				return {
					mfa: 'email_code_sent',
					email: byUsername.email,
					needSetPassword: true,
				}
			}
		}

		try {
			const result = await this.auth.login(login, dto.password)
			await this.brute.registerSuccess(login)

			const pre = this.auth.signPreauth(result.user.id, result.user.email)
			res.cookie('preauth', pre, this.preauthCookieOpts())

			await this.sendMfaOrThrow(
				() => this.auth.startEmailMfa(result.user.id, result.user.email),
				'startEmailMfa(login)',
			)

			return { mfa: 'email_code_sent', email: result.user.email }
		} catch {
			const info = await this.brute.registerFail(login)
			if (info.blocked) {
				throw new UnauthorizedException({
					message: 'Too many attempts.',
					minutesLeft: info.minutesLeft,
					lockedUntil: info.lockedUntil?.toISOString?.() ?? undefined,
					attemptsLeft: 0,
				})
			}
			throw new UnauthorizedException({
				message: 'Invalid credentials.',
				attemptsLeft: info.attemptsLeft,
			})
		}
	}

	@Post('register')
	async register(
		@Body() dto: RegisterDto,
		@Res({ passthrough: true }) res: Response,
	) {
		const result = await this.auth.register(
			dto.email.toLowerCase(),
			dto.username,
			dto.password,
		)
		const pre = this.auth.signPreauth(result.user.id, result.user.email)
		res.cookie('preauth', pre, this.preauthCookieOpts())

		await this.sendMfaOrThrow(
			() => this.auth.startEmailMfa(result.user.id, result.user.email),
			'startEmailMfa(register)',
		)

		return { mfa: 'email_code_sent', email: result.user.email }
	}

	@UseGuards(ThrottlerGuard)
	@Throttle({ default: { limit: 10, ttl: 300000 } })
	@Post('forgot-password')
	async forgotPassword(
		@Body() body: { email: string },
		@Res({ passthrough: true }) res: Response,
	) {
		const raw = (body.email || '').trim().toLowerCase()
		if (!raw) {
			throw new BadRequestException('Email is required')
		}

		const user = await this.auth['users'].findByEmail(raw)

		if (user) {
			const pre = this.auth.signPreauth(user.id, user.email)
			res.cookie('preauth', pre, this.preauthCookieOpts())

			await this.sendMfaOrThrow(
				() => this.auth.startPasswordReset(user.id, user.email),
				'startPasswordReset',
			)

			return { mfa: 'email_code_sent', email: user.email }
		}

		return { mfa: 'email_code_sent', email: raw }
	}

	@Post('refresh')
	async refresh(
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response,
	) {
		const rt = (req as any).cookies?.refresh_token as string | undefined
		if (!rt) throw new UnauthorizedException('No refresh token')

		const rawAccess = (req as any).cookies?.access_token as string | undefined
		const decoded: any = rawAccess ? this.jwt.decode(rawAccess) : null
		const userId: string | undefined = decoded?.sub

		const { access, refreshToken, refreshExpires } = userId
			? await this.auth.refresh(userId, rt)
			: await this.auth.refreshViaTokenOnly(rt)

		res.cookie('access_token', access, {
			...this.authCookieOpts(),
			maxAge: this.accessMaxAgeMs(),
		})

		const refreshMaxAge = Math.max(0, this.msUntil(refreshExpires))

		res.cookie('refresh_token', refreshToken, {
			...this.authCookieOpts(),
			maxAge: refreshMaxAge,
		})

		return { refreshed: true }
	}

	@Post('logout')
	async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
		const payload = tryDecode(this.jwt, (req as any).cookies?.access_token)
		const userId = (payload as any)?.sub
		const rt = (req as any).cookies?.refresh_token
		if (userId) await this.auth.logout(userId, rt)

		const authOpts = this.authCookieOpts()
		const preauthOpts = this.preauthCookieOpts()

		this.clearWithSameAttrs(res, 'access_token', authOpts)
		this.clearWithSameAttrs(res, 'refresh_token', authOpts)
		this.clearWithSameAttrs(res, 'preauth', preauthOpts)

		res.clearCookie('access_token', { path: '/' })
		res.clearCookie('refresh_token', { path: '/' })
		res.clearCookie('preauth', { path: '/' })

		return { ok: true }
	}

	@Get('logout-get')
	async logoutGet(
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response,
	) {
		const payload = tryDecode(this.jwt, (req as any).cookies?.access_token)
		const userId = (payload as any)?.sub
		const rt = (req as any).cookies?.refresh_token
		if (userId) await this.auth.logout(userId, rt)

		const authOpts = this.authCookieOpts()
		const preauthOpts = this.preauthCookieOpts()

		this.clearWithSameAttrs(res, 'access_token', authOpts)
		this.clearWithSameAttrs(res, 'refresh_token', authOpts)
		this.clearWithSameAttrs(res, 'preauth', preauthOpts)

		res.clearCookie('access_token', { path: '/' })
		res.clearCookie('refresh_token', { path: '/' })
		res.clearCookie('preauth', { path: '/' })

		return { ok: true }
	}

	@Get('session')
	async session(@Req() req: Request) {
		const rawAccess = (req as any).cookies?.access_token as string | undefined

		if (!rawAccess) {
			return { status: 'signed-out', user: null }
		}

		try {
			const payload: any = this.jwt.verify(rawAccess, {
				secret: process.env.JWT_ACCESS_SECRET,
			})

			const userId: string | undefined = payload?.sub
			if (!userId) return { status: 'signed-out', user: null }

			const user = await this.auth['users'].findById(userId)
			if (!user) return { status: 'signed-out', user: null }

			return {
				status: 'signed-in',
				user: {
					userId: user.id,
					email: user.email,
					username: user.username,
					avatar: user.avatar,
					frame: user.frame,
				},
			}
		} catch {
			return { status: 'signed-out', user: null }
		}
	}

	@UseGuards(JwtAuthGuard)
	@Get('me')
	async me(@Req() req: AuthenticatedRequest) {
		if (!req.user) throw new UnauthorizedException('User not found in request')
		const user = await this.auth['users'].findByIdOrFail(req.user.sub)
		return {
			userId: user.id,
			email: user.email,
			username: user.username,
			avatar: user.avatar,
			frame: user.frame,
		}
	}

	@UseGuards(ThrottlerGuard)
	@Throttle({ default: { limit: 10, ttl: 300000 } })
	@Post('verify-email-code')
	async verifyEmailCode(
		@Body() body: { code: string; email?: string; newPassword?: string },
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response,
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

		try {
			const { user, access, refreshToken, refreshExpires } =
				await this.auth.verifyEmailCode(
					payload.sub,
					email,
					body.code,
					body.newPassword,
				)

			res.cookie('access_token', access, {
				...this.authCookieOpts(),
				maxAge: this.accessMaxAgeMs(),
			})

			const refreshMaxAge = Math.max(0, this.msUntil(refreshExpires))

			res.cookie('refresh_token', refreshToken, {
				...this.authCookieOpts(),
				maxAge: refreshMaxAge,
			})

			this.clearWithSameAttrs(res, 'preauth', this.preauthCookieOpts())
			return { user }
		} catch (e: any) {
			// Если сервис бросил HttpException — отдадим его как есть
			if (e instanceof HttpException) throw e

			console.error('[auth] verify-email-code failed', e)
			throw new InternalServerErrorException('Failed to verify email code')
		}
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
			console.error('[auth] resend-email-code failed', e)
			throw new InternalServerErrorException('Failed to resend email')
		}
	}

	// ====================== GOOGLE ======================

	@Get('google')
	async google(@Req() req: Request, @Res() res: Response) {
		if (!this.googleEnabled())
			throw new NotFoundException('Google login disabled')

		const q = (req.query as any) || {}
		const mode: OAuthMode = q?.mode === 'register' ? 'register' : 'login'

		const next = this.sanitizeNext(q?.next)
		this.setNextCookie(res, next)

		const nonce = this.makeState()
		const packed = `${nonce}:${mode}`
		this.setGoogleStateCookie(res, packed)

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
		if (!this.googleEnabled())
			throw new NotFoundException('Google login disabled')

		const { code, state } = req.query as { code?: string; state?: string }
		const stateCookie = (req as any).cookies?.google_oauth_state as
			| string
			| undefined

		if (!code || !state || !stateCookie || state !== stateCookie) {
			console.warn(
				`[OAuth Error] Mismatch. UrlState: ${state}, CookieState: ${stateCookie}`,
			)
			this.clearGoogleStateCookie(res)
			this.clearNextCookie(res)
			throw new BadRequestException(
				'Invalid OAuth state/code (Cookie mismatch)',
			)
		}

		this.clearGoogleStateCookie(res)

		try {
			if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
				throw new Error('Missing GOOGLE_CLIENT_ID/SECRET env vars')
			}

			const tokenParams = new URLSearchParams({
				code,
				client_id: process.env.GOOGLE_CLIENT_ID!,
				client_secret: process.env.GOOGLE_CLIENT_SECRET!,
				redirect_uri: process.env.GOOGLE_REDIRECT_URL!,
				grant_type: 'authorization_code',
			})

			const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: tokenParams,
			})

			if (!tokenResp.ok) {
				const txt = await tokenResp.text()
				throw new UnauthorizedException(`Google token exchange failed: ${txt}`)
			}

			const tokens = (await tokenResp.json()) as any
			const { access_token } = tokens

			if (!access_token) {
				throw new UnauthorizedException('No access_token in Google response')
			}

			const userResp = await fetch(
				'https://www.googleapis.com/oauth2/v3/userinfo',
				{
					headers: { Authorization: `Bearer ${access_token}` },
				},
			)

			if (!userResp.ok) {
				throw new UnauthorizedException('Failed to fetch Google user info')
			}

			const googleUser = (await userResp.json()) as any
			const email = googleUser.email?.toLowerCase()
			const emailVerified = googleUser.email_verified
			const sub = googleUser.sub

			if (!email || !emailVerified || !sub) {
				throw new UnauthorizedException(
					'Google email not verified or sub missing',
				)
			}

			const user = await this.auth.findOrCreateUserByGoogle(sub, email)
			await this.auth['users'].ensureAdminRoleFor(user.email)

			const pre = this.auth.signPreauth(user.id, user.email)
			res.cookie('preauth', pre, this.preauthCookieOpts())

			await this.sendMfaOrThrow(
				() => this.auth.startEmailMfa(user.id, user.email),
				'startEmailMfa(google-callback)',
			)

			const next = this.readNextCookie(req) || '/profile'
			this.clearNextCookie(res)

			const verifyUrl = this.urlTo(
				`/login/verify?email=${encodeURIComponent(
					user.email,
				)}&next=${encodeURIComponent(next)}`,
			)
			res.redirect(verifyUrl)
		} catch (error: any) {
			this.clearNextCookie(res)

			// ✅ не маскируем нормальные ошибки (401/400)
			if (error instanceof HttpException) throw error

			const msg = error?.message || JSON.stringify(error)
			console.error('[Google Callback Error]:', error)
			throw new InternalServerErrorException(`Google Auth Failed: ${msg}`)
		}
	}

	// ====================== YANDEX ======================

	@Get('yandex')
	async yandex(@Req() req: Request, @Res() res: Response) {
		if (!this.yandexEnabled())
			throw new NotFoundException('Yandex login disabled')

		const q = (req.query as any) || {}
		const mode: OAuthMode = q?.mode === 'register' ? 'register' : 'login'

		const next = this.sanitizeNext(q?.next)
		this.setNextCookie(res, next)

		const nonce = this.makeState()
		const packed = `${nonce}:${mode}`
		this.setYandexStateCookie(res, packed)

		const clientId = process.env.YANDEX_CLIENT_ID
		const redirectUri = process.env.YANDEX_REDIRECT_URL

		if (!clientId || !redirectUri) {
			throw new InternalServerErrorException(
				'Missing YANDEX_CLIENT_ID / YANDEX_REDIRECT_URL',
			)
		}

		const params = new URLSearchParams({
			response_type: 'code',
			client_id: clientId,
			redirect_uri: redirectUri,
			scope: 'login:info login:email',
			state: packed,
		})

		res.redirect(`https://oauth.yandex.com/authorize?${params}`)
		return
	}

	@Get('yandex/callback')
	async yandexCallback(@Req() req: Request, @Res() res: Response) {
		if (!this.yandexEnabled())
			throw new NotFoundException('Yandex login disabled')

		const { code, state } = req.query as { code?: string; state?: string }
		const stateCookie = (req as any).cookies?.yandex_oauth_state as
			| string
			| undefined

		if (!code || !state || !stateCookie || state !== stateCookie) {
			console.warn(
				`[OAuth Error] Yandex mismatch. UrlState: ${state}, CookieState: ${stateCookie}`,
			)
			this.clearYandexStateCookie(res)
			this.clearNextCookie(res)
			throw new BadRequestException(
				'Invalid OAuth state/code (Cookie mismatch)',
			)
		}

		this.clearYandexStateCookie(res)

		try {
			const clientId = process.env.YANDEX_CLIENT_ID
			const clientSecret = process.env.YANDEX_CLIENT_SECRET
			const redirectUri = process.env.YANDEX_REDIRECT_URL

			if (!clientId || !clientSecret || !redirectUri) {
				throw new Error('Missing YANDEX_CLIENT_ID/SECRET/REDIRECT_URL env vars')
			}

			const tokenParams = new URLSearchParams({
				grant_type: 'authorization_code',
				code,
				client_id: clientId,
				client_secret: clientSecret,
				redirect_uri: redirectUri,
			})

			const tokenResp = await fetch('https://oauth.yandex.com/token', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: tokenParams,
			})

			if (!tokenResp.ok) {
				const txt = await tokenResp.text()
				throw new UnauthorizedException(`Yandex token exchange failed: ${txt}`)
			}

			const tokens = (await tokenResp.json()) as any
			const accessToken = tokens?.access_token
			if (!accessToken) {
				throw new UnauthorizedException('No access_token in Yandex response')
			}

			const infoResp = await fetch('https://login.yandex.ru/info?format=json', {
				headers: { Authorization: `OAuth ${accessToken}` },
			})

			if (!infoResp.ok) {
				const txt = await infoResp.text().catch(() => '')
				throw new UnauthorizedException(
					`Failed to fetch Yandex user info: ${txt}`,
				)
			}

			const yaUser = (await infoResp.json()) as any

			const yandexId = String(yaUser?.id || '').trim()
			const email = String(
				yaUser?.default_email ||
					(Array.isArray(yaUser?.emails) ? yaUser.emails[0] : '') ||
					'',
			)
				.toLowerCase()
				.trim()

			if (!yandexId || !email) {
				throw new UnauthorizedException(
					'Yandex user id/email missing (check scopes: login:email)',
				)
			}

			const user = await this.auth.findOrCreateUserByYandex(yandexId, email)
			await this.auth['users'].ensureAdminRoleFor(user.email)

			const pre = this.auth.signPreauth(user.id, user.email)
			res.cookie('preauth', pre, this.preauthCookieOpts())

			await this.sendMfaOrThrow(
				() => this.auth.startEmailMfa(user.id, user.email),
				'startEmailMfa(yandex-callback)',
			)

			const next = this.readNextCookie(req) || '/profile'
			this.clearNextCookie(res)

			const verifyUrl = this.urlTo(
				`/login/verify?email=${encodeURIComponent(
					user.email,
				)}&next=${encodeURIComponent(next)}`,
			)
			res.redirect(verifyUrl)
		} catch (error: any) {
			this.clearNextCookie(res)

			// ✅ не маскируем нормальные ошибки (401/400)
			if (error instanceof HttpException) throw error

			const msg = error?.message || JSON.stringify(error)
			console.error('[Yandex Callback Error]:', error)
			throw new InternalServerErrorException(`Yandex Auth Failed: ${msg}`)
		}
	}

	@Get('dev/peek-email-code')
	devPeek(@Req() req: Request) {
		if (process.env.NODE_ENV === 'production')
			return { ok: false, reason: 'not-available-in-production' }
		const required = (process.env.DEV_EMAIL_PEEK_SECRET || '').trim()
		const provided = (req.get('x-dev-secret') || '').trim()
		if (required && provided !== required)
			return { ok: false, reason: 'forbidden' }
		const email = String((req.query as any)?.email || '')
			.toLowerCase()
			.trim()
		if (!email) return { ok: false, reason: 'email-is-required' }
		const rec = this.auth['emailer'].getLastDevCode?.(email)
		return rec
			? { ok: true, email, code: rec.code, at: rec.ts }
			: { ok: false, reason: 'no-code' }
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
