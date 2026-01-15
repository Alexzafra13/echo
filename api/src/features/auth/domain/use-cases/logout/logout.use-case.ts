import { Injectable, Inject } from '@nestjs/common';
import {
  ITokenBlacklistService,
  TOKEN_BLACKLIST_SERVICE,
} from '../../ports';
import { LogService, LogCategory } from '@features/logs/application/log.service';
import { LogoutInput } from './logout.dto';

/**
 * LogoutUseCase - Invalida el token JWT del usuario
 *
 * Agrega el token actual a una blacklist para que no pueda ser usado
 * nuevamente, incluso si aún no ha expirado.
 */
@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(TOKEN_BLACKLIST_SERVICE)
    private readonly tokenBlacklist: ITokenBlacklistService,
    private readonly logService: LogService,
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    const { token, userId, username, tokenExp } = input;

    // Agregar token a la blacklist
    await this.tokenBlacklist.add(token, tokenExp);

    // Log del logout
    await this.logService.info(
      LogCategory.AUTH,
      `User logged out: ${username}`,
      {
        userId,
        username,
      },
    );
  }
}
