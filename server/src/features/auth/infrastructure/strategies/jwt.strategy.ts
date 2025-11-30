import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { TokenPayload } from '../../domain/ports/token-service.port';
import { DrizzleUserRepository } from '../persistence/user.repository';
import { UserProps } from '../../domain/entities/user.entity';

/**
 * JwtStrategy - Estrategia de Passport para validar JWT
 *
 * Se usa en Guards para validar que el token sea válido
 * y extraer el usuario del token
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly userRepository: DrizzleUserRepository) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
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