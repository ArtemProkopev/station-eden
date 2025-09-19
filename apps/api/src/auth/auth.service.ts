import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { Repository } from 'typeorm'
import { User } from '../users/user.entity'
import { UsersService } from '../users/users.service'
import { RefreshToken } from './refresh-token.entity'

@Injectable()
export class AuthService {
	constructor(
		private readonly users: UsersService,
		private readonly jwt: JwtService,
		@InjectRepository(RefreshToken)
		private readonly rtRepo: Repository<RefreshToken>
	) {}

	// ===== Helpers =====
	private signAccess(user: User) {
		// включаем роль в payload (пригодится для фронта/гардов)
		return this.jwt.sign(
			{ sub: user.id, email: user.email, role: user.role },
			{
				secret: process.env.JWT_ACCESS_SECRET!,
				expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
			}
		)
	}

	private cryptoRandom(len = 48) {
		const buf = randomBytes(len)
		const alphabet =
			'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
		let out = ''
		for (let i = 0; i < buf.length; i++)
			out += alphabet[buf[i] % alphabet.length]
		return out
	}

	private async issueRefresh(userId: string) {
		const plain = this.cryptoRandom(48)
		const tokenHash = await bcrypt.hash(plain, 10)

		const ttlMs =
			parseInt(process.env.JWT_REFRESH_TTL_MS || '', 10) ||
			30 * 24 * 60 * 60 * 1000 // 30d по умолчанию
		const expires = new Date(Date.now() + ttlMs)

		await this.rtRepo.save(
			this.rtRepo.create({ userId, tokenHash, expiresAt: expires })
		)

		return { plain, expires }
	}

	private async validateUser(email: string, password: string) {
		const user = await this.users.findByEmailWithHash(email)
		if (!user || !user.passwordHash) {
			throw new UnauthorizedException('Invalid credentials')
		}
		const ok = await bcrypt.compare(password, user.passwordHash)
		if (!ok) throw new UnauthorizedException('Invalid credentials')
		return user
	}

	// ===== Public API used by controller =====
	async register(email: string, password: string) {
		const exists = await this.users.findByEmail(email)
		if (exists) throw new UnauthorizedException('Email already used')

		const passwordHash = await bcrypt.hash(password, 10)
		await this.users.create({ email, passwordHash, role: 'user' })

		// авто-назначение роли админа по allow-list
		await this.users.ensureAdminRoleFor(email)

		// перечитать актуального пользователя (с учётом возможной смены роли)
		const fresh = (await this.users.findByEmail(email))!
		const access = this.signAccess(fresh)
		const { plain: refreshToken, expires: refreshExpires } =
			await this.issueRefresh(fresh.id)

		return {
			user: { id: fresh.id, email: fresh.email, role: fresh.role },
			access,
			refreshToken,
			refreshExpires,
		}
	}

	async login(email: string, password: string) {
		await this.validateUser(email, password)

		// авто-назначение роли админа по allow-list
		await this.users.ensureAdminRoleFor(email)

		// перечитать актуального пользователя (с ролью)
		const fresh = (await this.users.findByEmail(email))!
		const access = this.signAccess(fresh)
		const { plain: refreshToken, expires: refreshExpires } =
			await this.issueRefresh(fresh.id)

		return {
			user: { id: fresh.id, email: fresh.email, role: fresh.role },
			access,
			refreshToken,
			refreshExpires,
		}
	}

	async refresh(userId: string, refreshToken: string) {
		const rec = await this.rtRepo.findOne({
			where: { userId, revoked: false },
			order: { createdAt: 'DESC' },
		})
		if (!rec) throw new UnauthorizedException('No refresh token')

		const ok = await bcrypt.compare(refreshToken, rec.tokenHash)
		if (!ok || rec.expiresAt < new Date()) {
			throw new UnauthorizedException('Refresh expired')
		}

		// ротируем
		await this.rtRepo.update(rec.id, { revoked: true })

		const user = await this.users.findById(userId)
		if (!user) throw new UnauthorizedException('User not found')

		const access = this.signAccess(user)
		const { plain: newRefresh, expires: refreshExpires } =
			await this.issueRefresh(userId)

		return { access, refreshToken: newRefresh, refreshExpires }
	}

	async logout(userId: string, refreshToken?: string) {
		if (!refreshToken) {
			await this.rtRepo.update({ userId, revoked: false }, { revoked: true })
			return { ok: true }
		}

		const recs = await this.rtRepo.find({
			where: { userId, revoked: false },
			order: { createdAt: 'DESC' },
		})
		for (const r of recs) {
			const ok = await bcrypt.compare(refreshToken, r.tokenHash)
			if (ok) {
				await this.rtRepo.update(r.id, { revoked: true })
				break
			}
		}
		return { ok: true }
	}
}
