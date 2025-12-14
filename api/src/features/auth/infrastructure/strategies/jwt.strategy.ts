import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { Request } from 'express';
import { TokenPayload } from '../../domain/ports/token-service.port';
import { DrizzleUserRepository } from '../persistence/user.repository';
import { UserProps } from '../../domain/entities/user.entity';
import { SecuritySecretsService } from '@config/security-secrets.service';

/**
 * Extract JWT from multiple sources:
 * 1. Authorization header (Bearer token) - primary method
 * 2. Query string 'token' parameter - for SSE/EventSource which can't send headers
 */
function extractJwtFromRequestOrQuery(req: Request): string | null {
  // First try Authorization header
  const fromHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (fromHeader) {
    return fromHeader;
  }

  // Fallback: try query string (for SSE connections)
  const fromQuery = req.query?.token;
  if (typeof fromQuery === 'string') {
    return fromQuery;
  }

  return null;
}

/**
 * JwtStrategy - Estrategia de Passport para validar JWT
 *
 * Se usa en Guards para validar que el token sea válido
 * y extraer el usuario del token
 *
 * Supports:
 * - Authorization: Bearer <token> header (primary)
 * - ?token=<token> query parameter (for SSE/EventSource)
 *
 * Uses SecuritySecretsService for auto-generated secrets (like Navidrome/Jellyfin)
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly userRepository: DrizzleUserRepository,
    secretsService: SecuritySecretsService,
  ) {
    const options: StrategyOptions = {
      jwtFromRequest: extractJwtFromRequestOrQuery,
      ignoreExpiration: false,
      secretOrKey: secretsService.jwtSecret,
    };
    super(options);
  }

  async validate(payload: TokenPayload): Promise<UserProps | null> {
    const user = await this.userRepository.findById(payload.userId);

    if (!user || !user.isActive) {
      return null;
    }

    return user.toPrimitives();
  }
}
