import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '@shared/decorators/public.decorator';
import type { JwtUser } from '@shared/types/request.types';

/**
 * JwtAuthGuard - Guard para autenticación JWT
 *
 * Funcionalidad:
 * - Valida tokens JWT en peticiones protegidas
 * - Permite rutas públicas con @Public() decorator
 * - Inyecta el usuario autenticado en request.user
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Verificar si la ruta está marcada como pública
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si es pública, permitir acceso sin autenticación
    if (isPublic) {
      return true;
    }

    // Si NO es pública, validar JWT con Passport
    return super.canActivate(context);
  }

  handleRequest<TUser = JwtUser>(
    err: Error | null,
    user: TUser | false,
    info: Error | undefined,
  ): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}