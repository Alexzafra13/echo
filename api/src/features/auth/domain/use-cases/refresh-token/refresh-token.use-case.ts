import { Injectable, Inject } from '@nestjs/common';
import { UnauthorizedError } from '@shared/errors';
import { IUserRepository, USER_REPOSITORY } from '../../ports/user-repository.port';
import { ITokenService, TOKEN_SERVICE } from '../../ports/token-service.port';
import { RefreshTokenInput, RefreshTokenOutput } from './refresh-token.dto';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: RefreshTokenInput): Promise<RefreshTokenOutput> {
    let payload;
    try {
      payload = await this.tokenService.verifyRefreshToken(input.refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const user = await this.userRepository.findById(payload.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive');
    }

    const accessToken = await this.tokenService.generateAccessToken(user);
    const refreshToken = await this.tokenService.generateRefreshToken(user);

    return {
      accessToken,
      refreshToken,
    };
  }
}
