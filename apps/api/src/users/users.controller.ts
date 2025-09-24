// apps/api/src/users/users.controller.ts
import { Controller, Delete, Get, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  async list() {
    const list = await this.users.findAll();
    
    // Добавить проверку на пустой список
    if (!list || list.length === 0) {
      throw new NotFoundException('Пользователи не найдены');
    }
    
    return list.map(u => ({ id: u.id, email: u.email, role: u.role, createdAt: u.createdAt }));
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    // Использовать новую функцию с проверкой
    const user = await this.users.findByIdOrFail(id);
    return { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    // Сначала проверим существование пользователя
    await this.users.findByIdOrFail(id);
    await this.users.removeById(id);
    return { ok: true };
  }
}
