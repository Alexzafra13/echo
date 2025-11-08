import { Injectable, Inject } from '@nestjs/common';
import { USER_REPOSITORY, IUserRepository } from '@features/auth/domain/ports';
import { ListUsersInput, ListUsersOutput } from './list-users.dto';

/**
 * ListUsersUseCase - Lista todos los usuarios con paginación
 *
 * Ahora usa IUserRepository (port) en lugar de PrismaService directamente
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

    // Mapear entidades del domain a DTOs
    const users = usersEntities.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
      avatarPath: user.avatarPath,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    }));

    return { users, total };
  }
}