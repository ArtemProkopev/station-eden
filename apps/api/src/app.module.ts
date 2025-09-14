import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { User } from './users/user.entity';
import { RefreshToken } from './auth/refresh-token.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: async () => ({
        type: 'postgres',
        host: process.env.POSTGRES_HOST,
        port: Number(process.env.POSTGRES_PORT || 5432),
        username: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB,
        entities: [User, RefreshToken],
        synchronize: false
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 300000, limit: 100 }]),
    AuthModule,
    UsersModule,
  ],
})
export class AppModule {}
