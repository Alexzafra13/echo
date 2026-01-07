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
 * @CacheControl() - Decorador para configurar headers de caché HTTP
 *
 * Establece el header Cache-Control en las respuestas para permitir
 * que navegadores y proxies cacheen el contenido.
 *
 * @param ttlSeconds - Tiempo de vida en segundos (default: 60)
 *
 * @example
 * ```typescript
 * @Get('albums')
 * @CacheControl(300) // Cachear por 5 minutos
 * getAlbums() { ... }
 * ```
 */
export const CacheControl = (ttlSeconds: number = 60) =>
  SetMetadata(CACHE_TTL_KEY, ttlSeconds);

/**
 * CacheControlInterceptor - Interceptor que agrega headers Cache-Control
 *
 * Funcionalidad:
 * - Lee el TTL configurado con @CacheControl() decorator
 * - Agrega header "Cache-Control: public, max-age=TTL" a respuestas exitosas
 * - Si no hay @CacheControl(), no modifica la respuesta
 */
@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ttl = this.reflector.get<number>(CACHE_TTL_KEY, context.getHandler());

    // Sin @CacheControl(), no hacer nada
    if (!ttl) {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      tap(() => {
        // Solo agregar headers de caché en respuestas exitosas
        response.header('Cache-Control', `public, max-age=${ttl}`);
      }),
    );
  }
}
