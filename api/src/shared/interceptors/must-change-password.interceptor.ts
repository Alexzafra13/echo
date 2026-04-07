import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

/**
 * MustChangePasswordInterceptor - Bloquea acceso si usuario debe cambiar contraseña
 *
 * Este interceptor reemplaza al MustChangePasswordGuard porque los interceptores
 * se ejecutan DESPUÉS de los guards, garantizando que el usuario ya esté
 * autenticado cuando verificamos mustChangePassword.
 *
 * Flujo:
 * 1. Guard JWT autentica al usuario (request.user ya existe)
 * 2. Este interceptor verifica si tiene mustChangePassword = true
 * 3. Si es true, solo permite acceder a rutas marcadas con @AllowChangePassword
 * 4. Bloquea todo lo demás con 403
 */
@Injectable()
export class MustChangePasswordInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Si no hay usuario autenticado, dejar pasar
    // (es una ruta pública o JwtAuthGuard ya la manejó)
    if (!user) {
      return next.handle();
    }

    // Verificar si la ruta está marcada como permitida para cambio de contraseña
    const allowChangePassword = this.reflector.getAllAndOverride<boolean>('allowChangePassword', [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si la ruta está permitida, dejar pasar
    if (allowChangePassword) {
      return next.handle();
    }

    // Si debe cambiar contraseña, bloquear con mensaje claro
    if (user.mustChangePassword) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'You must change your password before accessing the system',
        error: 'MustChangePassword',
        mustChangePassword: true, // Flag para el frontend
      });
    }

    return next.handle();
  }
}
