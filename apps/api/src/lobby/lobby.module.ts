import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { LobbyGateway } from './lobby.gateway'

@Module({
	imports: [JwtModule.register({})],
	providers: [LobbyGateway],
})
export class LobbyModule {}
