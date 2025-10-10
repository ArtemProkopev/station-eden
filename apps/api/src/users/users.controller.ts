// apps/api/src/users/users.controller.ts
import { 
  Controller, 
  Delete, 
  Get, 
  Param, 
  UseGuards, 
  NotFoundException,
  Put,
  Body,
  Request
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  // Эндпоинт для обновления профиля (аватар и рамка)
  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() body: { avatar?: string; frame?: string }
  ) {
    const user = await this.users.findByIdOrFail(req.user.id);
    
    if (body.avatar !== undefined) {
      user.avatar = body.avatar;
    }
    if (body.frame !== undefined) {
      user.frame = body.frame;
    }
    
    await this.users.save(user);
    return { 
      ok: true,
      avatar: user.avatar,
      frame: user.frame
    };
  }

  // Админские эндпоинты
  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async list() {
    const list = await this.users.findAll();
    
    if (!list || list.length === 0) {
      throw new NotFoundException('Пользователи не найдены');
    }
    
    return list.map(u => ({ 
      id: u.id, 
      email: u.email, 
      role: u.role, 
      avatar: u.avatar,
      frame: u.frame,
      createdAt: u.createdAt 
    }));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getById(@Param('id') id: string) {
    const user = await this.users.findByIdOrFail(id);
    return { 
      id: user.id, 
      email: user.email, 
      role: user.role, 
      avatar: user.avatar,
      frame: user.frame,
      createdAt: user.createdAt 
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async remove(@Param('id') id: string) {
    await this.users.findByIdOrFail(id);
    await this.users.removeById(id);
    return { ok: true };
  }
}