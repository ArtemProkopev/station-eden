import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
} from '@nestjs/common'

@Injectable()
export class AdminGuard implements CanActivate {
	canActivate(context: ExecutionContext): boolean {
		const req = context.switchToHttp().getRequest()
		const user = req.user

		if (
			user?.role === 'admin' ||
			user?.email?.toLowerCase() === 'artemprokopev@internet.ru'
		) {
			return true
		}

		throw new ForbiddenException({
			message: 'Доступ ограничен',
			hint: 'Эта страница доступна только для администратора станции.',
			action: 'Вернитесь в профиль или обратитесь к администратору.',
			code: 'ADMIN_ONLY',
		})
	}
}
