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

/**
 * Decorator to set Cache-Control headers on responses
 * @param ttlSeconds - Time to live in seconds (default: 60)
 */
export const CacheControl = (ttlSeconds: number = 60) =>
  SetMetadata(CACHE_TTL_KEY, ttlSeconds);

/**
 * Interceptor that adds Cache-Control headers to responses
 * Use with @CacheControl(seconds) decorator
 */
@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ttl = this.reflector.get<number>(CACHE_TTL_KEY, context.getHandler());

    if (!ttl) {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      tap(() => {
        // Only set cache headers for successful responses
        response.header('Cache-Control', `public, max-age=${ttl}`);
      }),
    );
  }
}
