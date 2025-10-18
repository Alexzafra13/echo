import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../domain/entities/user.entity';
import { ITokenService, TokenPayload } from '../../domain/ports/token-service.port';

/**
 * JwtAdapter - Implementa ITokenService con NestJS JWT
 */
@Injectable()
export class JwtAdapter implements ITokenService {
  constructor(private readonly jwtService: JwtService) {}

  async generateAccessToken(user: User): Promise<string> {
    const payload: any = {
      userId: user.id,
      username: user.username,
    };

    return this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_EXPIRATION || '24h',
    } as any);
  }

  async generateRefreshToken(user: User): Promise<string> {
    const payload: any = {
      userId: user.id,
      username: user.username,
    };

    return this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
      secret: process.env.JWT_REFRESH_SECRET,
    } as any);
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    return this.jwtService.verify(token);
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    return this.jwtService.verify(token, {
      secret: process.env.JWT_REFRESH_SECRET,
    } as any);
  }
}