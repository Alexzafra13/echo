import { User } from '../../domain/entities/user.entity';

/**
 * UserMapper - Convierte entre capas
 *
 * Prisma User ↔ Domain User
 */
export class UserMapper {
  /**
   * Convierte Prisma User a Domain User
   * Se usa cuando traes datos de BD
   */
  static toDomain(raw: any): User {
    return User.reconstruct({
      id: raw.id,
      username: raw.username,
      email: raw.email,
      passwordHash: raw.password_hash,
      name: raw.name || undefined,
      isActive: raw.is_active,
      isAdmin: raw.is_admin,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    });
  }

  /**
   * Convierte Domain User a formato Prisma
   * Se usa cuando guardas en BD
   */
  static toPersistence(user: User) {
    const primitives = user.toPrimitives();
    return {
      id: primitives.id,
      username: primitives.username,
      email: primitives.email,
      password_hash: primitives.passwordHash,
      name: primitives.name || null,
      is_active: primitives.isActive,
      is_admin: primitives.isAdmin,
      theme: 'dark',
      language: 'es',
      created_at: primitives.createdAt,
      updated_at: primitives.updatedAt,
    };
  }
}