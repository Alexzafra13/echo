import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_CHANGE_PASSWORD_KEY } from '../decorators/allow-change-password.decorator';

/**
 * MustChangePasswordGuard - Bloquea acceso si usuario debe cambiar contraseña
 * 
 * Flujo:
 * 1. Verifica si el usuario está autenticado
 * 2. Verifica si tiene mustChangePassword = true
 * 3. Si es true, solo permite acceder a rutas marcadas con @AllowChangePassword
 * 4. Bloquea todo lo demás con 403
 */
@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Si no hay usuario autenticado, dejar pasar
    // (JwtAuthGuard se encargará de bloquearlo)
    if (!user) {
      return true;
    }

    // Verificar si la ruta está marcada como permitida
    const allowChangePassword = this.reflector.getAllAndOverride<boolean>(
      ALLOW_CHANGE_PASSWORD_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si la ruta está permitida, dejar pasar
    if (allowChangePassword) {
      return true;
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

    return true;
  }
}