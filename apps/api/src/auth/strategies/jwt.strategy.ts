// apps/api/src/auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import type { Request } from 'express'
import { ExtractJwt, Strategy } from 'passport-jwt'

function cookieExtractor(req: Request): string | null {
	return (req?.cookies && (req.cookies['access_token'] as string)) || null
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(private readonly config: ConfigService) {
		const secret =
			config.get<string>('JWT_ACCESS_SECRET') ??
			process.env.JWT_ACCESS_SECRET ??
			config.get<string>('JWT_SECRET') ??
			process.env.JWT_SECRET

		if (!secret) {
			throw new Error(
				'JWT secret is not set. Define JWT_ACCESS_SECRET (or JWT_SECRET).'
			)
		}

		super({
			jwtFromRequest: ExtractJwt.fromExtractors([
				cookieExtractor,
				ExtractJwt.fromAuthHeaderAsBearerToken(),
			]),
			ignoreExpiration: false,
			secretOrKey: secret,
			algorithms: ['HS256'],
		})
	}

	async validate(payload: any) {
		return { sub: payload.sub, email: payload.email, role: payload.role }
	}
}
