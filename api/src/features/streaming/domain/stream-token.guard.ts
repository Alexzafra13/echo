import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { StreamTokenService } from '../infrastructure/services/stream-token.service';

/**
 * Guard to validate stream tokens from query parameters
 * Used for audio streaming endpoints where JWT headers aren't supported (HTML5 audio)
 */
@Injectable()
export class StreamTokenGuard implements CanActivate {
  constructor(private readonly streamTokenService: StreamTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Extract token from query parameter
    const token = request.query?.token;

    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Stream token is required');
    }

    // Validate token
    const userId = await this.streamTokenService.validateToken(token);

    if (!userId) {
      throw new UnauthorizedException('Invalid or expired stream token');
    }

    // Attach user info to request for use in controller
    request.user = { userId };

    return true;
  }
}
