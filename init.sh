#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/m4d/Документы/station-eden"
mkdir -p "$ROOT" && cd "$ROOT"

echo "==> Создаю структуру монорепо"
mkdir -p apps/api apps/web

echo "==> Корневые файлы"
cat > package.json << 'EOF'
{
  "name": "station-eden",
  "private": true,
  "packageManager": "pnpm@9.6.0",
  "scripts": {
    "dev:db": "docker compose up -d",
    "dev:web": "pnpm --filter @station-eden/web dev",
    "dev:api": "pnpm --filter @station-eden/api start:dev",
    "dev": "run-p dev:db dev:api dev:web",
    "build": "pnpm -r build",
    "migrate:run": "pnpm --filter @station-eden/api typeorm migration:run -d apps/api/ormconfig.ts",
    "migrate:revert": "pnpm --filter @station-eden/api typeorm migration:revert -d apps/api/ormconfig.ts"
  },
  "devDependencies": {
    "npm-run-all": "^4.1.5",
    "typescript": "^5.5.4"
  },
  "workspaces": ["apps/*"]
}
EOF

cat > pnpm-workspace.yaml << 'EOF'
packages:
  - "apps/*"
EOF

cat > .gitignore << 'EOF'
node_modules
dist
.next
.env
apps/**/.env
apps/**/.env.local
pnpm-lock.yaml
EOF

cat > .env.example << 'EOF'
NODE_ENV=development
NEXT_PUBLIC_API_BASE=http://localhost:4000
NEXT_PUBLIC_ENABLE_TELEGRAM=false

API_PORT=4000
API_CORS_ORIGIN=http://localhost:3000
JWT_ACCESS_SECRET=change_me_access
JWT_REFRESH_SECRET=change_me_refresh
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
COOKIE_SECURE=false
CSRF_COOKIE_NAME=csrf_token

TELEGRAM_LOGIN_ENABLED=false
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_NAME=@your_bot

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=eden
POSTGRES_PASSWORD=edenpwd
POSTGRES_DB=eden
EOF

cat > docker-compose.yml << 'EOF'
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: eden
      POSTGRES_PASSWORD: edenpwd
      POSTGRES_DB: eden
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data:Z
volumes:
  pgdata: {}
EOF

echo "==> Backend (NestJS)"
mkdir -p apps/api/{src/{auth/{dto,strategies},common/{guards,interceptors,middleware},users},migrations}

cat > apps/api/package.json << 'EOF'
{
  "name": "@station-eden/api",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "start:dev": "nest start --watch",
    "build": "nest build",
    "typeorm": "ts-node -T ./node_modules/typeorm/cli.js",
    "migration:generate": "ts-node -T ./node_modules/typeorm/cli.js migration:generate",
    "migration:create": "ts-node -T ./node_modules/typeorm/cli.js migration:create"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/config": "^3.1.1",
    "@nestjs/core": "^10.0.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.2",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/throttler": "^6.1.0",
    "bcryptjs": "^2.4.3",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.0",
    "cookie-parser": "^1.4.6",
    "csurf": "^1.11.0",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "reflect-metadata": "^0.1.13",
    "rimraf": "^5.0.5",
    "typeorm": "^0.3.20",
    "pg": "^8.11.3"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.5",
    "@nestjs/schematics": "^10.0.2",
    "@nestjs/testing": "^10.0.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.5.4"
  }
}
EOF

cat > apps/api/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "module": "es2022",
    "target": "es2022",
    "moduleResolution": "node",
    "outDir": "dist",
    "rootDir": "src",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"]
}
EOF

cat > apps/api/ormconfig.ts << 'EOF'
import { DataSource } from 'typeorm';
import { User } from './src/users/user.entity';
import { RefreshToken } from './src/auth/refresh-token.entity';
import 'dotenv/config';

export default new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT || 5432),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: [User, RefreshToken],
  synchronize: false,
  migrations: ['apps/api/migrations/*.ts'],
});
EOF

cat > apps/api/.env << 'EOF'
API_PORT=4000
API_CORS_ORIGIN=http://localhost:3000
JWT_ACCESS_SECRET=change_me_access
JWT_REFRESH_SECRET=change_me_refresh
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
COOKIE_SECURE=false
CSRF_COOKIE_NAME=csrf_token

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=eden
POSTGRES_PASSWORD=edenpwd
POSTGRES_DB=eden

TELEGRAM_LOGIN_ENABLED=false
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_NAME=@your_bot
EOF

cat > apps/api/src/main.ts << 'EOF'
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.API_CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    credentials: true
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  app.use(CsrfMiddleware);

  await app.listen(process.env.API_PORT || 4000);
}
bootstrap();
EOF

cat > apps/api/src/app.module.ts << 'EOF'
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import ds from '../../api/ormconfig';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ useFactory: async () => ds.options as any }),
    ThrottlerModule.forRoot([{ ttl: 300000, limit: 100 }]),
    AuthModule,
    UsersModule
  ],
})
export class AppModule {}
EOF

cat > apps/api/src/common/middleware/csrf.middleware.ts << 'EOF'
import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
const CSRF_COOKIE = process.env.CSRF_COOKIE_NAME || 'csrf_token';

export function CsrfMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.cookies[CSRF_COOKIE]) {
    const token = crypto.randomBytes(24).toString('hex');
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === 'true',
      path: '/'
    });
  }
  const needsCheck = ['POST','PUT','PATCH','DELETE'].includes(req.method)
    && req.path.startsWith('/auth')
    && !req.path.startsWith('/auth/telegram')
    && req.path !== '/auth/csrf';
  if (!needsCheck) return next();

  const header = req.get('x-csrf-token');
  const cookie = req.cookies[CSRF_COOKIE];
  if (!header || !cookie || header !== cookie) {
    return res.status(403).json({ message: 'Invalid CSRF token' });
  }
  next();
}
EOF

cat > apps/api/src/common/guards/jwt-auth.guard.ts << 'EOF'
import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
EOF

cat > apps/api/src/common/interceptors/response.interceptor.ts << 'EOF'
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map(data => ({ ok: true, data })));
  }
}
EOF

cat > apps/api/src/users/user.entity.ts << 'EOF'
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'citext', unique: true })
  email!: string;

  @Column({ type: 'text', select: false })
  passwordHash!: string;

  @Column({ type: 'text', nullable: true })
  telegramId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
EOF

cat > apps/api/src/users/users.module.ts << 'EOF'
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}
EOF

cat > apps/api/src/users/users.service.ts << 'EOF'
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  findByEmail(email: string) {
    return this.repo.createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email })
      .getOne();
  }

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  create(data: Partial<User>) {
    return this.repo.save(this.repo.create(data));
  }
}
EOF

cat > apps/api/src/auth/dto/register.dto.ts << 'EOF'
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
export class RegisterDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) @MaxLength(72) password!: string;
}
EOF

cat > apps/api/src/auth/dto/login.dto.ts << 'EOF'
import { IsEmail, IsString } from 'class-validator';
export class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
}
EOF

cat > apps/api/src/auth/refresh-token.entity.ts << 'EOF'
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Index({ unique: true })
  @Column({ name: 'token_hash', type: 'text' })
  tokenHash!: string;

  @Index()
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Index()
  @Column({ default: false })
  revoked!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
EOF

cat > apps/api/src/auth/strategies/jwt.strategy.ts << 'EOF'
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([(req: any) => req?.cookies?.access_token || null]),
      secretOrKey: process.env.JWT_ACCESS_SECRET,
    });
  }
  async validate(payload: { sub: string; email: string }) {
    return payload;
  }
}
EOF

cat > apps/api/src/auth/telegram.util.ts << 'EOF'
import crypto from 'node:crypto';
export function verifyTelegramAuth(params: Record<string,string>, botToken: string): boolean {
  const authData = { ...params };
  const hash = authData.hash;
  delete authData.hash;
  const dataCheckString = Object.keys(authData)
    .sort()
    .map(k => `${k}=${authData[k]}`)
    .join('\\n');
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return hmac === hash;
}
EOF

cat > apps/api/src/auth/auth.service.ts << 'EOF'
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from './refresh-token.entity';
import crypto from 'node:crypto';

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
    @InjectRepository(RefreshToken) private refreshRepo: Repository<RefreshToken>,
  ) {}

  async register(email: string, password: string) {
    const exists = await this.users.findByEmail(email);
    if (exists) throw new BadRequestException('Email already in use');
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.users.create({ email, passwordHash });
    return { id: user.id, email: user.email };
  }

  async validateUser(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, (user as any).passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  private signAccess(user: { id: string; email: string }) {
    const expiresIn = process.env.JWT_ACCESS_EXPIRES || '15m';
    return this.jwt.sign({ sub: user.id, email: user.email }, { secret: process.env.JWT_ACCESS_SECRET, expiresIn });
  }

  private async issueRefresh(userId: string) {
    const plain = crypto.randomBytes(64).toString('hex');
    const tokenHash = await bcrypt.hash(plain, 12);
    const expires = new Date(Date.now() + parseDur(process.env.JWT_REFRESH_EXPIRES || '7d'));
    await this.refreshRepo.save(this.refreshRepo.create({ userId, tokenHash, expiresAt: expires }));
    return { plain, expires };
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    const access = this.signAccess({ id: user.id, email: user.email });
    const refresh = await this.issueRefresh(user.id);
    return { access, refreshToken: refresh.plain, refreshExpires: refresh.expires, user: { id: user.id, email: user.email } };
  }

  async refresh(userId: string, refreshToken: string) {
    const tokens = await this.refreshRepo.find({ where: { userId, revoked: false } });
    const match = await findMatching(tokens, refreshToken);
    if (!match) throw new UnauthorizedException('Invalid refresh');
    if (match.expiresAt < new Date()) throw new UnauthorizedException('Expired refresh');
    match.revoked = true;
    await this.refreshRepo.save(match);
    const access = this.signAccess({ id: userId, email: '' });
    const fresh = await this.issueRefresh(userId);
    return { access, refreshToken: fresh.plain, refreshExpires: fresh.expires };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const tokens = await this.refreshRepo.find({ where: { userId, revoked: false } });
      const match = await findMatching(tokens, refreshToken);
      if (match) {
        match.revoked = true;
        await this.refreshRepo.save(match);
      }
    } else {
      await this.refreshRepo.update({ userId, revoked: false }, { revoked: true });
    }
  }
}

function parseDur(s: string): number {
  const m = /^(\\d+)([smhd])?$/.exec(s);
  if (!m) return 7 * 24 * 3600 * 1000;
  const n = Number(m[1]);
  const unit = m[2] || 's';
  const mul = unit === 's' ? 1000 : unit === 'm' ? 60000 : unit === 'h' ? 3600000 : 86400000;
  return n * mul;
}
async function findMatching(rows: RefreshToken[], plain: string) {
  for (const r of rows) {
    if (await bcrypt.compare(plain, r.tokenHash)) return r;
  }
  return null;
}
EOF

cat > apps/api/src/auth/auth.controller.ts << 'EOF'
import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { verifyTelegramAuth } from './telegram.util';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService, private jwt: JwtService) {}

  private cookieOpts() {
    const secure = process.env.COOKIE_SECURE === 'true';
    return { httpOnly: true, sameSite: 'lax' as const, secure, path: '/' };
  }

  @Get('csrf') csrf() { return { csrf: true }; }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email.toLowerCase(), dto.password);
  }

  @UseGuards(ThrottlerGuard) @Throttle(5, 300)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res) {
    const { access, refreshToken, refreshExpires, user } = await this.auth.login(dto.email.toLowerCase(), dto.password);
    res.cookie('access_token', access, { ...this.cookieOpts(), maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...this.cookieOpts(), maxAge: refreshExpires.getTime() - Date.now() });
    return { user };
  }

  @Post('refresh')
  async refresh(@Req() req, @Res({ passthrough: true }) res) {
    const payload = tryDecode(this.jwt, req.cookies?.access_token);
    const userId = payload?.sub || req.body?.userId;
    const rt = req.cookies?.refresh_token;
    if (!userId || !rt) return res.status(401).json({ message: 'No refresh' });
    const { access, refreshToken, refreshExpires } = await this.auth.refresh(userId, rt);
    res.cookie('access_token', access, { ...this.cookieOpts(), maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...this.cookieOpts(), maxAge: refreshExpires.getTime() - Date.now() });
    return { refreshed: true };
  }

  @Post('logout')
  async logout(@Req() req, @Res({ passthrough: true }) res) {
    const payload = tryDecode(this.jwt, req.cookies?.access_token);
    const userId = payload?.sub;
    const rt = req.cookies?.refresh_token;
    if (userId) await this.auth.logout(userId, rt);
    res.clearCookie('access_token', this.cookieOpts());
    res.clearCookie('refresh_token', this.cookieOpts());
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req) {
    return { userId: req.user.sub, email: req.user.email };
  }

  @Post('telegram/callback')
  async telegram(@Body() body: any, @Res({ passthrough: true }) res) {
    if (process.env.TELEGRAM_LOGIN_ENABLED !== 'true') {
      return res.status(404).json({ message: 'Telegram login disabled' });
    }
    const payload = typeof body.payload === 'string' ? JSON.parse(body.payload) : body;
    const valid = verifyTelegramAuth(payload, process.env.TELEGRAM_BOT_TOKEN!);
    if (!valid) return res.status(401).json({ message: 'Invalid telegram auth' });

    const email = `tg_${payload.id}@telegram.local`;
    // upsert пользователя
    let user = await this.auth['users'].findByEmail(email);
    if (!user) user = await this.auth['users'].create({ email, passwordHash: 'telegram', telegramId: payload.id });

    const access = this['auth']['signAccess']({ id: user.id, email: user.email });
    const { plain: refreshToken, expires: refreshExpires } = await this['auth']['issueRefresh'](user.id);

    res.cookie('access_token', access, { ...this.cookieOpts(), maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...this.cookieOpts(), maxAge: refreshExpires.getTime() - Date.now() });
    return { user: { id: user.id, email: user.email } };
  }
}

function tryDecode(jwt: JwtService, token?: string) {
  try { if (!token) return null; return jwt.verify(token, { secret: process.env.JWT_ACCESS_SECRET }); }
  catch { return null; }
}
EOF

cat > apps/api/src/auth/auth.module.ts << 'EOF'
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
EOF

cat > apps/api/migrations/1700000000000-init.ts << 'EOF'
import { MigrationInterface, QueryRunner } from "typeorm";

export class init1700000000000 implements MigrationInterface {
  name = 'init1700000000000'
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS citext;`);
    await q.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    await q.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email citext UNIQUE NOT NULL,
        password_hash text NOT NULL,
        telegram_id text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await q.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash text UNIQUE NOT NULL,
        expires_at timestamptz NOT NULL,
        revoked boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_refresh_user_id ON refresh_tokens(user_id);`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_refresh_expires_at ON refresh_tokens(expires_at);`);
  }
  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS refresh_tokens;`);
    await q.query(`DROP TABLE IF EXISTS users;`);
  }
}
EOF

echo "==> Frontend (Next.js)"
mkdir -p apps/web/src/{app,lib}

cat > apps/web/package.json << 'EOF'
{
  "name": "@station-eden/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.10",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^20.14.9",
    "@types/react": "^18.3.3",
    "typescript": "^5.5.4"
  }
}
EOF

cat > apps/web/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "es2022",
    "lib": ["dom", "es2022"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "strict": true,
    "noEmit": true
  },
  "include": ["src"]
}
EOF

cat > apps/web/next.config.mjs << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: '2mb' } }
};
export default nextConfig;
EOF

cat > apps/web/.env.local << 'EOF'
NEXT_PUBLIC_API_BASE=http://localhost:4000
NEXT_PUBLIC_ENABLE_TELEGRAM=false
NEXT_PUBLIC_TELEGRAM_BOT_NAME=@your_bot
EOF

# Next middleware должен лежать в корне пакета web
cat > apps/web/middleware.ts << 'EOF'
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = { matcher: ['/profile'] };

export async function middleware(req: NextRequest) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE!;
    const res = await fetch(apiBase + '/auth/me', {
      headers: { cookie: req.headers.get('cookie') || '' },
      credentials: 'include'
    });
    if (res.ok) return NextResponse.next();
  } catch {}
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', '/profile');
  return NextResponse.redirect(url);
}
EOF

mkdir -p apps/web/src/app
cat > apps/web/src/app/layout.tsx << 'EOF'
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body style={{ fontFamily: 'ui-sans-serif, system-ui', maxWidth: 520, margin: '40px auto', padding: 16 }}>
        <h1>Station Eden</h1>
        {children}
      </body>
    </html>
  );
}
EOF

cat > apps/web/src/app/globals.css << 'EOF'
:root { color-scheme: light dark; }
body { line-height: 1.4; }
input, button { font: inherit; padding: .5rem .6rem; }
button { cursor: pointer; }
EOF

cat > apps/web/src/app/register/page.tsx << 'EOF'
'use client';
import { useState } from 'react';
import { api } from '@/src/lib/api';
import Link from 'next/link';

export default function RegisterPage() {
  const [email,setEmail]=useState(''); const [password,setPassword]=useState('');
  const [error,setError]=useState<string|null>(null); const [ok,setOk]=useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.register(email, password);
      setOk(true);
    } catch (err:any) { setError(err.message || 'Ошибка'); }
  }

  return (
    <div>
      <h2>Регистрация</h2>
      <form onSubmit={onSubmit} style={{ display:'grid', gap:8 }}>
        <input required type="email" placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input required type="password" placeholder="пароль (≥8)" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} />
        <button type="submit">Создать аккаунт</button>
      </form>
      {ok && <p>Готово! Теперь <Link href="/login">войдите</Link>.</p>}
      {error && <p style={{color:'crimson'}}>{error}</p>}
      <p><Link href="/login">У меня есть аккаунт</Link></p>
    </div>
  );
}
EOF

cat > apps/web/src/app/login/page.tsx << 'EOF'
'use client';
import { useState } from 'react';
import { api } from '@/src/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [email,setEmail]=useState(''); const [password,setPassword]=useState('');
  const [error,setError]=useState<string|null>(null);
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/profile';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.login(email, password);
      router.replace(next);
    } catch (err:any) {
      setError(err.message || 'Ошибка входа');
    }
  }

  const tgEnabled = process.env.NEXT_PUBLIC_ENABLE_TELEGRAM === 'true';

  return (
    <div>
      <h2>Вход</h2>
      <form onSubmit={onSubmit} style={{ display:'grid', gap:8 }}>
        <input required type="email" placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input required type="password" placeholder="пароль" value={password} onChange={e=>setPassword(e.target.value)} />
        <button type="submit">Войти</button>
      </form>
      {error && <p style={{color:'crimson'}}>{error}</p>}
      <p>Нет аккаунта? <a href="/register">Зарегистрироваться</a></p>

      {tgEnabled && (
        <>
          <hr/>
          <p>Или войти через Telegram (см. backend /auth/telegram/callback)</p>
          {/* В проде лучше отдельная страница колбэка */}
        </>
      )}
    </div>
  );
}
EOF

cat > apps/web/src/app/profile/page.tsx << 'EOF'
'use client';
import { useEffect, useState } from 'react';
import { api } from '@/src/lib/api';

export default function ProfilePage() {
  const [me,setMe]=useState<any>(null);
  const [err,setErr]=useState<string|null>(null);
  useEffect(()=>{
    api.me().then(r => setMe((r as any).data)).catch(async _ => {
      try { await api.refresh(); const r = await api.me(); setMe((r as any).data); }
      catch(e:any){ setErr('Не авторизован'); }
    });
  },[]);
  return (
    <div>
      <h2>Профиль</h2>
      {me ? <pre>{JSON.stringify(me,null,2)}</pre> : <p>{err || 'Загрузка...'}</p>}
      <button onClick={async ()=>{ await api.logout(); location.href='/login'; }}>Выйти</button>
    </div>
  );
}
EOF

mkdir -p apps/web/src/lib
cat > apps/web/src/lib/api.ts << 'EOF'
const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  return document.cookie.split('; ').find(c => c.startsWith(name + '='))?.split('=')[1] ?? null;
}

async function fetchJSON<T>(path: string, init?: RequestInit & { csrf?: boolean }) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (init?.csrf) {
    const token = getCookie('csrf_token');
    if (token) headers['x-csrf-token'] = token;
  }
  const res = await fetch(`${API}${path}`, { ...init, headers, credentials: 'include' });
  if (!res.ok) {
    const msg = await res.text().catch(()=>'');
    throw new Error(msg || \`HTTP \${res.status}\`);
  }
  return res.json() as Promise<T>;
}

export async function ensureCsrf() {
  await fetchJSON('/auth/csrf', { method: 'GET' });
}

export const api = {
  register: async (email: string, password: string) => {
    await ensureCsrf();
    return fetchJSON('/auth/register', { method: 'POST', csrf: true, body: JSON.stringify({ email, password }) });
  },
  login: async (email: string, password: string) => {
    await ensureCsrf();
    return fetchJSON('/auth/login', { method: 'POST', csrf: true, body: JSON.stringify({ email, password }) });
  },
  me: async () => fetchJSON('/auth/me', { method: 'GET' }),
  refresh: async () => fetchJSON('/auth/refresh', { method: 'POST', csrf: true, body: '{}' }),
  logout: async () => fetchJSON('/auth/logout', { method: 'POST', csrf: true, body: '{}' }),
};
EOF

echo "==> Готово писать файлы. Устанавливаю зависимости..."
pnpm install

echo "==> Поднимаю Postgres через Docker"
docker compose up -d

echo "==> Копирую общий .env"
cp -f .env.example .env

echo "==> Применяю миграции к БД"
pnpm migrate:run

echo
echo "=============================================="
echo "  Всё собрано! Запускаю dev-сервера:"
echo "  - API:    http://localhost:4000"
echo "  - WEB:    http://localhost:3000"
echo "=============================================="
echo
pnpm dev
