import { Injectable, Inject } from '@nestjs/common';
import {
  ITokenBlacklistService,
  TOKEN_BLACKLIST_SERVICE,
} from '../../ports';
import { LogService, LogCategory } from '@features/logs/application/log.service';
import { LogoutInput } from './logout.dto';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(TOKEN_BLACKLIST_SERVICE)
    private readonly tokenBlacklist: ITokenBlacklistService,
    private readonly logService: LogService,
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    const { token, userId, username, tokenExp } = input;

    await this.tokenBlacklist.add(token, tokenExp);

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
