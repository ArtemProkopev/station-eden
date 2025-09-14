import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
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
    return list.map(u => ({ id: u.id, email: u.email, role: u.role, createdAt: u.createdAt }));
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.users.removeById(id);
    return { ok: true };
  }
}
