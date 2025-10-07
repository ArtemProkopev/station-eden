import { IsString } from 'class-validator'

export class LoginDto {
	// Email ИЛИ username (общий идентификатор)
	@IsString()
	login!: string

	@IsString()
	password!: string
}
