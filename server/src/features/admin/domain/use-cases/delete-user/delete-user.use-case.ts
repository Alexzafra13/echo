import { Injectable, Inject } from '@nestjs/common';
import {
  USER_REPOSITORY,
  IUserRepository,
} from '@features/auth/domain/ports';
import { NotFoundError, ValidationError } from '@shared/errors';
import { DeleteUserInput, DeleteUserOutput } from './delete-user.dto';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(input: DeleteUserInput): Promise<DeleteUserOutput> {
    // 1. Verificar que el usuario existe
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 2. Prevenir eliminación del usuario actual si es el único admin
    if (user.isAdmin) {
      const allUsers = await this.userRepository.findAll(0, 1000);
      const adminCount = allUsers.filter(u => u.isAdmin && u.isActive).length;

      if (adminCount <= 1) {
        throw new ValidationError('Cannot delete the last admin user');
      }
    }

    // 3. Desactivar usuario (soft delete)
    await this.userRepository.updatePartial(input.userId, {
      isActive: false,
    });

    return {
      success: true,
    };
  }
}
