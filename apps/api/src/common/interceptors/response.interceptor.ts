import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

function isSerializable(value: unknown): boolean {
  try { JSON.stringify(value); return true; }
  catch { return false; }
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (isSerializable(data)) return { ok: true, data };
        return { ok: true };
      })
    );
  }
}
