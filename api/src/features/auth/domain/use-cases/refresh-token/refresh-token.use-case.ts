import { Injectable, Inject } from '@nestjs/common';
import { UnauthorizedError } from '@shared/errors';
import { IUserRepository, USER_REPOSITORY } from '../../ports/user-repository.port';
import { ITokenService, TOKEN_SERVICE } from '../../ports/token-service.port';
import { RefreshTokenInput, RefreshTokenOutput } from './refresh-token.dto';

/**
 * RefreshTokenUseCase - Generar nuevo access token
 *
 * Proceso:
 * 1. Verificar refresh token (decodificar)
 * 2. Buscar usuario
 * 3. Verificar que está activo
 * 4. Generar nuevos tokens
 * 5. Retornar tokens
 *
 * Caso de uso: El access token expiró (24h)
 * pero el refresh token aún es válido (7d)
 * Permite al cliente obtener nuevo access token sin re-loguear
 */
@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: RefreshTokenInput): Promise<RefreshTokenOutput> {
    // 1. Verificar refresh token
    let payload;
    try {
      payload = await this.tokenService.verifyRefreshToken(input.refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // 2. Buscar usuario
    const user = await this.userRepository.findById(payload.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive');
    }

    // 3. Generar nuevos tokens
    const accessToken = await this.tokenService.generateAccessToken(user);
    const refreshToken = await this.tokenService.generateRefreshToken(user);

    // 4. Retornar
    return {
      accessToken,
      refreshToken,
    };
  }
}