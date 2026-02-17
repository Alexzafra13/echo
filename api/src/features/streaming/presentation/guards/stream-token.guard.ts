import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { UnauthorizedError } from '@shared/errors';
import { StreamTokenService } from '../../infrastructure/services/stream-token.service';

// Valida tokens de streaming desde headers (preferido) o query params (fallback)
@Injectable()
export class StreamTokenGuard implements CanActivate {
  constructor(private readonly streamTokenService: StreamTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const headerToken = request.headers?.['x-stream-token'];
    const queryToken = request.query?.token;
    const token = headerToken || queryToken;

    if (!token || typeof token !== 'string') {
      throw new UnauthorizedError('Token de streaming requerido');
    }

    const userId = await this.streamTokenService.validateToken(token);

    if (!userId) {
      throw new UnauthorizedError('Token de streaming inválido o expirado');
    }

    request.user = { userId };

    return true;
  }
}
