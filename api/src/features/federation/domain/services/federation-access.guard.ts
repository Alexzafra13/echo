import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { UnauthorizedError } from '@shared/errors';
import { FederationTokenService } from './federation-token.service';

/**
 * Guard that validates federation access tokens
 * Used to protect endpoints that expose library data to connected servers
 */
@Injectable()
export class FederationAccessGuard implements CanActivate {
  constructor(private readonly tokenService: FederationTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    // Get token from Authorization header or query parameter
    const authHeader = request.headers.authorization;
    const queryToken = (request.query as Record<string, string>)?.token;

    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (queryToken) {
      token = queryToken;
    }

    if (!token) {
      throw new UnauthorizedError('Federation access token required');
    }

    const accessToken = await this.tokenService.validateAccessToken(token);

    if (!accessToken) {
      throw new UnauthorizedError('Invalid or expired federation access token');
    }

    // Attach token info to request for use in controllers
    (request as any).federationAccessToken = accessToken;

    return true;
  }
}
