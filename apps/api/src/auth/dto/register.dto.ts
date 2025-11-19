import { RegisterSchema } from '@station-eden/shared'
import { createZodDto } from 'nestjs-zod'

export class RegisterDto extends createZodDto(RegisterSchema) {}
