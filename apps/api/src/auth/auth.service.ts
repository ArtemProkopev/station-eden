// apps/api/src/auth/auth.service.ts
import {
	BadRequestException,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { Repository } from 'typeorm'
import { User } from '../users/user.entity'
import { UsersService } from '../users/users.service'
import { EmailCode } from './email-code.entity'
import { EmailService } from './email.service'
import { OAuthAccount } from './oauth-account.entity'
import { RefreshToken } from './refresh-token.entity'

@Injectable()
export class AuthService {
	constructor(
		private readonly users: UsersService,
		private readonly jwt: JwtService,
		@InjectRepository(RefreshToken)
		private readonly rtRepo: Repository<RefreshToken>,
		@InjectRepository(EmailCode)
		private readonly emailCodeRepo: Repository<EmailCode>,
		@InjectRepository(OAuthAccount)
		private readonly oaRepo: Repository<OAuthAccount>,
		private readonly emailer: EmailService
	) {}

	/** Access JWT */
	public signAccess(user: User) {
		return this.jwt.sign(
			{ sub: user.id, email: user.email, role: user.role },
			{
				secret: process.env.JWT_ACCESS_SECRET!,
				expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
			}
		)
	}

	/** Короткий JWT для шага preauth (10 минут) */
	public signPreauth(userId: string, email: string) {
		return this.jwt.sign(
			{ sub: userId, email, kind: 'preauth' },
			{ secret: process.env.JWT_ACCESS_SECRET!, expiresIn: '10m' }
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

	/** Выдаём refresh и сохраняем хэш в БД */
	public async issueRefresh(userId: string) {
		const plain = this.cryptoRandom(48)
		const tokenHash = await bcrypt.hash(plain, 10)

		const ttlMs =
			parseInt(process.env.JWT_REFRESH_TTL_MS || '', 10) ||
			30 * 24 * 60 * 60 * 1000
		const expires = new Date(Date.now() + ttlMs)

		await this.rtRepo.save(
			this.rtRepo.create({ userId, tokenHash, expiresAt: expires })
		)

		return { plain, expires }
	}

	// ===== Регистрация/логин (используются контроллером) =====

	async register(email: string, password: string) {
		const existing = await this.users.findByEmailWithHash(email)

		if (existing) {
			// Если учётка создана через Google (пароля нет) — задаём пароль.
			if (!existing.passwordHash) {
				existing.passwordHash = await bcrypt.hash(password, 10)
				await this.users.save(existing)
				await this.users.ensureAdminRoleFor(email)

				const fresh = (await this.users.findByEmail(email))!
				return {
					user: { id: fresh.id, email: fresh.email, role: fresh.role },
				}
			}

			// Иначе — обычный конфликт
			throw new UnauthorizedException('Email already used')
		}

		// Обычная новая регистрация
		const passwordHash = await bcrypt.hash(password, 10)
		await this.users.create({ email, passwordHash, role: 'user' })
		await this.users.ensureAdminRoleFor(email)

		const fresh = (await this.users.findByEmail(email))!

		// токены будут выданы после MFA
		return {
			user: { id: fresh.id, email: fresh.email, role: fresh.role },
		}
	}

	async login(email: string, password: string) {
		const user = await this.validateUser(email, password)

		return {
			user: { id: user.id, email: user.email, role: user.role },
		}
	}

	/** Валидация пользователя без выдачи токенов (для MFA) */
	public async validateUser(email: string, password: string): Promise<User> {
		const user = await this.users.findByEmailWithHash(email)
		if (!user || !user.passwordHash) {
			// Не раскрываем факт существования учётки без пароля — это обрабатывает контроллер /auth/login
			throw new UnauthorizedException('Invalid credentials')
		}
		const ok = await bcrypt.compare(password, user.passwordHash)
		if (!ok) throw new UnauthorizedException('Invalid credentials')

		await this.users.ensureAdminRoleFor(email)

		return await this.users.findByEmailOrFail(email)
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

		// отзываем предыдущий refresh и выдаём новый
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

	// ===== Email MFA =====

	private rand6(): string {
		return Math.floor(100000 + Math.random() * 900000).toString()
	}

	/** Создаёт и отправляет одноразовый код на почту (10 минут) */
	public async startEmailMfa(userId: string, email: string) {
		const code = this.rand6()
		const expires = new Date(Date.now() + 10 * 60 * 1000)
		await this.emailCodeRepo.save(
			this.emailCodeRepo.create({ userId, email, code, expiresAt: expires })
		)
		await this.emailer.sendLoginCode(email, code)
		return { expires }
	}

	/** Проверка кода + (опционально) установка пароля + выдача токенов */
	public async verifyEmailCode(
		userId: string,
		email: string,
		code: string,
		newPassword?: string
	) {
		const rec = await this.emailCodeRepo.findOne({
			where: { userId, email, used: false },
			order: { createdAt: 'DESC' },
		})
		if (!rec || rec.code !== code || rec.expiresAt < new Date()) {
			throw new UnauthorizedException('Invalid or expired code')
		}

		rec.used = true
		await this.emailCodeRepo.save(rec)

		const user = await this.users.findById(userId)
		if (!user) throw new UnauthorizedException('User not found')

		// Если пароль ещё не задан — можно задать прямо сейчас
		if (!user.passwordHash && newPassword) {
			if (newPassword.length < 8) {
				throw new BadRequestException('Password must be at least 8 characters')
			}
			user.passwordHash = await bcrypt.hash(newPassword, 10)
			await this.users.save(user)
		}

		const access = this.signAccess(user)
		const { plain: refreshToken, expires: refreshExpires } =
			await this.issueRefresh(user.id)

		return {
			user: { id: user.id, email: user.email, role: user.role },
			access,
			refreshToken,
			refreshExpires,
		}
	}

	// ===== OAuth helpers =====

	/** Найти привязку OAuth (provider+sub) */
	private findOAuth(provider: 'google', providerUserId: string) {
		return this.oaRepo.findOne({
			where: { provider, providerUserId },
		})
	}

	/** Создать/обновить привязку OAuth к userId (идемпотентно) */
	public async linkGoogleAccount(userId: string, sub: string, email: string) {
		const existing = await this.findOAuth('google', sub)
		if (existing && existing.userId === userId) return existing
		if (existing && existing.userId !== userId) {
			// Защитимся от попытки «перехвата» чужого Google sub
			throw new UnauthorizedException('This Google account is linked elsewhere')
		}
		const rec = this.oaRepo.create({
			provider: 'google',
			providerUserId: sub,
			email: email.toLowerCase(),
			userId,
		})
		return this.oaRepo.save(rec)
	}

	/**
	 * Логика «find or create» по Google:
	 * 1) если есть привязка по (provider, sub) — берём этого пользователя
	 * 2) иначе, если есть пользователь по email — линкуем его
	 * 3) иначе — создаём нового пользователя (без пароля) и линкуем
	 */
	public async findOrCreateUserByGoogle(
		sub: string,
		email: string
	): Promise<User> {
		const bySub = await this.findOAuth('google', sub)
		if (bySub) {
			const u = await this.users.findById(bySub.userId)
			if (!u) throw new UnauthorizedException('Linked user not found')
			// опционально можно синкать email
			return u
		}

		const byEmail = await this.users.findByEmail(email)
		if (byEmail) {
			await this.linkGoogleAccount(byEmail.id, sub, email)
			return byEmail
		}

		// создаём нового «oauth-only» пользователя
		const created = await this.users.create({
			email: email.toLowerCase(),
			passwordHash: null,
			role: 'user',
		})
		await this.linkGoogleAccount(created.id, sub, email)
		return created
	}
}
