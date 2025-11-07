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

  async findAll(skip: number, take: number): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
    return users.map(user => UserMapper.toDomain(user));
  }

  async count(): Promise<number> {
    return this.prisma.user.count();
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
        mustChangePassword: primitives.mustChangePassword,
        lastLoginAt: null,
        lastAccessAt: null,
        createdAt: primitives.createdAt,
        updatedAt: primitives.updatedAt,
      },
    });

    return UserMapper.toDomain(created);
  }

  async updatePartial(
    id: string,
    data: Partial<UserUpdateableFields>,
  ): Promise<User> {
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return UserMapper.toDomain(updated);
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      },
    });
  }

  async updateAdminStatus(userId: string, isAdmin: boolean): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isAdmin,
        updatedAt: new Date(),
      },
    });
  }

  async delete(userId: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id: userId },
    });
  }
}