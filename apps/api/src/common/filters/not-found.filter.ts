// apps/api/src/common/filters/not-found.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, NotFoundException } from '@nestjs/common'
import { Request, Response } from 'express'

@Catch(NotFoundException)
export class NotFoundExceptionFilter implements ExceptionFilter {
  catch(exception: NotFoundException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    const status = exception.getStatus()

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.message || 'Ресурс не найден',
    })
  }
}