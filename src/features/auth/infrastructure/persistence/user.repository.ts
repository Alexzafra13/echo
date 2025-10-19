// src/features/auth/infrastructure/persistence/user.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { User } from '../../domain/entities/user.entity';
import { 
  IUserRepository, 
  UserUpdateableFields 
} from '../../domain/ports/user-repository.port';
import { UserMapper } from './user.mapper';


@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    return user ? UserMapper.toDomain(user) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });
    return user ? UserMapper.toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findFirst({
      where: { email },
    });
    return user ? UserMapper.toDomain(user) : null;
  }

  async create(user: User): Promise<User> {
    const primitives = user.toPrimitives();

    const created = await this.prisma.user.create({
      data: {
        id: primitives.id,
        username: primitives.username,
        email: primitives.email || null,
        passwordHash: primitives.passwordHash,
        name: primitives.name || null,
        isActive: primitives.isActive,
        isAdmin: primitives.isAdmin,
        theme: primitives.theme,
        language: primitives.language,
        lastLoginAt: null,
        lastAccessAt: null,
        createdAt: primitives.createdAt,
        updatedAt: primitives.updatedAt,
      },
    });

    return UserMapper.toDomain(created);
  }

  /**
   * Actualiza SOLO los campos proporcionados
   * Siempre actualiza updatedAt automáticamente
   */
  async updatePartial(
    id: string,
    data: Partial<UserUpdateableFields>,
  ): Promise<User> {
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(), // Siempre actualiza updatedAt
      },
    });

    return UserMapper.toDomain(updated);
  }

  /**
   * Actualiza SOLO la contraseña
   * Método separado para operaciones sensibles
   */
  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Actualiza SOLO el estado de admin
   * Método separado para operaciones sensibles
   */
  async updateAdminStatus(userId: string, isAdmin: boolean): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isAdmin,
        updatedAt: new Date(),
      },
    });
  }
}