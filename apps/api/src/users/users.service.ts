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

	findByEmail(email: string) {
		return this.repo.findOne({ where: { email } })
	}

	findByEmailWithHash(email: string) {
		return this.repo
			.createQueryBuilder('u')
			.addSelect('u.passwordHash')
			.where('u.email = :email', { email })
			.getOne()
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
