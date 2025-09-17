import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor() {
		super({
			jwtFromRequest: ExtractJwt.fromExtractors([
				(req: any) => req?.cookies?.access_token || null,
			]),
			secretOrKey: process.env.JWT_ACCESS_SECRET,
		})
	}
	async validate(payload: { sub: string; email: string }) {
		return payload
	}
}
