import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Bloquea acceso si mustChangePassword=true. Permite rutas con @AllowChangePassword.
@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Sin usuario autenticado → JwtAuthGuard se encarga
    if (!user) {
      return true;
    }

    const allowChangePassword = this.reflector.getAllAndOverride<boolean>(
      'allowChangePassword',
      [context.getHandler(), context.getClass()],
    );

    if (allowChangePassword) {
      return true;
    }

    if (user.mustChangePassword) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'You must change your password before accessing the system',
        error: 'MustChangePassword',
        mustChangePassword: true,
      });
    }

    return true;
  }
}
