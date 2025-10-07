import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from './user.entity'

function parseAdminEmails(src?: string): string[] {
	return (src ?? '')
		.split(',')
		.map(s => s.trim().toLowerCase())
		.filter(Boolean)
}

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
}
