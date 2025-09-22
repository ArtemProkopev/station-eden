// apps/api/src/auth/auth.module.ts
import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { TypeOrmModule } from '@nestjs/typeorm'

import { User } from '../users/user.entity'
import { UsersModule } from '../users/users.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { EmailCode } from './email-code.entity'
import { EmailService } from './email.service'
import { RefreshToken } from './refresh-token.entity'
import { JwtStrategy } from './strategies/jwt.strategy'

@Module({
	imports: [
		PassportModule,
		JwtModule.registerAsync({
			inject: [ConfigService],
			useFactory: (cfg: ConfigService) => {
				const secret =
					cfg.get<string>('JWT_ACCESS_SECRET') ??
					process.env.JWT_ACCESS_SECRET ??
					cfg.get<string>('JWT_SECRET') ??
					process.env.JWT_SECRET

				const expiresIn =
					cfg.get<string>('JWT_ACCESS_EXPIRES') ??
					process.env.JWT_ACCESS_EXPIRES ??
					'15m'

				if (!secret) {
					throw new Error(
						'JWT secret is not set. Define JWT_ACCESS_SECRET (or JWT_SECRET).'
					)
				}
				return { secret, signOptions: { expiresIn } }
			},
		}),
		TypeOrmModule.forFeature([User, RefreshToken, EmailCode]),
		UsersModule,
	],
	controllers: [AuthController],
	providers: [AuthService, JwtStrategy, EmailService],
	exports: [AuthService, JwtModule],
})
export class AuthModule {}
