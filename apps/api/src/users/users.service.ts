// apps/api/src/users/users.service.ts
import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from './user.entity'

function parseAdminEmails(src?: string): string[] {
	return (src ?? '')
		.split(',')
		.map(s => s.trim().toLowerCase())
		.filter(Boolean)
}

// Кулдаун на смену ника (в часах).
// По умолчанию — 30 дней (24 * 30 = 720 часов), можно переопределить через env.
const USERNAME_CHANGE_COOLDOWN_HOURS = Number(
	process.env.USERNAME_CHANGE_COOLDOWN_HOURS ?? 24 * 30
)

@Injectable()
export class UsersService {
	private readonly adminEmails: string[]

	constructor(@InjectRepository(User) private readonly repo: Repository<User>) {
		this.adminEmails = parseAdminEmails(process.env.ADMIN_EMAILS)
	}

	findAll() {
		return this.repo.find({ order: { createdAt: 'DESC' } })
	}

	findById(id: string) {
		return this.repo.findOne({ where: { id } })
	}

	async findByIdOrFail(id: string): Promise<User> {
		const user = await this.findById(id)
		if (!user) {
			throw new NotFoundException(`Пользователь с ID ${id} не найден`)
		}
		return user
	}

	findByEmail(email: string) {
		return this.repo.findOne({ where: { email: email.toLowerCase() } })
	}

	async findByEmailOrFail(email: string): Promise<User> {
		const user = await this.findByEmail(email)
		if (!user) {
			throw new NotFoundException(`Пользователь с email ${email} не найден`)
		}
		return user
	}

	// для логина по email: получить вместе с passwordHash
	findByEmailWithHash(email: string) {
		return this.repo
			.createQueryBuilder('u')
			.addSelect('u.passwordHash')
			.where('u.email = :email', { email: email.toLowerCase() })
			.getOne()
	}

	// === username ===
	findByUsername(username: string) {
		return this.repo.findOne({
			where: { username: username.toLowerCase() },
		})
	}

	// для логина по username: тоже забираем passwordHash (он select:false)
	findByUsernameWithHash(username: string) {
		return this.repo
			.createQueryBuilder('u')
			.addSelect('u.passwordHash')
			.where('LOWER(u.username) = :username', {
				username: username.toLowerCase(),
			})
			.getOne()
	}

	async findByUsernameOrFail(username: string): Promise<User> {
		const user = await this.findByUsername(username)
		if (!user) {
			throw new NotFoundException(`Пользователь @${username} не найден`)
		}
		return user
	}

	async create(data: Partial<User>) {
		return this.repo.save(this.repo.create(data))
	}

	async save(user: User) {
		return this.repo.save(user)
	}

	async removeById(id: string) {
		const res = await this.repo.delete(id)
		if (!res.affected) throw new NotFoundException('User not found')
	}

	/**
	 * Если email есть в ADMIN_EMAILS — гарантируем роль 'admin'.
	 * Идемпотентно, можно вызывать при каждом логине/регистрации.
	 */
	async ensureAdminRoleFor(email: string): Promise<void> {
		if (!email) return
		const target = email.toLowerCase()
		if (!this.adminEmails.includes(target)) return

		const user = await this.findByEmail(email)
		if (!user) return

		if (user.role !== 'admin') {
			user.role = 'admin'
			await this.save(user)
		}
	}

	/**
	 * Проверка, что email есть в ADMIN_EMAILS.
	 * Используем, чтобы разрешить обход кулдауна.
	 */
	isAdminEmail(email: string | null | undefined): boolean {
		if (!email) return false
		return this.adminEmails.includes(email.toLowerCase())
	}

	// ================= НИКНЕЙМ / ПРОФИЛЬ =================

	/** Такая же логика, как в RegisterSchema: 3–20 символов, латиница/цифры/_ */
	private sanitizeUsername(raw: string): string {
		const value = raw.trim()

		if (!value) {
			throw new BadRequestException('Никнейм не может быть пустым')
		}

		if (value.length < 3 || value.length > 20) {
			throw new BadRequestException('Никнейм должен быть от 3 до 20 символов')
		}

		const re = /^[a-zA-Z0-9_]{3,20}$/
		if (!re.test(value)) {
			throw new BadRequestException(
				"Никнейм может содержать только латинские буквы, цифры и '_'"
			)
		}

		// Всегда храним в нижнем регистре, чтобы не было коллизий по регистру
		return value.toLowerCase()
	}

	/**
	 * Обновление никнейма с проверкой кулдауна и уникальности.
	 * Работает и для первого выставления ника, и для последующей смены.
	 *
	 * ВАЖНО: не трогаем password_hash — апдейтим только username/usernameChangedAt.
	 *
	 * opts.force === true  → пропускаем кулдаун (для админов из ADMIN_EMAILS).
	 */
	async updateUsername(
		user: User,
		newUsername: string,
		opts?: { force?: boolean }
	): Promise<void> {
		const now = new Date()
		const cleaned = this.sanitizeUsername(newUsername)
		const bypassCooldown = opts?.force === true

		// Кулдаун: если ник уже был и его меняли ранее,
		// НО можно пропустить для админов с force = true
		if (!bypassCooldown && user.username && user.usernameChangedAt) {
			const diffMs = now.getTime() - user.usernameChangedAt.getTime()
			const cooldownMs = USERNAME_CHANGE_COOLDOWN_HOURS * 60 * 60 * 1000

			if (diffMs < cooldownMs) {
				const leftMs = cooldownMs - diffMs
				const leftDays = Math.ceil(leftMs / (24 * 60 * 60 * 1000))

				throw new BadRequestException(
					`Вы можете сменить никнейм через ${leftDays} дн.`
				)
			}
		}

		// Проверяем уникальность ника:
		// LOWER(u.username) = :username и id != текущего пользователя
		const existing = await this.repo
			.createQueryBuilder('u')
			.where('LOWER(u.username) = :username', {
				username: cleaned.toLowerCase(),
			})
			.andWhere('u.id <> :id', { id: user.id })
			.getOne()

		if (existing) {
			throw new BadRequestException('Такой ник уже занят')
		}

		// Апдейтим только нужные поля, не трогая пароль и другие колонки
		await this.repo
			.createQueryBuilder()
			.update(User)
			.set({
				username: cleaned,
				usernameChangedAt: now,
			})
			.where('id = :id', { id: user.id })
			.execute()
	}

	/**
	 * Частичное обновление аватара/рамки.
	 * Не трогаем пароль, ник и другие поля.
	 */
	async updateAvatarAndFrame(
		userId: string,
		avatar?: string,
		frame?: string
	): Promise<void> {
		const patch: Partial<User> = {}

		if (avatar !== undefined) {
			patch.avatar = avatar
		}
		if (frame !== undefined) {
			patch.frame = frame
		}

		if (Object.keys(patch).length === 0) {
			return
		}

		await this.repo.update(userId, patch)
	}
}
