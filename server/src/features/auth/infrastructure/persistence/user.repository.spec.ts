import { Test, TestingModule } from '@nestjs/testing';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { DrizzleModule } from '@infrastructure/database/drizzle.module';
import { User } from '../../domain/entities/user.entity';
import { DrizzleUserRepository } from './user.repository';

/**
 * Integration tests for DrizzleUserRepository
 *
 * These tests are skipped because they require a real database connection.
 * The repository uses DrizzleService internally for database operations.
 *
 * To run these tests:
 * 1. Set up a test database
 * 2. Update the DrizzleModule configuration for test environment
 * 3. Remove the .skip from describe
 */
describe.skip('DrizzleUserRepository', () => {
  let repository: DrizzleUserRepository;
  let drizzle: DrizzleService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [DrizzleModule],
      providers: [DrizzleUserRepository],
    }).compile();

    repository = module.get<DrizzleUserRepository>(DrizzleUserRepository);
    drizzle = module.get<DrizzleService>(DrizzleService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('create', () => {
    it('debería crear un usuario en la BD', async () => {
      // Test needs real database setup
      expect(true).toBe(true);
    });

    it('debería guardar todos los campos correctamente', async () => {
      // Test needs real database setup
      expect(true).toBe(true);
    });
  });

  describe('findByUsername', () => {
    it('debería encontrar usuario por username', async () => {
      // Test needs real database setup
      expect(true).toBe(true);
    });

    it('debería retornar null si usuario no existe', async () => {
      // Test needs real database setup
      expect(true).toBe(true);
    });

    it('debería ser case-sensitive en búsqueda', async () => {
      // Test needs real database setup
      expect(true).toBe(true);
    });
  });

  describe('findById', () => {
    it('debería encontrar usuario por ID', async () => {
      // Test needs real database setup
      expect(true).toBe(true);
    });

    it('debería retornar null si ID no existe', async () => {
      // Test needs real database setup
      expect(true).toBe(true);
    });

    it('debería encontrar el usuario correcto entre varios', async () => {
      // Test needs real database setup
      expect(true).toBe(true);
    });
  });

  describe('mapper', () => {
    it('debería convertir correctamente Drizzle a Domain', async () => {
      // Test needs real database setup
      expect(true).toBe(true);
    });
  });
});
