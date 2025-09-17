import { Injectable, NotFoundException } from '@nestjs/common'
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

	async removeById(id: string) {
		const res = await this.repo.delete(id)
		if (!res.affected) throw new NotFoundException('User not found')
	}
}
