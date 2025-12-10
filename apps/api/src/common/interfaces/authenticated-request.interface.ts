// apps/api/src/common/interfaces/authenticated-request.interface.ts
import { Request } from 'express'

export interface AuthenticatedRequest extends Request {
	user?: {
		sub: string
		email: string
		role?: string
		username?: string
	}
}
