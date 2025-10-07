import {
	IsEmail,
	IsString,
	Matches,
	MaxLength,
	MinLength,
} from 'class-validator'

export class RegisterDto {
	@IsEmail()
	email!: string

	// username: 3–20, латиница/цифры/подчёркивание
	@IsString()
	@Matches(/^[a-zA-Z0-9_]{3,20}$/, {
		message: 'Username: 3–20 символов, латиница/цифры/_',
	})
	username!: string

	@IsString()
	@MinLength(8)
	@MaxLength(72)
	password!: string
}
