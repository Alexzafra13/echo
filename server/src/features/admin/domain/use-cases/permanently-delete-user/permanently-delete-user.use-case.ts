import { Injectable, Inject } from '@nestjs/common';
import {
  USER_REPOSITORY,
  IUserRepository,
} from '@features/auth/domain/ports';
import { NotFoundError, ValidationError } from '@shared/errors';
import {
  PermanentlyDeleteUserInput,
  PermanentlyDeleteUserOutput,
} from './permanently-delete-user.dto';

@Injectable()
export class PermanentlyDeleteUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    input: PermanentlyDeleteUserInput,
  ): Promise<PermanentlyDeleteUserOutput> {
    // 1. Verificar que el usuario existe
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 2. Prevenir eliminación del último admin activo
    if (user.isAdmin && user.isActive) {
      const allUsers = await this.userRepository.findAll(0, 1000);
      const activeAdminCount = allUsers.filter(
        (u) => u.isAdmin && u.isActive,
      ).length;

      if (activeAdminCount <= 1) {
        throw new ValidationError(
          'Cannot permanently delete the last active admin user',
        );
      }
    }

    // 3. Eliminar permanentemente (hard delete)
    await this.userRepository.delete(input.userId);

    return {
      success: true,
    };
  }
}
