// apps/api/src/voice/voice.controller.ts
import {
	BadRequestException,
	Controller,
	Get,
	Query,
	Req,
	UseGuards,
} from '@nestjs/common'
import type { Request } from 'express'
import { VoiceGuard } from './voice.guard'
import { VoiceService } from './voice.service'

@Controller('voice')
export class VoiceController {
	constructor(private readonly voiceService: VoiceService) {}

	@Get('token')
	@UseGuards(VoiceGuard)
	async getToken(@Query('lobbyId') lobbyId: string, @Req() req: Request) {
		if (!lobbyId) throw new BadRequestException('lobbyId обязателен')

		const user: any = (req as any).user
		const data = await this.voiceService.createToken(lobbyId, user)

		return {
			ok: true,
			data, // { token, roomName, url, identity }
		}
	}
}
