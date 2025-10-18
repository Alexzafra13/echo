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
    email: raw.email || undefined,
    passwordHash: raw.passwordHash,  // ← Prisma devuelve camelCase
    name: raw.name || undefined,
    isActive: raw.isActive,
    isAdmin: raw.isAdmin,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
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