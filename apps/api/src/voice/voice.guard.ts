// apps/api/src/voice/voice.guard.ts
import { Injectable } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'

/**
 * Guard для голосового чата:
 * просто использует стандартный JwtAuthGuard, чтобы:
 *  - проверить access_token
 *  - положить payload в req.user
 */
@Injectable()
export class VoiceGuard extends JwtAuthGuard {}
