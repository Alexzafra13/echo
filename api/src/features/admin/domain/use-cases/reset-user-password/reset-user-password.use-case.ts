import { Injectable, Inject } from '@nestjs/common';
import {
  USER_REPOSITORY,
  IUserRepository,
  PASSWORD_SERVICE,
  IPasswordService,
} from '@features/auth/domain/ports';
import { NotFoundError } from '@shared/errors';
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
    // 1. Verificar que el usuario existe
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 2. Generar nueva contraseña temporal alfanumérica
    const temporaryPassword = PasswordUtil.generateTemporaryPassword();
    const passwordHash = await this.passwordService.hash(temporaryPassword);

    // 3. Actualizar contraseña y forzar cambio en próximo login
    await this.userRepository.updatePassword(input.userId, passwordHash);
    await this.userRepository.updatePartial(input.userId, {
      mustChangePassword: true,
    });

    // 4. Log password reset
    await this.logService.info(
      LogCategory.AUTH,
      `Password reset by admin: ${user.username}`,
      {
        userId: user.id,
        username: user.username,
        resetBy: input.adminId,
      },
    );

    // 5. Retornar contraseña temporal para que admin la comunique al usuario
    return {
      temporaryPassword,
    };
  }
}
