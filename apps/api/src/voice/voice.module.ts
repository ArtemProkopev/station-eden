// apps/api/src/voice/voice.module.ts
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from '../auth/auth.module'
import { VoiceController } from './voice.controller'
import { VoiceGuard } from './voice.guard'
import { VoiceService } from './voice.service'

@Module({
	imports: [ConfigModule, AuthModule],
	controllers: [VoiceController],
	providers: [VoiceService, VoiceGuard],
})
export class VoiceModule {}
