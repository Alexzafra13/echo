import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { FastifyRequest } from 'fastify';
import { TokenPayload } from '../../domain/ports/token-service.port';
import { IUserRepository, USER_REPOSITORY } from '../../domain/ports';
import { UserProps } from '../../domain/entities/user.entity';
import { SecuritySecretsService } from '@config/security-secrets.service';
import { TokenBlacklistService } from '../services/token-blacklist.service';

export interface UserPropsWithToken extends Omit<UserProps, 'passwordHash'> {
  rawToken?: string;
  tokenJti?: string;
  tokenExp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    private readonly tokenBlacklist: TokenBlacklistService,
    secretsService: SecuritySecretsService
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

    if (await this.tokenBlacklist.isBlacklisted(payload.jti)) {
      return null;
    }

    const user = await this.userRepository.findById(payload.userId);

    if (!user || !user.isActive) {
      return null;
    }

    const { passwordHash: _passwordHash, ...userWithoutPassword } = user.toPrimitives();
    return {
      ...userWithoutPassword,
      rawToken,
      tokenJti: payload.jti,
      tokenExp: payload.exp,
    };
  }
}
