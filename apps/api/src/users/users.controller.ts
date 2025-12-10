// apps/api/src/users/users.controller.ts
import {
	Body,
	Controller,
	Delete,
	Get,
	NotFoundException,
	Param,
	Put,
	Request,
	UseGuards,
} from '@nestjs/common'
import { AdminGuard } from '../common/guards/admin.guard'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface'
import { UsersService } from './users.service'

@Controller('users')
export class UsersController {
	constructor(private users: UsersService) {}

	// Эндпоинт для обновления профиля (аватар, рамка, никнейм)
	@Put('profile')
	@UseGuards(JwtAuthGuard)
	async updateProfile(
		@Request() req: AuthenticatedRequest,
		@Body()
		body: {
			avatar?: string
			frame?: string
			username?: string
		}
	) {
		if (!req.user || !req.user.sub) {
			// Это не должно происходить при корректной работе JwtAuthGuard,
			// но на всякий случай явно проверяем.
			throw new Error('Authenticated user not found in request')
		}

		const userId = req.user.sub
		const user = await this.users.findByIdOrFail(userId)

		// Можно ли обойти кулдаун:
		// 1) роль admin в БД
		// 2) email входит в ADMIN_EMAILS
		const canBypassCooldown =
			user.role === 'admin' && this.users.isAdminEmail(user.email)

		// 1. Никнейм (может быть и первым, и последующим)
		if (typeof body.username === 'string') {
			await this.users.updateUsername(user, body.username, {
				force: canBypassCooldown,
			})
		}

		// 2. Аватар и рамка (частичный апдейт, пароль не трогаем)
		await this.users.updateAvatarAndFrame(user.id, body.avatar, body.frame)

		// Берём свежие данные из БД после всех апдейтов
		const updated = await this.users.findByIdOrFail(user.id)

		return {
			ok: true,
			avatar: updated.avatar,
			frame: updated.frame,
			username: updated.username,
			usernameChangedAt: updated.usernameChangedAt,
		}
	}

	// Админские эндпоинты
	@Get()
	@UseGuards(JwtAuthGuard, AdminGuard)
	async list() {
		const list = await this.users.findAll()

		if (!list || list.length === 0) {
			throw new NotFoundException('Пользователи не найдены')
		}

		return list.map(u => ({
			id: u.id,
			email: u.email,
			role: u.role,
			avatar: u.avatar,
			frame: u.frame,
			createdAt: u.createdAt,
		}))
	}

	@Get(':id')
	@UseGuards(JwtAuthGuard, AdminGuard)
	async getById(@Param('id') id: string) {
		const user = await this.users.findByIdOrFail(id)
		return {
			id: user.id,
			email: user.email,
			role: user.role,
			avatar: user.avatar,
			frame: user.frame,
			createdAt: user.createdAt,
		}
	}

	@Delete(':id')
	@UseGuards(JwtAuthGuard, AdminGuard)
	async remove(@Param('id') id: string) {
		await this.users.findByIdOrFail(id)
		await this.users.removeById(id)
		return { ok: true }
	}
}
