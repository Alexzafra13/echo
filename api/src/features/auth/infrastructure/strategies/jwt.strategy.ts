import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { Request } from 'express';
import { TokenPayload } from '../../domain/ports/token-service.port';
import { DrizzleUserRepository } from '../persistence/user.repository';
import { UserProps } from '../../domain/entities/user.entity';
import { SecuritySecretsService } from '@config/security-secrets.service';
import { TokenBlacklistService } from '../services/token-blacklist.service';

// Extender UserProps con el token raw para logout
export interface UserPropsWithToken extends UserProps {
  rawToken?: string;
  tokenExp?: number;
}

// Passport strategy: valida JWT y extrae usuario
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly userRepository: DrizzleUserRepository,
    private readonly tokenBlacklist: TokenBlacklistService,
    secretsService: SecuritySecretsService,
  ) {
    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secretsService.jwtSecret,
      passReqToCallback: true, // Pasar request para extraer token raw
    };
    super(options);
  }

  async validate(req: Request, payload: TokenPayload): Promise<UserPropsWithToken | null> {
    // Extraer el token raw del header para poder invalidarlo en logout
    const authHeader = req.headers.authorization;
    const rawToken = authHeader?.replace('Bearer ', '');

    // Verificar si el token está en la blacklist (usuario hizo logout)
    if (rawToken && await this.tokenBlacklist.isBlacklisted(rawToken)) {
      return null; // Token invalidado
    }

    const user = await this.userRepository.findById(payload.userId);

    if (!user || !user.isActive) {
      return null;
    }

    // Retornar usuario con token raw y exp para logout
    return {
      ...user.toPrimitives(),
      rawToken,
      tokenExp: payload.exp,
    };
  }
}
