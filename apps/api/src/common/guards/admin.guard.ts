import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    // Разрешаем админу по роли или по конкретному email
    if (user?.role === 'admin' || user?.email?.toLowerCase() === 'artemprokopev@internet.ru') {
      return true;
    }
    // Дружелюбное сообщение
    throw new ForbiddenException({
      message: 'Доступ ограничен',
      hint: 'Эта страница доступна только для администратора станции.',
      action: 'Вернитесь в профиль или обратитесь к администратору.',
      code: 'ADMIN_ONLY',
    });
  }
}
