import { Injectable, Inject } from '@nestjs/common';
import { USER_REPOSITORY, IUserRepository } from '@features/auth/domain/ports';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { UserMapper } from '@features/auth/infrastructure/persistence/user.mapper';
import { ListUsersInput, ListUsersOutput } from './list-users.dto';

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: ListUsersInput): Promise<ListUsersOutput> {
    const skip = input.skip || 0;
    const take = input.take || 20;

    // Obtener usuarios con paginación
    const [usersRaw, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    const users = usersRaw.map((raw) => {
      const user = UserMapper.toDomain(raw);
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      };
    });

    return { users, total };
  }
}