import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from './refresh-token.entity';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [UsersModule, TypeOrmModule.forFeature([RefreshToken]), JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
