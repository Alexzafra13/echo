import { Injectable, Inject } from '@nestjs/common';
import {
  USER_REPOSITORY,
  IUserRepository,
  PASSWORD_SERVICE,
  IPasswordService,
} from '@features/auth/domain/ports';
import {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
} from '@shared/errors';
import { ChangePasswordInput } from './change-password.dto';

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_SERVICE)
    private readonly passwordService: IPasswordService,
  ) {}

  async execute(input: ChangePasswordInput): Promise<void> {
    // 1. Validar nueva contraseña
    if (!input.newPassword || input.newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    // 2. Buscar usuario
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User', input.userId);
    }

    // 3. Verificar contraseña actual
    const isValidCurrent = await this.passwordService.compare(
      input.currentPassword,
      user.passwordHash,
    );
    if (!isValidCurrent) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // 4. Verificar que nueva contraseña sea diferente
    const isSamePassword = await this.passwordService.compare(
      input.newPassword,
      user.passwordHash,
    );
    if (isSamePassword) {
      throw new ValidationError('New password must be different from current password');
    }

    // 5. Hash de nueva contraseña
    const newPasswordHash = await this.passwordService.hash(input.newPassword);

    // 6. Actualizar contraseña
    await this.userRepository.updatePassword(user.id, newPasswordHash);
    
    // 7. Si era primer login, quitar el flag
    if (user.mustChangePassword) {
      await this.userRepository.updatePartial(user.id, {
        mustChangePassword: false,
      });
    }
  }
}