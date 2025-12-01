import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { TokenPayload } from '../../domain/ports/token-service.port';
import { DrizzleUserRepository } from '../persistence/user.repository';
import { UserProps } from '../../domain/entities/user.entity';
import { SecuritySecretsService } from '@config/security-secrets.service';

/**
 * JwtStrategy - Estrategia de Passport para validar JWT
 *
 * Se usa en Guards para validar que el token sea válido
 * y extraer el usuario del token
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
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
