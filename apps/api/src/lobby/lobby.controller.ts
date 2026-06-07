import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Post,
	Request,
	UseGuards,
} from '@nestjs/common'
import { CreateLobbySchema } from '@station-eden/shared'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface'
import { LobbyGateway } from './lobby.gateway'

@Controller('lobbies')
export class LobbyController {
	constructor(private readonly lobbyGateway: LobbyGateway) {}

	@Post()
	@UseGuards(JwtAuthGuard)
	async createLobby(
		@Request() req: AuthenticatedRequest,
		@Body() body: unknown,
	) {
		if (!req.user?.sub) {
			throw new BadRequestException('Пользователь не найден')
		}

		const parsed = CreateLobbySchema.safeParse(body)

		if (!parsed.success) {
			throw new BadRequestException('Некорректные параметры лобби')
		}

		return this.lobbyGateway.createLobbyFromRequest({
			creatorId: req.user.sub,
			creatorName: req.user.username || 'Игрок',
			...parsed.data,
		})
	}

	@Get('open')
	@UseGuards(JwtAuthGuard)
	getOpenLobbies() {
		return this.lobbyGateway.getOpenLobbies()
	}
}
