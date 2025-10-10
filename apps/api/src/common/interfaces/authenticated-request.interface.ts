// apps/api/src/common/interfaces/authenticated-request.interface.ts
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role?: string;
  };
}