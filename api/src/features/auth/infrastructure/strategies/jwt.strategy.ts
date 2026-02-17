import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { FastifyRequest } from 'fastify';
import { TokenPayload } from '../../domain/ports/token-service.port';
import { DrizzleUserRepository } from '../persistence/user.repository';
import { UserProps } from '../../domain/entities/user.entity';
import { SecuritySecretsService } from '@config/security-secrets.service';
import { TokenBlacklistService } from '../services/token-blacklist.service';

export interface UserPropsWithToken extends UserProps {
  rawToken?: string;
  tokenExp?: number;
}

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
      passReqToCallback: true,
    };
    super(options);
  }

  async validate(req: FastifyRequest, payload: TokenPayload): Promise<UserPropsWithToken | null> {
    const authHeader = req.headers.authorization;
    const rawToken = authHeader?.replace('Bearer ', '');

    if (rawToken && await this.tokenBlacklist.isBlacklisted(rawToken)) {
      return null;
    }

    const user = await this.userRepository.findById(payload.userId);

    if (!user || !user.isActive) {
      return null;
    }

    return {
      ...user.toPrimitives(),
      rawToken,
      tokenExp: payload.exp,
    };
  }
}
