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
 * Requieren: PostgreSQL corriendo (docker-compose.dev.yml)
 * Ejecutar: pnpm test:integration user-repository
 */
describe('UserRepository Integration', () => {
  let module: TestingModule;
  let drizzle: DrizzleService;
  let repository: DrizzleUserRepository;

  // Helper para limpiar la tabla de usuarios
  const cleanUsers = async () => {
    await drizzle.db.delete(schema.streamTokens);
    await drizzle.db.delete(schema.users);
  };

  beforeAll(async () => {
    // Crear módulo de testing con servicio REAL de BD
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [
        {
          provide: DrizzleService,
          useFactory: () => {
            // Crear servicio manualmente para tests (sin logger de Pino)
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

    // Verificar conexión
    await drizzle.onModuleInit();
  });

  afterAll(async () => {
    await cleanUsers();
    await drizzle.onModuleDestroy();
    await module.close();
  });

  beforeEach(async () => {
    // Limpiar antes de cada test para aislamiento
    await cleanUsers();
  });

  describe('create', () => {
    it('debería crear un usuario en la BD', async () => {
      // Arrange
      const user = User.create({
        username: 'integration_test_user',
        passwordHash: '$2b$12$test_hash_for_integration',
        name: 'Integration Test',
        isAdmin: false,
      });

      // Act
      const created = await repository.create(user);

      // Assert
      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.username).toBe('integration_test_user');
      expect(created.name).toBe('Integration Test');
      expect(created.isAdmin).toBe(false);
      expect(created.isActive).toBe(true);
      expect(created.mustChangePassword).toBe(true);

      // Verificar que realmente está en la BD
      const [dbUser] = await drizzle.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, created.id));

      expect(dbUser).toBeDefined();
      expect(dbUser.username).toBe('integration_test_user');
    });

    it('debería crear un usuario admin', async () => {
      // Arrange
      const admin = User.create({
        username: 'admin_test',
        passwordHash: '$2b$12$admin_hash',
        name: 'Admin User',
        isAdmin: true,
      });

      // Act
      const created = await repository.create(admin);

      // Assert
      expect(created.isAdmin).toBe(true);
    });

    it('debería fallar si username ya existe (constraint unique)', async () => {
      // Arrange - crear primer usuario
      const user1 = User.create({
        username: 'duplicate_user',
        passwordHash: '$2b$12$hash1',
        name: 'First User',
      });
      await repository.create(user1);

      // Arrange - intentar crear usuario con mismo username
      const user2 = User.create({
        username: 'duplicate_user',
        passwordHash: '$2b$12$hash2',
        name: 'Second User',
      });

      // Act & Assert
      await expect(repository.create(user2)).rejects.toThrow();
    });

    it('debería guardar todos los campos correctamente', async () => {
      // Arrange
      const user = User.create({
        username: 'full_fields_user',
        passwordHash: '$2b$12$full_hash',
        name: 'Full Fields Test',
        isAdmin: true,
        theme: 'light',
        language: 'en',
      });

      // Act
      const created = await repository.create(user);

      // Assert - verificar desde BD
      const [dbUser] = await drizzle.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, created.id));

      expect(dbUser.username).toBe('full_fields_user');
      expect(dbUser.passwordHash).toBe('$2b$12$full_hash');
      expect(dbUser.name).toBe('Full Fields Test');
      expect(dbUser.isAdmin).toBe(true);
      expect(dbUser.theme).toBe('light');
      expect(dbUser.language).toBe('en');
      expect(dbUser.mustChangePassword).toBe(true);
      expect(dbUser.isActive).toBe(true);
    });
  });

  describe('findByUsername', () => {
    it('debería encontrar usuario por username', async () => {
      // Arrange
      const user = User.create({
        username: 'findme',
        passwordHash: '$2b$12$hash',
        name: 'Find Me',
      });
      await repository.create(user);

      // Act
      const found = await repository.findByUsername('findme');

      // Assert
      expect(found).toBeDefined();
      expect(found?.username).toBe('findme');
      expect(found?.name).toBe('Find Me');
    });

    it('debería retornar null si usuario no existe', async () => {
      // Act
      const found = await repository.findByUsername('nonexistent');

      // Assert
      expect(found).toBeNull();
    });

    it('debería ser case-sensitive en búsqueda', async () => {
      // Arrange
      const user = User.create({
        username: 'CaseSensitive',
        passwordHash: '$2b$12$hash',
      });
      await repository.create(user);

      // Act
      const found1 = await repository.findByUsername('CaseSensitive');
      const found2 = await repository.findByUsername('casesensitive');
      const found3 = await repository.findByUsername('CASESENSITIVE');

      // Assert
      expect(found1).toBeDefined();
      expect(found2).toBeNull();
      expect(found3).toBeNull();
    });
  });

  describe('findById', () => {
    it('debería encontrar usuario por ID', async () => {
      // Arrange
      const user = User.create({
        username: 'findbyid',
        passwordHash: '$2b$12$hash',
        name: 'Find By ID',
      });
      const created = await repository.create(user);

      // Act
      const found = await repository.findById(created.id);

      // Assert
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.username).toBe('findbyid');
    });

    it('debería retornar null si ID no existe', async () => {
      // Act
      const found = await repository.findById('00000000-0000-0000-0000-000000000000');

      // Assert
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('debería retornar lista paginada de usuarios', async () => {
      // Arrange - crear 5 usuarios
      for (let i = 0; i < 5; i++) {
        const user = User.create({
          username: `user_${i}`,
          passwordHash: '$2b$12$hash',
          name: `User ${i}`,
        });
        await repository.create(user);
      }

      // Act
      const page1 = await repository.findAll(0, 3); // primeros 3
      const page2 = await repository.findAll(3, 3); // siguientes 3

      // Assert
      expect(page1).toHaveLength(3);
      expect(page2).toHaveLength(2);
    });

    it('debería retornar usuarios ordenados por createdAt desc', async () => {
      // Arrange - crear usuarios con delay para diferente createdAt
      const user1 = User.create({ username: 'first', passwordHash: '$2b$12$hash' });
      await repository.create(user1);

      // Pequeño delay
      await new Promise(resolve => setTimeout(resolve, 10));

      const user2 = User.create({ username: 'second', passwordHash: '$2b$12$hash' });
      await repository.create(user2);

      // Act
      const users = await repository.findAll(0, 10);

      // Assert - el más reciente primero
      expect(users[0].username).toBe('second');
      expect(users[1].username).toBe('first');
    });
  });

  describe('count', () => {
    it('debería retornar conteo correcto de usuarios', async () => {
      // Arrange - crear 3 usuarios
      for (let i = 0; i < 3; i++) {
        const user = User.create({
          username: `count_user_${i}`,
          passwordHash: '$2b$12$hash',
        });
        await repository.create(user);
      }

      // Act
      const count = await repository.count();

      // Assert
      expect(count).toBe(3);
    });

    it('debería retornar 0 si no hay usuarios', async () => {
      // Act
      const count = await repository.count();

      // Assert
      expect(count).toBe(0);
    });
  });

  describe('updatePartial', () => {
    it('debería actualizar campos parcialmente', async () => {
      // Arrange
      const user = User.create({
        username: 'update_test',
        passwordHash: '$2b$12$hash',
        name: 'Original Name',
        theme: 'dark',
      });
      const created = await repository.create(user);

      // Act
      const updated = await repository.updatePartial(created.id, {
        name: 'Updated Name',
        theme: 'light',
      });

      // Assert
      expect(updated.name).toBe('Updated Name');
      expect(updated.theme).toBe('light');
      expect(updated.username).toBe('update_test'); // no cambió
    });

    it('debería actualizar updatedAt automáticamente', async () => {
      // Arrange
      const user = User.create({
        username: 'updated_at_test',
        passwordHash: '$2b$12$hash',
      });
      const created = await repository.create(user);
      const originalUpdatedAt = created.updatedAt;

      // Pequeño delay
      await new Promise(resolve => setTimeout(resolve, 10));

      // Act
      const updated = await repository.updatePartial(created.id, {
        name: 'New Name',
      });

      // Assert
      expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('updatePassword', () => {
    it('debería actualizar el hash de contraseña', async () => {
      // Arrange
      const user = User.create({
        username: 'password_update_test',
        passwordHash: '$2b$12$original_hash',
      });
      const created = await repository.create(user);

      // Act
      await repository.updatePassword(created.id, '$2b$12$new_hash');

      // Assert - verificar desde BD
      const [dbUser] = await drizzle.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, created.id));

      expect(dbUser.passwordHash).toBe('$2b$12$new_hash');
    });
  });

  describe('updateAdminStatus', () => {
    it('debería promover usuario a admin', async () => {
      // Arrange
      const user = User.create({
        username: 'promote_test',
        passwordHash: '$2b$12$hash',
        isAdmin: false,
      });
      const created = await repository.create(user);
      expect(created.isAdmin).toBe(false);

      // Act
      await repository.updateAdminStatus(created.id, true);

      // Assert
      const found = await repository.findById(created.id);
      expect(found?.isAdmin).toBe(true);
    });

    it('debería degradar admin a usuario regular', async () => {
      // Arrange
      const admin = User.create({
        username: 'demote_test',
        passwordHash: '$2b$12$hash',
        isAdmin: true,
      });
      const created = await repository.create(admin);
      expect(created.isAdmin).toBe(true);

      // Act
      await repository.updateAdminStatus(created.id, false);

      // Assert
      const found = await repository.findById(created.id);
      expect(found?.isAdmin).toBe(false);
    });
  });

  describe('delete', () => {
    it('debería eliminar usuario de la BD', async () => {
      // Arrange
      const user = User.create({
        username: 'delete_test',
        passwordHash: '$2b$12$hash',
      });
      const created = await repository.create(user);

      // Verificar que existe
      const beforeDelete = await repository.findById(created.id);
      expect(beforeDelete).toBeDefined();

      // Act
      await repository.delete(created.id);

      // Assert
      const afterDelete = await repository.findById(created.id);
      expect(afterDelete).toBeNull();
    });

    it('no debería fallar si ID no existe', async () => {
      // Act & Assert - no debería lanzar error
      await expect(
        repository.delete('00000000-0000-0000-0000-000000000000')
      ).resolves.not.toThrow();
    });
  });

  describe('Mapper correctness', () => {
    it('debería mapear todos los campos correctamente desde BD a Domain', async () => {
      // Arrange - insertar directamente en BD con todos los campos
      const [inserted] = await drizzle.db
        .insert(schema.users)
        .values({
          username: 'mapper_test',
          passwordHash: '$2b$12$mapper_hash',
          name: 'Mapper Test User',
          isAdmin: true,
          isActive: false,
          theme: 'light',
          language: 'en',
          mustChangePassword: false,
          isPublicProfile: true,
          showTopTracks: false,
          showTopArtists: false,
          showTopAlbums: false,
          showPlaylists: false,
          bio: 'Test bio',
        })
        .returning();

      // Act
      const found = await repository.findById(inserted.id);

      // Assert - verificar todos los campos mapeados
      expect(found).toBeDefined();
      expect(found?.username).toBe('mapper_test');
      expect(found?.passwordHash).toBe('$2b$12$mapper_hash');
      expect(found?.name).toBe('Mapper Test User');
      expect(found?.isAdmin).toBe(true);
      expect(found?.isActive).toBe(false);
      expect(found?.theme).toBe('light');
      expect(found?.language).toBe('en');
      expect(found?.mustChangePassword).toBe(false);
      expect(found?.isPublicProfile).toBe(true);
      expect(found?.showTopTracks).toBe(false);
      expect(found?.showTopArtists).toBe(false);
      expect(found?.showTopAlbums).toBe(false);
      expect(found?.showPlaylists).toBe(false);
      expect(found?.bio).toBe('Test bio');
    });
  });
});
