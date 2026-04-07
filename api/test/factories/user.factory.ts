import { User, UserProps } from '@features/auth/domain/entities/user.entity';

/**
 * Factory para crear instancias de User en tests
 * Elimina duplicación de código en +40 archivos de test
 *
 * Nota: El schema de usuarios NO tiene campo email (diseño similar a Navidrome/Jellyfin)
 */
export class UserFactory {
  /**
   * Crea un usuario de test con valores por defecto
   * @param overrides Propiedades a sobrescribir
   */
  static create(overrides?: Partial<UserProps>): User {
    return User.reconstruct({
      id: 'user-123',
      username: 'testuser',
      passwordHash: '$2b$12$hashed_password',
      name: 'Test User',
      isActive: true,
      isAdmin: false,
      mustChangePassword: false,
      theme: 'dark',
      language: 'es',
      avatarPath: undefined,
      avatarMimeType: undefined,
      avatarSize: undefined,
      avatarUpdatedAt: undefined,
      lastLoginAt: undefined,
      lastAccessAt: undefined,
      isPublicProfile: false,
      showTopTracks: true,
      showTopArtists: true,
      showTopAlbums: true,
      showPlaylists: true,
      bio: undefined,
      homeSections: [],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    });
  }

  /**
   * Crea un usuario administrador
   */
  static createAdmin(overrides?: Partial<UserProps>): User {
    return UserFactory.create({
      id: 'admin-123',
      username: 'admin',
      name: 'Admin User',
      isAdmin: true,
      ...overrides,
    });
  }

  /**
   * Crea un usuario que debe cambiar su contraseña (recién creado por admin)
   */
  static createWithMustChangePassword(overrides?: Partial<UserProps>): User {
    return UserFactory.create({
      id: 'new-user-123',
      username: 'newuser',
      name: 'New User',
      mustChangePassword: true,
      ...overrides,
    });
  }

  /**
   * Crea un usuario inactivo
   */
  static createInactive(overrides?: Partial<UserProps>): User {
    return UserFactory.create({
      isActive: false,
      ...overrides,
    });
  }

  /**
   * Crea un usuario con perfil público
   */
  static createPublicProfile(overrides?: Partial<UserProps>): User {
    return UserFactory.create({
      isPublicProfile: true,
      bio: 'Music lover',
      ...overrides,
    });
  }

  /**
   * Crea múltiples usuarios
   */
  static createMany(count: number, overridesFn?: (index: number) => Partial<UserProps>): User[] {
    return Array.from({ length: count }, (_, i) =>
      UserFactory.create(overridesFn ? overridesFn(i) : {
        id: `user-${i}`,
        username: `user${i}`,
      })
    );
  }
}
