import {
	BadRequestException,
	Body,
	Controller,
	Get,
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
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'

@Controller('auth')
export class AuthController {
	constructor(private auth: AuthService, private jwt: JwtService) {}

	private cookieOpts() {
		const secure = process.env.COOKIE_SECURE === 'true'
		return { httpOnly: true, sameSite: 'lax' as const, secure, path: '/' }
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
	private setStateCookie(res: Response, state: string) {
		res.cookie('google_oauth_state', state, {
			...this.cookieOpts(),
			maxAge: 10 * 60 * 1000,
		})
	}

	@Get('csrf')
	csrf() {
		return { csrf: true }
	}

	@Post('register')
	async register(@Body() dto: RegisterDto) {
		return this.auth.register(dto.email.toLowerCase(), dto.password)
	}

	@UseGuards(ThrottlerGuard)
	@Throttle({ default: { limit: 5, ttl: 300000 } })
	@Post('login')
	async login(
		@Body() dto: LoginDto,
		@Res({ passthrough: true }) res: Response
	) {
		const { access, refreshToken, refreshExpires, user } =
			await this.auth.login(dto.email.toLowerCase(), dto.password)

		res.cookie('access_token', access, {
			...this.cookieOpts(),
			maxAge: 15 * 60 * 1000,
		})
		res.cookie('refresh_token', refreshToken, {
			...this.cookieOpts(),
			maxAge: refreshExpires.getTime() - Date.now(),
		})
		return { user }
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
		return { ok: true }
	}

	@UseGuards(JwtAuthGuard)
	@Get('me')
	me(@Req() req: Request & { user?: any }) {
		return { userId: (req.user as any).sub, email: (req.user as any).email }
	}

	// ---------- Google OAuth ----------

	@Get('google')
	async google(@Res() res: Response) {
		if (!this.googleEnabled())
			throw new NotFoundException('Google login disabled')

		const state = this.makeState()
		this.setStateCookie(res, state)

		const params = new URLSearchParams({
			client_id: process.env.GOOGLE_CLIENT_ID!,
			redirect_uri: process.env.GOOGLE_REDIRECT_URL!, // ← из .env, чтобы совпадал 1-в-1
			response_type: 'code',
			scope: 'openid email profile',
			access_type: 'offline',
			include_granted_scopes: 'true',
			state,
			prompt: 'consent',
		})

		res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
	}

	@Get('google/callback')
	async googleCallback(
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response
	) {
		if (!this.googleEnabled())
			throw new NotFoundException('Google login disabled')

		const { code, state } = req.query as { code?: string; state?: string }
		const stateCookie = (req as any).cookies?.google_oauth_state
		if (!code || !state || !stateCookie || state !== stateCookie) {
			throw new BadRequestException('Invalid OAuth state/code')
		}
		res.clearCookie('google_oauth_state', this.cookieOpts())

		// Обмен кода на токены
		const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				code,
				client_id: process.env.GOOGLE_CLIENT_ID!,
				client_secret: process.env.GOOGLE_CLIENT_SECRET!,
				redirect_uri: process.env.GOOGLE_REDIRECT_URL!, // ← тот же redirect
				grant_type: 'authorization_code',
			}),
		})
		if (!tokenResp.ok) {
			const txt = await tokenResp.text()
			throw new UnauthorizedException(`Token exchange failed: ${txt}`)
		}
		const { id_token } = (await tokenResp.json()) as any
		if (!id_token) throw new UnauthorizedException('No id_token')

		// Верификация id_token и вытаскивание email
		const ticket = await this.googleClient().verifyIdToken({
			idToken: id_token,
			audience: process.env.GOOGLE_CLIENT_ID!,
		})
		const payload = ticket.getPayload()
		const email = payload?.email?.toLowerCase()
		const emailVerified = payload?.email_verified
		if (!email || !emailVerified)
			throw new UnauthorizedException('Google email not verified')

		// Upsert user
		let user = await this.auth['users'].findByEmail(email)
		if (!user) {
			user = await this.auth['users'].create({
				email,
				passwordHash: 'google',
			})
		}
		await this.auth['users'].ensureAdminRoleFor(user.email)

		// Выдача cookies
		const access = this.auth.signAccess(user)
		const { plain: refreshToken, expires: refreshExpires } =
			await this.auth.issueRefresh(user.id)

		res.cookie('access_token', access, {
			...this.cookieOpts(),
			maxAge: 15 * 60 * 1000,
		})
		res.cookie('refresh_token', refreshToken, {
			...this.cookieOpts(),
			maxAge: refreshExpires.getTime() - Date.now(),
		})

		const back =
			process.env.WEB_AFTER_LOGIN_URL || 'http://localhost:3000/profile'
		res.redirect(back)
	}

	// --- Debug (на время настройки) ---
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
			state: 'debug',
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
