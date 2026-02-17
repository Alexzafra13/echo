import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions, JwtVerifyOptions } from '@nestjs/jwt';
import { User } from '../../domain/entities/user.entity';
import { ITokenService, TokenPayload } from '../../domain/ports/token-service.port';
import { SecuritySecretsService } from '@config/security-secrets.service';

type ExpiresIn = JwtSignOptions['expiresIn'];
@Injectable()
export class JwtAdapter implements ITokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly secretsService: SecuritySecretsService,
  ) {}

  async generateAccessToken(user: User): Promise<string> {
    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
    };

    const options: JwtSignOptions = {
      expiresIn: '24h' as ExpiresIn,
    };

    return this.jwtService.sign(payload, options);
  }

  async generateRefreshToken(user: User): Promise<string> {
    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
    };

    const options: JwtSignOptions = {
      expiresIn: '7d' as ExpiresIn,
      secret: this.secretsService.jwtRefreshSecret,
    };

    return this.jwtService.sign(payload, options);
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    return this.jwtService.verify<TokenPayload>(token);
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    const options: JwtVerifyOptions = {
      secret: this.secretsService.jwtRefreshSecret,
    };

    return this.jwtService.verify<TokenPayload>(token, options);
  }
}
