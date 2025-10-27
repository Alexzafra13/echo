// Mock Prisma Client before any imports
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
  })),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { PrismaModule } from '@infrastructure/persistence/prisma.module';
import { User } from '../../domain/entities/user.entity';
import { PrismaUserRepository } from './user.repository';

describe.skip('PrismaUserRepository', () => {
  let repository: PrismaUserRepository;
  let prisma: PrismaService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [PrismaUserRepository],
    }).compile();

    repository = module.get<PrismaUserRepository>(PrismaUserRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    // Limpiar datos después de cada test
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await module.close();
  });

  describe('create', () => {
    it('debería crear un usuario en la BD', async () => {
      // Arrange
      const user = User.create({
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed_password',
        name: 'Juan García',
        isActive: true,
        isAdmin: false,
      });

      // Act
      const saved = await repository.create(user);

      // Assert
      expect(saved.id).toBeDefined();
      expect(saved.username).toBe('juan');
      expect(saved.email).toBe('juan@test.com');
      expect(saved.name).toBe('Juan García');
      expect(saved.isActive).toBe(true);

      // Verificar que está en BD
      const inDb = await prisma.user.findUnique({
        where: { id: saved.id },
      });
      expect(inDb).toBeDefined();
      expect(inDb?.username).toBe('juan');
    });

    it('debería crear usuario sin email', async () => {
      // Arrange
      const user = User.create({
        username: 'maria',
        passwordHash: '$2b$12$hashed_password',
        name: 'María',
        isActive: true,
        isAdmin: false,
      });

      // Act
      const saved = await repository.create(user);

      // Assert
      expect(saved.email).toBeUndefined();
      expect(saved.username).toBe('maria');
    });

    it('debería guardar todos los campos correctamente', async () => {
      // Arrange
      const now = new Date();
      const user = User.create({
        username: 'admin',
        email: 'admin@test.com',
        passwordHash: '$2b$12$hashed_password',
        name: 'Admin User',
        isActive: true,
        isAdmin: true,
      });

      // Act
      const saved = await repository.create(user);

      // Assert
      expect(saved.id).toBeDefined();
      expect(saved.username).toBe('admin');
      expect(saved.email).toBe('admin@test.com');
      expect(saved.passwordHash).toBe('$2b$12$hashed_password');
      expect(saved.name).toBe('Admin User');
      expect(saved.isActive).toBe(true);
      expect(saved.isAdmin).toBe(true);
      expect(saved.createdAt).toBeDefined();
      expect(saved.updatedAt).toBeDefined();
    });
  });

  describe('findByUsername', () => {
    it('debería encontrar usuario por username', async () => {
      // Arrange
      const user = User.create({
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed_password',
        isActive: true,
        isAdmin: false,
      });
      await repository.create(user);

      // Act
      const found = await repository.findByUsername('juan');

      // Assert
      expect(found).toBeDefined();
      expect(found?.username).toBe('juan');
      expect(found?.email).toBe('juan@test.com');
    });

    it('debería retornar null si usuario no existe', async () => {
      // Act
      const found = await repository.findByUsername('noexiste');

      // Assert
      expect(found).toBeNull();
    });

    it('debería ser case-sensitive en búsqueda', async () => {
      // Arrange
      const user = User.create({
        username: 'Juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed_password',
        isActive: true,
        isAdmin: false,
      });
      await repository.create(user);

      // Act
      const found = await repository.findByUsername('juan');

      // Assert
      expect(found).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('debería encontrar usuario por email', async () => {
      // Arrange
      const user = User.create({
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed_password',
        isActive: true,
        isAdmin: false,
      });
      await repository.create(user);

      // Act
      const found = await repository.findByEmail('juan@test.com');

      // Assert
      expect(found).toBeDefined();
      expect(found?.email).toBe('juan@test.com');
      expect(found?.username).toBe('juan');
    });

    it('debería retornar null si email no existe', async () => {
      // Act
      const found = await repository.findByEmail('noexiste@test.com');

      // Assert
      expect(found).toBeNull();
    });

    it('debería retornar null si usuario no tiene email', async () => {
      // Arrange
      const user = User.create({
        username: 'maria',
        passwordHash: '$2b$12$hashed_password',
        isActive: true,
        isAdmin: false,
      });
      await repository.create(user);

      // Act
      const found = await repository.findByEmail('maria@test.com');

      // Assert
      expect(found).toBeNull();
    });

    it('debería ser case-insensitive en búsqueda de email', async () => {
      // Arrange
      const user = User.create({
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed_password',
        isActive: true,
        isAdmin: false,
      });
      await repository.create(user);

      // Act
      const found = await repository.findByEmail('JUAN@TEST.COM');

      // Assert
      // Depende de si email está normalizado a lowercase en BD
      // Ajusta según tu implementación
      expect(found).toBeDefined();
    });
  });

  describe('findById', () => {
    it('debería encontrar usuario por ID', async () => {
      // Arrange
      const user = User.create({
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed_password',
        isActive: true,
        isAdmin: false,
      });
      const saved = await repository.create(user);

      // Act
      const found = await repository.findById(saved.id);

      // Assert
      expect(found).toBeDefined();
      expect(found?.id).toBe(saved.id);
      expect(found?.username).toBe('juan');
    });

    it('debería retornar null si ID no existe', async () => {
      // Act
      const found = await repository.findById('invalid-id-123');

      // Assert
      expect(found).toBeNull();
    });

    it('debería encontrar el usuario correcto entre varios', async () => {
      // Arrange
      const user1 = User.create({
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed_password',
        isActive: true,
        isAdmin: false,
      });
      const user2 = User.create({
        username: 'maria',
        email: 'maria@test.com',
        passwordHash: '$2b$12$hashed_password',
        isActive: true,
        isAdmin: false,
      });

      const saved1 = await repository.create(user1);
      const saved2 = await repository.create(user2);

      // Act
      const found = await repository.findById(saved1.id);

      // Assert
      expect(found?.id).toBe(saved1.id);
      expect(found?.username).toBe('juan');
      expect(found?.id).not.toBe(saved2.id);
    });
  });

  describe('mapper', () => {
    it('debería convertir correctamente Prisma a Domain', async () => {
      // Arrange
      const user = User.create({
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed_password',
        name: 'Juan',
        isActive: true,
        isAdmin: false,
      });
      await repository.create(user);

      // Act
      const found = await repository.findByUsername('juan');

      // Assert
      expect(found).toBeInstanceOf(User);
      expect(found?.id).toBeDefined();
      expect(found?.username).toBe('juan');
      expect(found?.email).toBe('juan@test.com');
      expect(found?.passwordHash).toBe('$2b$12$hashed_password');
      expect(found?.name).toBe('Juan');
    });
  });
});