import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions, JwtVerifyOptions } from '@nestjs/jwt';
import { User } from '../../domain/entities/user.entity';
import { ITokenService, TokenPayload } from '../../domain/ports/token-service.port';

/**
 * JwtAdapter - Implementa ITokenService con NestJS JWT
 */
@Injectable()
export class JwtAdapter implements ITokenService {
  constructor(private readonly jwtService: JwtService) {}

  async generateAccessToken(user: User): Promise<string> {
    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
    };

    const options: JwtSignOptions = {
      expiresIn: process.env.JWT_EXPIRATION || '24h',
    };

    return this.jwtService.sign(payload, options);
  }

  async generateRefreshToken(user: User): Promise<string> {
    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
    };

    const options: JwtSignOptions = {
      expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
      secret: process.env.JWT_REFRESH_SECRET,
    };

    return this.jwtService.sign(payload, options);
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    return this.jwtService.verify<TokenPayload>(token);
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    const options: JwtVerifyOptions = {
      secret: process.env.JWT_REFRESH_SECRET,
    };

    return this.jwtService.verify<TokenPayload>(token, options);
  }
}