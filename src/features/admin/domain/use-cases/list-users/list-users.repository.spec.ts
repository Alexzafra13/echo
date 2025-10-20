import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { PrismaModule } from '@infrastructure/persistence/prisma.module';
import { ListUsersUseCase } from './list-users.use-case';

describe('ListUsersUseCase - Integration', () => {
  let useCase: ListUsersUseCase;
  let prisma: PrismaService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        ListUsersUseCase,
        {
          provide: 'IUserRepository',
          useValue: {},
        },
      ],
    }).compile();

    useCase = module.get<ListUsersUseCase>(ListUsersUseCase);
    prisma = module.get<PrismaService>(PrismaService);
    
    // Limpieza inicial
    await prisma.user.deleteMany();
  });

  beforeEach(async () => {
    // Limpiar TODO antes de cada test
    await prisma.user.deleteMany();
    
    // Esperar a que se complete la eliminación
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await module.close();
  });

  describe('execute', () => {
    it('debería listar todos los usuarios con paginación por defecto', async () => {
      // Arrange
      const createdUsers = await prisma.user.createMany({
        data: [
          {
            username: 'listuser1',
            email: 'listuser1@test.com',
            passwordHash: '$2b$12$hashed',
            name: 'User One',
            isActive: true,
            isAdmin: false,
          },
          {
            username: 'listuser2',
            email: 'listuser2@test.com',
            passwordHash: '$2b$12$hashed',
            name: 'User Two',
            isActive: true,
            isAdmin: true,
          },
        ],
      });

      expect(createdUsers.count).toBe(2);

      // Act
      const result = await useCase.execute({});

      // Assert
      expect(result.users.length).toBe(2);
      expect(result.total).toBe(2);
      
      const user1 = result.users.find(u => u.username === 'listuser1');
      const user2 = result.users.find(u => u.username === 'listuser2');
      
      expect(user1).toBeDefined();
      expect(user1?.email).toBe('listuser1@test.com');
      expect(user1?.name).toBe('User One');
      expect(user1?.isAdmin).toBe(false);
      
      expect(user2).toBeDefined();
      expect(user2?.isAdmin).toBe(true);
    });

    it('debería paginar correctamente con skip y take', async () => {
      // Arrange
      const users: any[] = [];
      for (let i = 1; i <= 5; i++) {
        users.push({
          username: `paguser${i}`,
          email: `paguser${i}@test.com`,
          passwordHash: '$2b$12$hashed',
          name: `User ${i}`,
          isActive: true,
          isAdmin: false,
        });
      }
      
      const created = await prisma.user.createMany({ data: users });
      expect(created.count).toBe(5);

      // Act
      const result = await useCase.execute({
        skip: 2,
        take: 2,
      });

      // Assert
      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(5);
    });

    it('debería retornar usuarios ordenados por createdAt desc', async () => {
      // Arrange
      const now = new Date();
      
      await prisma.user.create({
        data: {
          username: 'olduser',
          email: 'old@test.com',
          passwordHash: '$2b$12$hashed',
          isActive: true,
          isAdmin: false,
          createdAt: new Date(now.getTime() - 3000),
        },
      });

      await prisma.user.create({
        data: {
          username: 'miduser',
          email: 'mid@test.com',
          passwordHash: '$2b$12$hashed',
          isActive: true,
          isAdmin: false,
          createdAt: new Date(now.getTime() - 2000),
        },
      });

      await prisma.user.create({
        data: {
          username: 'newuser',
          email: 'new@test.com',
          passwordHash: '$2b$12$hashed',
          isActive: true,
          isAdmin: false,
          createdAt: now,
        },
      });

      // Act
      const result = await useCase.execute({});

      // Assert
      expect(result.users).toHaveLength(3);
      expect(result.users[0].username).toBe('newuser');
      expect(result.users[1].username).toBe('miduser');
      expect(result.users[2].username).toBe('olduser');
    });

    it('debería retornar lista vacía si no hay usuarios', async () => {
      // Act
      const result = await useCase.execute({});

      // Assert
      expect(result.users).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('debería incluir usuarios inactivos y activos', async () => {
      // Arrange
      await prisma.user.createMany({
        data: [
          {
            username: 'activeuser',
            email: 'activeuser@test.com',
            passwordHash: '$2b$12$hashed',
            isActive: true,
            isAdmin: false,
          },
          {
            username: 'inactiveuser',
            email: 'inactiveuser@test.com',
            passwordHash: '$2b$12$hashed',
            isActive: false,
            isAdmin: false,
          },
        ],
      });

      // Act
      const result = await useCase.execute({});

      // Assert
      expect(result.users.length).toBe(2);
      
      const activeUser = result.users.find((u) => u.username === 'activeuser');
      const inactiveUser = result.users.find((u) => u.username === 'inactiveuser');
      
      expect(activeUser).toBeDefined();
      expect(activeUser?.isActive).toBe(true);
      
      expect(inactiveUser).toBeDefined();
      expect(inactiveUser?.isActive).toBe(false);
    });

    it('NO debería incluir passwordHash en la respuesta', async () => {
      // Arrange
      await prisma.user.create({
        data: {
          username: 'secretuser',
          email: 'secretuser@test.com',
          passwordHash: '$2b$12$super_secret_hash',
          isActive: true,
          isAdmin: false,
        },
      });

      // Act
      const result = await useCase.execute({});

      // Assert
      expect(result.users.length).toBe(1);
      
      const user = result.users[0];
      expect(user.username).toBe('secretuser');
      expect(user).not.toHaveProperty('passwordHash');
      expect(JSON.stringify(user)).not.toContain('super_secret_hash');
    });
  });
});