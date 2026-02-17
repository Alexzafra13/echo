import { Injectable, Inject } from '@nestjs/common';
import {
  USER_REPOSITORY,
  IUserRepository,
  PASSWORD_SERVICE,
  IPasswordService,
} from '@features/auth/domain/ports';
import { NotFoundError, ForbiddenError } from '@shared/errors';
import { PasswordUtil } from '@shared/utils/password.util';
import { LogService, LogCategory } from '@features/logs/application/log.service';
import { ResetUserPasswordInput, ResetUserPasswordOutput } from './reset-user-password.dto';

@Injectable()
export class ResetUserPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_SERVICE)
    private readonly passwordService: IPasswordService,
    private readonly logService: LogService,
  ) {}

  async execute(input: ResetUserPasswordInput): Promise<ResetUserPasswordOutput> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (input.adminId && input.userId === input.adminId) {
      throw new ForbiddenError('No puedes resetear tu propia contraseña desde el panel de admin. Usa la opción de cambio de contraseña en tu perfil.');
    }

    const temporaryPassword = PasswordUtil.generateTemporaryPassword();
    const passwordHash = await this.passwordService.hash(temporaryPassword);

    await this.userRepository.updatePassword(input.userId, passwordHash);
    await this.userRepository.updatePartial(input.userId, {
      mustChangePassword: true,
    });

    await this.logService.info(
      LogCategory.AUTH,
      `Password reset by admin: ${user.username}`,
      {
        userId: user.id,
        username: user.username,
        resetBy: input.adminId,
      },
    );

    return {
      temporaryPassword,
    };
  }
}
