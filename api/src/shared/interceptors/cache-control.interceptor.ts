import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export const CACHE_TTL_KEY = 'cache_ttl';

// Decorador para añadir Cache-Control a las respuestas. Ej: @CacheControl(300)
export const CacheControl = (ttlSeconds: number = 60) => SetMetadata(CACHE_TTL_KEY, ttlSeconds);

// Interceptor que aplica el header Cache-Control si el endpoint usa @CacheControl()
@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ttl = this.reflector.get<number>(CACHE_TTL_KEY, context.getHandler());

    if (!ttl) {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      tap(() => {
        response.header('Cache-Control', `public, max-age=${ttl}`);
      })
    );
  }
}
