import { LoginSchema } from '@station-eden/shared'
import { createZodDto } from 'nestjs-zod'

export class LoginDto extends createZodDto(LoginSchema) {}
