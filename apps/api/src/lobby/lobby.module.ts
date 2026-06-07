// apps/api/src/lobby/lobby.module.ts
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { GameModule } from '../game/game.module'
import { LobbyController } from './lobby.controller'
import { LobbyGateway } from './lobby.gateway'

@Module({
	imports: [
		ConfigModule,
		JwtModule.registerAsync({
			imports: [ConfigModule],
			useFactory: (config: ConfigService) => ({
				secret:
					config.get<string>('JWT_ACCESS_SECRET') ||
					config.get<string>('JWT_SECRET'),
			}),
			inject: [ConfigService],
		}),
		GameModule,
	],
	controllers: [LobbyController],
	providers: [LobbyGateway],
})
export class LobbyModule {}
