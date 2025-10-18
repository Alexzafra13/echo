// ===============================================
// 📁 src/features/auth/infrastructure/persistence/user.repository.ts
// ===============================================
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { User } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/ports/user-repository.port';
import { UserMapper } from './user.mapper';

/**
 * PrismaUserRepository - Implementación de IUserRepository con Prisma
 *
 * Implementa los métodos del port IUserRepository
 * Usa PrismaService para acceder a la BD
 * Usa UserMapper para convertir Prisma ↔ Domain
 */
@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca usuario por username
   */
  async findByUsername(username: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    return user ? UserMapper.toDomain(user) : null;
  }

  /**
   * Busca usuario por email
   */
  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findFirst({
      where: { email },
    });

    return user ? UserMapper.toDomain(user) : null;
  }

  /**
   * Busca usuario por ID
   */
  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    return user ? UserMapper.toDomain(user) : null;
  }

  /**
   * Crea nuevo usuario
   */
  async create(user: User): Promise<User> {
    const primitives = user.toPrimitives();

const created = await this.prisma.user.create({
  data: {
    id: primitives.id,
    username: primitives.username,
    email: primitives.email,
    passwordHash: primitives.passwordHash,
    name: primitives.name || null,
    isActive: primitives.isActive,       
    isAdmin: primitives.isAdmin,           
    theme: 'dark',
    language: 'es',
    createdAt: primitives.createdAt,       
    updatedAt: primitives.updatedAt,        
  },
});
    return UserMapper.toDomain(created);
  }
}