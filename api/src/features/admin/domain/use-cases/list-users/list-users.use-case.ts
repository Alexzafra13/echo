import { Injectable, Inject } from '@nestjs/common';
import { USER_REPOSITORY, IUserRepository } from '@features/auth/domain/ports';
import { ListUsersInput, ListUsersOutput } from './list-users.dto';

/**
 * ListUsersUseCase - Lista todos los usuarios con paginación
 *
 * Usa IUserRepository (port) para acceso a datos
 * ✅ Arquitectura hexagonal correcta
 * ✅ Domain no depende de Infrastructure
 */
@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(input: ListUsersInput): Promise<ListUsersOutput> {
    const skip = input.skip || 0;
    const take = input.take || 20;

    // Obtener usuarios con paginación usando el repository
    const [usersEntities, total] = await Promise.all([
      this.userRepository.findAll(skip, take),
      this.userRepository.count(),
    ]);

    // Obtener todos los admins para identificar al primero (system admin)
    const allUsers = await this.userRepository.findAll(0, 1000);
    const adminUsers = allUsers.filter(u => u.isAdmin);
    const systemAdmin = adminUsers.length > 0
      ? adminUsers.reduce((oldest, current) =>
          current.createdAt < oldest.createdAt ? current : oldest
        )
      : null;

    // Mapear entidades del domain a DTOs
    const users = usersEntities.map((user) => ({
      id: user.id,
      username: user.username,
      name: user.name,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
      avatarPath: user.avatarPath,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      isSystemAdmin: systemAdmin ? user.id === systemAdmin.id : false,
    }));

    return { users, total };
  }
}