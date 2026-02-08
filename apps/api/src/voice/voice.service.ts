// apps/api/src/voice/voice.service.ts
import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	Logger,
	UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AccessToken } from 'livekit-server-sdk'

interface VoiceUser {
	id?: string
	sub?: string
	email?: string
	username?: string
}

@Injectable()
export class VoiceService {
	private readonly logger = new Logger(VoiceService.name)

	private readonly apiKey: string
	private readonly apiSecret: string
	private readonly url?: string

	constructor(private readonly cfg: ConfigService) {
		this.apiKey =
			cfg.get<string>('LIVEKIT_API_KEY') ?? process.env.LIVEKIT_API_KEY ?? ''

		this.apiSecret =
			cfg.get<string>('LIVEKIT_API_SECRET') ??
			process.env.LIVEKIT_API_SECRET ??
			''

		this.url = cfg.get<string>('LIVEKIT_URL') ?? process.env.LIVEKIT_URL

		this.logger.log(
			`[LiveKit config] url=${this.url ?? 'NONE'} key=${
				this.apiKey ? 'SET' : 'EMPTY'
			} secret=${this.apiSecret ? 'SET' : 'EMPTY'}`
		)
	}

	async createToken(lobbyId: string, user: VoiceUser | undefined) {
		if (!lobbyId) throw new BadRequestException('lobbyId обязателен')
		if (!user) throw new UnauthorizedException('Пользователь не найден в запросе')

		if (!this.apiKey || !this.apiSecret || !this.url) {
			this.logger.error(
				`LiveKit env missing: url=${this.url ?? 'NONE'} apiKey=${
					this.apiKey ? 'SET' : 'EMPTY'
				} apiSecret=${this.apiSecret ? 'SET' : 'EMPTY'}`
			)
			throw new InternalServerErrorException(
				'LiveKit не настроен на сервере (проверь LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)'
			)
		}

		const identity = (user.id || user.sub || user.email || 'anonymous').toString()
		const name = user.username || user.email || identity
		const roomName = `lobby_${lobbyId}`

		try {
			const tokenBuilder = new AccessToken(this.apiKey, this.apiSecret, {
				identity,
				name,
			})

			tokenBuilder.addGrant({
				roomJoin: true,
				room: roomName,
				canPublish: true,
				canSubscribe: true,
			})

			// livekit-server-sdk чаще всего возвращает string синхронно,
			// но await безопасен даже если вдруг станет Promise.
			const token = await (tokenBuilder.toJwt() as any)

			this.logger.log(
				`[LiveKit] token generated identity=${identity} lobby=${lobbyId} room=${roomName} tokenLen=${token.length}`
			)

			return {
				token,
				roomName,
				url: this.url,
				identity,
			}
		} catch (e) {
			this.logger.error('Failed to create LiveKit token', e as any)
			throw new InternalServerErrorException('Не удалось создать токен LiveKit')
		}
	}
}
