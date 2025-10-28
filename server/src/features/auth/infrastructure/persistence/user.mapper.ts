import { User } from '../../domain/entities/user.entity';

export class UserMapper {
  static toDomain(raw: any): User {
    return User.reconstruct({
      id: raw.id,
      username: raw.username,
      email: raw.email || undefined,
      passwordHash: raw.passwordHash,
      name: raw.name || undefined,
      isActive: raw.isActive,
      isAdmin: raw.isAdmin,
      theme: raw.theme,
      language: raw.language,
      mustChangePassword: raw.mustChangePassword, 
      lastLoginAt: raw.lastLoginAt || undefined,
      lastAccessAt: raw.lastAccessAt || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(user: User) {
    const primitives = user.toPrimitives();
    return {
      id: primitives.id,
      username: primitives.username,
      email: primitives.email || null,
      password_hash: primitives.passwordHash,
      name: primitives.name || null,
      is_active: primitives.isActive,
      is_admin: primitives.isAdmin,
      theme: primitives.theme,
      language: primitives.language,
      must_change_password: primitives.mustChangePassword, 
      last_login_at: primitives.lastLoginAt || null,
      last_access_at: primitives.lastAccessAt || null,
      created_at: primitives.createdAt,
      updated_at: primitives.updatedAt,
    };
  }
}