import {
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
import type { Request, Response } from 'express'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { verifyTelegramAuth } from './telegram.util'

@Controller('auth')
export class AuthController {
	constructor(private auth: AuthService, private jwt: JwtService) {}

	private cookieOpts() {
		const secure = process.env.COOKIE_SECURE === 'true'
		return { httpOnly: true, sameSite: 'lax' as const, secure, path: '/' }
	}

	@Get('csrf')
	csrf() {
		return { csrf: true }
	}

	@Post('register')
	async register(@Body() dto: RegisterDto) {
		return this.auth.register(dto.email.toLowerCase(), dto.password)
	}

	// Throttler v6: объект с профилем для метода
	@UseGuards(ThrottlerGuard)
	@Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 попыток за 5 минут
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
		const payload = tryDecode(this.jwt, req.cookies?.access_token)
		const userId = (payload as any)?.sub || (req.body as any)?.userId
		const rt = req.cookies?.refresh_token

		if (!userId || !rt) {
			throw new UnauthorizedException('No refresh')
		}

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
		const payload = tryDecode(this.jwt, req.cookies?.access_token)
		const userId = (payload as any)?.sub
		const rt = req.cookies?.refresh_token

		if (userId) {
			await this.auth.logout(userId, rt)
		}

		res.clearCookie('access_token', this.cookieOpts())
		res.clearCookie('refresh_token', this.cookieOpts())
		return { ok: true }
	}

	@UseGuards(JwtAuthGuard)
	@Get('me')
	me(@Req() req: Request & { user?: any }) {
		return { userId: (req.user as any).sub, email: (req.user as any).email }
	}

	@Post('telegram/callback')
	async telegram(@Body() body: any, @Res({ passthrough: true }) res: Response) {
		if (process.env.TELEGRAM_LOGIN_ENABLED !== 'true') {
			throw new NotFoundException('Telegram login disabled')
		}

		const payload =
			typeof body.payload === 'string' ? JSON.parse(body.payload) : body
		const valid = verifyTelegramAuth(payload, process.env.TELEGRAM_BOT_TOKEN!)
		if (!valid) {
			throw new UnauthorizedException('Invalid telegram auth')
		}

		const email = `tg_${payload.id}@telegram.local`
		let user = await this.auth['users'].findByEmail(email)
		if (!user)
			user = await this.auth['users'].create({
				email,
				passwordHash: 'telegram',
				telegramId: payload.id,
			})

		const access = (this.auth as any).signAccess({
			id: (user as any).id,
			email: (user as any).email,
		})
		const { plain: refreshToken, expires: refreshExpires } = await (
			this.auth as any
		).issueRefresh((user as any).id)

		res.cookie('access_token', access, {
			...this.cookieOpts(),
			maxAge: 15 * 60 * 1000,
		})
		res.cookie('refresh_token', refreshToken, {
			...this.cookieOpts(),
			maxAge: refreshExpires.getTime() - Date.now(),
		})
		return { user: { id: (user as any).id, email: (user as any).email } }
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
