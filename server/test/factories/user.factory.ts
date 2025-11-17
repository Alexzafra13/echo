import { User } from '@features/auth/domain/entities/user.entity';

/**
 * Factory para crear instancias de User en tests
 * Elimina duplicación de código en +40 archivos de test
 */
export class UserFactory {
  /**
   * Crea un usuario de test con valores por defecto
   * @param overrides Propiedades a sobrescribir
   */
  static create(overrides?: Partial<{
    id: string;
    username: string;
    email: string;
    passwordHash: string;
    name: string;
    isActive: boolean;
    isAdmin: boolean;
    mustChangePassword: boolean;
    theme: string;
    language: string;
    avatarPath: string | null;
    isSystemAdmin: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>): User {
    return User.reconstruct({
      id: 'user-123',
      username: 'testuser',
      email: 'test@test.com',
      passwordHash: '$2b$12$hashed_password',
      name: 'Test User',
      isActive: true,
      isAdmin: false,
      mustChangePassword: false,
      theme: 'dark',
      language: 'es',
      avatarPath: null,
      isSystemAdmin: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    });
  }

  /**
   * Crea un usuario administrador
   */
  static createAdmin(overrides?: Partial<any>): User {
    return UserFactory.create({
      id: 'admin-123',
      username: 'admin',
      email: 'admin@test.com',
      name: 'Admin User',
      isAdmin: true,
      ...overrides,
    });
  }

  /**
   * Crea el system admin (primer admin creado)
   */
  static createSystemAdmin(overrides?: Partial<any>): User {
    return UserFactory.create({
      id: 'system-admin',
      username: 'systemadmin',
      email: 'system@test.com',
      name: 'System Admin',
      isAdmin: true,
      isSystemAdmin: true,
      createdAt: new Date('2020-01-01'),
      ...overrides,
    });
  }

  /**
   * Crea un usuario inactivo
   */
  static createInactive(overrides?: Partial<any>): User {
    return UserFactory.create({
      isActive: false,
      ...overrides,
    });
  }

  /**
   * Crea múltiples usuarios
   */
  static createMany(count: number, overridesFn?: (index: number) => Partial<any>): User[] {
    return Array.from({ length: count }, (_, i) =>
      UserFactory.create(overridesFn ? overridesFn(i) : {
        id: `user-${i}`,
        username: `user${i}`,
        email: `user${i}@test.com`,
      })
    );
  }
}
