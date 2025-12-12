import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DrizzleService } from '../../src/infrastructure/database/drizzle.service';
import { DrizzleUserRepository } from '../../src/features/auth/infrastructure/persistence/user.repository';
import { User } from '../../src/features/auth/domain/entities/user.entity';
import * as schema from '../../src/infrastructure/database/schema';
import { eq } from 'drizzle-orm';

/**
 * UserRepository Integration Tests
 *
 * Tests de integración que verifican el DrizzleUserRepository
 * con una base de datos PostgreSQL REAL (no mocks).
 *
 * Estos tests detectan errores que los mocks no pueden encontrar:
 * - Errores en queries SQL
 * - Problemas con el schema
 * - Errores de mapping
 * - Violaciones de constraints
 *
 * Requieren: PostgreSQL corriendo con schema aplicado (docker-compose.dev.yml + pnpm db:push)
 * Ejecutar: pnpm test:integration user-repository
 */
describe('UserRepository Integration', () => {
  let module: TestingModule;
  let drizzle: DrizzleService;
  let repository: DrizzleUserRepository;

  // Helper para limpiar la tabla de usuarios
  const cleanUsers = async () => {
    try {
      await drizzle.db.delete(schema.users);
    } catch {
      // Ignorar si hay constraints
    }
  };

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required for integration tests');
    }

    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [
        {
          provide: DrizzleService,
          useFactory: () => {
            const { Pool } = require('pg');
            const { drizzle } = require('drizzle-orm/node-postgres');

            const pool = new Pool({
              connectionString: process.env.DATABASE_URL,
            });

            const db = drizzle(pool, { schema });

            return {
              db,
              client: pool,
              onModuleInit: async () => {
                const client = await pool.connect();
                client.release();
              },
              onModuleDestroy: async () => {
                await pool.end();
              },
            };
          },
        },
        DrizzleUserRepository,
      ],
    }).compile();

    drizzle = module.get<DrizzleService>(DrizzleService);
    repository = module.get<DrizzleUserRepository>(DrizzleUserRepository);

    await drizzle.onModuleInit();
  });

  afterAll(async () => {
    await cleanUsers();
    // module.close() calls onModuleDestroy on all providers automatically
    await module?.close();
  });

  beforeEach(async () => {
    await cleanUsers();
  });

  describe('create', () => {
    it('debería crear un usuario en la BD', async () => {
      const user = User.create({
        username: 'integration_test_user',
        passwordHash: '$2b$12$test_hash_for_integration',
        name: 'Integration Test',
        isAdmin: false,
        isActive: true,
        mustChangePassword: true,
      });

      const created = await repository.create(user);

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.username).toBe('integration_test_user');
      expect(created.name).toBe('Integration Test');
      expect(created.isAdmin).toBe(false);
      expect(created.isActive).toBe(true);
      expect(created.mustChangePassword).toBe(true);

      const [dbUser] = await drizzle.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, created.id));

      expect(dbUser).toBeDefined();
      expect(dbUser.username).toBe('integration_test_user');
    });

    it('debería crear un usuario admin', async () => {
      const admin = User.create({
        username: 'admin_test',
        passwordHash: '$2b$12$admin_hash',
        name: 'Admin User',
        isAdmin: true,
        isActive: true,
        mustChangePassword: false,
      });

      const created = await repository.create(admin);

      expect(created.isAdmin).toBe(true);
    });

    it('debería fallar si username ya existe (constraint unique)', async () => {
      const user1 = User.create({
        username: 'duplicate_user',
        passwordHash: '$2b$12$hash1',
        name: 'First User',
        isAdmin: false,
        isActive: true,
        mustChangePassword: false,
      });
      await repository.create(user1);

      const user2 = User.create({
        username: 'duplicate_user',
        passwordHash: '$2b$12$hash2',
        name: 'Second User',
        isAdmin: false,
        isActive: true,
        mustChangePassword: false,
      });

      await expect(repository.create(user2)).rejects.toThrow();
    });
  });

  describe('findByUsername', () => {
    it('debería encontrar usuario por username', async () => {
      const user = User.create({
        username: 'findme',
        passwordHash: '$2b$12$hash',
        name: 'Find Me',
        isAdmin: false,
        isActive: true,
        mustChangePassword: false,
      });
      await repository.create(user);

      const found = await repository.findByUsername('findme');

      expect(found).toBeDefined();
      expect(found?.username).toBe('findme');
      expect(found?.name).toBe('Find Me');
    });

    it('debería retornar null si usuario no existe', async () => {
      const found = await repository.findByUsername('nonexistent');

      expect(found).toBeNull();
    });
  });

  describe('findById', () => {
    it('debería encontrar usuario por ID', async () => {
      const user = User.create({
        username: 'findbyid',
        passwordHash: '$2b$12$hash',
        name: 'Find By ID',
        isAdmin: false,
        isActive: true,
        mustChangePassword: false,
      });
      const created = await repository.create(user);

      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.username).toBe('findbyid');
    });

    it('debería retornar null si ID no existe', async () => {
      const found = await repository.findById('00000000-0000-0000-0000-000000000000');

      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('debería retornar lista paginada de usuarios', async () => {
      for (let i = 0; i < 5; i++) {
        const user = User.create({
          username: `user_${i}`,
          passwordHash: '$2b$12$hash',
          name: `User ${i}`,
          isAdmin: false,
          isActive: true,
          mustChangePassword: false,
        });
        await repository.create(user);
      }

      const page1 = await repository.findAll(0, 3);
      const page2 = await repository.findAll(3, 3);

      expect(page1).toHaveLength(3);
      expect(page2).toHaveLength(2);
    });
  });

  describe('count', () => {
    it('debería retornar conteo correcto de usuarios', async () => {
      for (let i = 0; i < 3; i++) {
        const user = User.create({
          username: `count_user_${i}`,
          passwordHash: '$2b$12$hash',
          isAdmin: false,
          isActive: true,
          mustChangePassword: false,
        });
        await repository.create(user);
      }

      const count = await repository.count();

      expect(count).toBe(3);
    });

    it('debería retornar 0 si no hay usuarios', async () => {
      const count = await repository.count();

      expect(count).toBe(0);
    });
  });

  describe('updatePartial', () => {
    it('debería actualizar campos parcialmente', async () => {
      const user = User.create({
        username: 'update_test',
        passwordHash: '$2b$12$hash',
        name: 'Original Name',
        theme: 'dark',
        isAdmin: false,
        isActive: true,
        mustChangePassword: false,
      });
      const created = await repository.create(user);

      const updated = await repository.updatePartial(created.id, {
        name: 'Updated Name',
        theme: 'light',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.theme).toBe('light');
      expect(updated.username).toBe('update_test');
    });
  });

  describe('updatePassword', () => {
    it('debería actualizar el hash de contraseña', async () => {
      const user = User.create({
        username: 'password_update_test',
        passwordHash: '$2b$12$original_hash',
        isAdmin: false,
        isActive: true,
        mustChangePassword: false,
      });
      const created = await repository.create(user);

      await repository.updatePassword(created.id, '$2b$12$new_hash');

      const [dbUser] = await drizzle.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, created.id));

      expect(dbUser.passwordHash).toBe('$2b$12$new_hash');
    });
  });

  describe('updateAdminStatus', () => {
    it('debería promover usuario a admin', async () => {
      const user = User.create({
        username: 'promote_test',
        passwordHash: '$2b$12$hash',
        isAdmin: false,
        isActive: true,
        mustChangePassword: false,
      });
      const created = await repository.create(user);

      await repository.updateAdminStatus(created.id, true);

      const found = await repository.findById(created.id);
      expect(found?.isAdmin).toBe(true);
    });
  });

  describe('delete', () => {
    it('debería eliminar usuario de la BD', async () => {
      const user = User.create({
        username: 'delete_test',
        passwordHash: '$2b$12$hash',
        isAdmin: false,
        isActive: true,
        mustChangePassword: false,
      });
      const created = await repository.create(user);

      const beforeDelete = await repository.findById(created.id);
      expect(beforeDelete).toBeDefined();

      await repository.delete(created.id);

      const afterDelete = await repository.findById(created.id);
      expect(afterDelete).toBeNull();
    });

    it('no debería fallar si ID no existe', async () => {
      await expect(
        repository.delete('00000000-0000-0000-0000-000000000000')
      ).resolves.not.toThrow();
    });
  });
});
