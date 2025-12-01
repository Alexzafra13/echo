import { Injectable, Inject } from '@nestjs/common';
import {
  USER_REPOSITORY,
  IUserRepository,
} from '@features/auth/domain/ports';
import { NotFoundError, ValidationError } from '@shared/errors';
import { LogService, LogCategory } from '@features/logs/application/log.service';
import { DeleteUserInput, DeleteUserOutput } from './delete-user.dto';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly logService: LogService,
  ) {}

  async execute(input: DeleteUserInput): Promise<DeleteUserOutput> {
    // 1. Verificar que el usuario existe
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 2. Verificar si es el system admin (primer admin creado)
    const allUsers = await this.userRepository.findAll(0, 1000);
    const adminUsers = allUsers.filter(u => u.isAdmin);
    const systemAdmin = adminUsers.length > 0
      ? adminUsers.reduce((oldest, current) =>
          current.createdAt < oldest.createdAt ? current : oldest
        )
      : null;

    const isSystemAdmin = systemAdmin ? user.id === systemAdmin.id : false;

    // 3. No permitir eliminar al system admin
    if (isSystemAdmin) {
      throw new ValidationError('Cannot delete system administrator');
    }

    // 4. Prevenir eliminación del usuario actual si es el único admin
    if (user.isAdmin) {
      const adminCount = allUsers.filter(u => u.isAdmin && u.isActive).length;

      if (adminCount <= 1) {
        throw new ValidationError('Cannot delete the last admin user');
      }
    }

    // 5. Desactivar usuario (soft delete)
    await this.userRepository.updatePartial(input.userId, {
      isActive: false,
    });

    // 6. Log user deletion
    await this.logService.info(
      LogCategory.AUTH,
      `User deactivated by admin: ${user.username}`,
      {
        userId: user.id,
        username: user.username,
        deletedBy: input.adminId,
      },
    );

    return {
      success: true,
    };
  }
}
