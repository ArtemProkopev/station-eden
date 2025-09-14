import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from './user.entity'

@Injectable()
export class UsersService {
	constructor(
		@InjectRepository(User) private readonly repo: Repository<User>
	) {}

	findAll() {
		return this.repo.find({ order: { createdAt: 'DESC' } })
	}

	findById(id: string) {
		return this.repo.findOne({ where: { id } })
	}

	// Без хеша (безопасный дефолт для большинства мест)
	findByEmail(email: string) {
		return this.repo.findOne({ where: { email } })
	}

	// С хешем — специально для логина/валидации
	findByEmailWithHash(email: string) {
		return this.repo
			.createQueryBuilder('u')
			.addSelect('u.passwordHash') // важно: поле в entity с select:false
			.where('u.email = :email', { email })
			.getOne()
	}

	async create(data: Partial<User>) {
		return this.repo.save(this.repo.create(data))
	}

	removeById(id: string) {
		return this.repo.delete(id)
	}
}
