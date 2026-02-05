import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { UnauthorizedError } from '@shared/errors';
import { StreamTokenService } from '../../infrastructure/services/stream-token.service';

/**
 * Guard to validate stream tokens from headers (preferred) or query parameters (fallback)
 * Headers are preferred because query params are visible in logs, browser history and referrer headers
 */
@Injectable()
export class StreamTokenGuard implements CanActivate {
  constructor(private readonly streamTokenService: StreamTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Prefer token from header, fallback to query parameter for backwards compatibility
    const headerToken = request.headers?.['x-stream-token'];
    const queryToken = request.query?.token;
    const token = headerToken || queryToken;

    if (!token || typeof token !== 'string') {
      throw new UnauthorizedError('Token de streaming requerido');
    }

    // Validate token
    const userId = await this.streamTokenService.validateToken(token);

    if (!userId) {
      throw new UnauthorizedError('Token de streaming inválido o expirado');
    }

    // Attach user info to request for use in controller
    request.user = { userId };

    return true;
  }
}
