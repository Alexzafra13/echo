import { Test, TestingModule } from '@nestjs/testing';
import { ListUsersUseCase } from './list-users.use-case';
import { USER_REPOSITORY, IUserRepository } from '@features/auth/domain/ports';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { UserMapper } from '@features/auth/infrastructure/persistence/user.mapper';

describe('ListUsersUseCase', () => {
  let useCase: ListUsersUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockUserRepository: Partial<IUserRepository> = {};

    const mockPrismaService = {
      user: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListUsersUseCase,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    useCase = module.get<ListUsersUseCase>(ListUsersUseCase);
    userRepository = module.get(USER_REPOSITORY);
    prismaService = module.get(PrismaService);
  });

  describe('execute', () => {
    it('debería listar usuarios con paginación por defecto', async () => {
      // Arrange
      const mockUsersRaw = [
        {
          id: '1',
          username: 'user1',
          email: 'user1@test.com',
          name: 'User One',
          password: 'hashed_password',
          isAdmin: false,
          isActive: true,
          mustChangePassword: false,
          theme: 'light',
          language: 'es',
          lastLoginAt: new Date('2025-10-20'),
          createdAt: new Date('2025-10-01'),
          updatedAt: new Date('2025-10-01'),
        },
        {
          id: '2',
          username: 'user2',
          email: 'user2@test.com',
          name: 'User Two',
          password: 'hashed_password',
          isAdmin: true,
          isActive: true,
          mustChangePassword: false,
          theme: 'dark',
          language: 'en',
          lastLoginAt: new Date('2025-10-21'),
          createdAt: new Date('2025-10-02'),
          updatedAt: new Date('2025-10-02'),
        },
      ];

      (prismaService.user.findMany as jest.Mock).mockResolvedValue(mockUsersRaw);
      (prismaService.user.count as jest.Mock).mockResolvedValue(2);

      // Act
      const result = await useCase.execute({});

      // Assert
      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
      expect(prismaService.user.count).toHaveBeenCalled();
      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.users[0]).toEqual({
        id: '1',
        username: 'user1',
        email: 'user1@test.com',
        name: 'User One',
        isAdmin: false,
        isActive: true,
        mustChangePassword: false,
        lastLoginAt: new Date('2025-10-20'),
        createdAt: new Date('2025-10-01'),
      });
    });

    it('debería respetar parámetros de paginación personalizados', async () => {
      // Arrange
      const mockUsersRaw = [
        {
          id: '3',
          username: 'user3',
          email: 'user3@test.com',
          name: 'User Three',
          password: 'hashed_password',
          isAdmin: false,
          isActive: true,
          mustChangePassword: false,
          theme: 'light',
          language: 'es',
          lastLoginAt: null,
          createdAt: new Date('2025-10-03'),
          updatedAt: new Date('2025-10-03'),
        },
      ];

      (prismaService.user.findMany as jest.Mock).mockResolvedValue(mockUsersRaw);
      (prismaService.user.count as jest.Mock).mockResolvedValue(50);

      // Act
      const result = await useCase.execute({ skip: 10, take: 5 });

      // Assert
      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        skip: 10,
        take: 5,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(50);
    });

    it('debería manejar lista vacía de usuarios', async () => {
      // Arrange
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.user.count as jest.Mock).mockResolvedValue(0);

      // Act
      const result = await useCase.execute({});

      // Assert
      expect(result.users).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('debería mapear correctamente usuarios sin email ni lastLoginAt', async () => {
      // Arrange
      const mockUsersRaw = [
        {
          id: '4',
          username: 'user4',
          email: null,
          name: 'User Four',
          password: 'hashed_password',
          isAdmin: false,
          isActive: true,
          mustChangePassword: true,
          theme: 'light',
          language: 'es',
          lastLoginAt: null,
          createdAt: new Date('2025-10-04'),
          updatedAt: new Date('2025-10-04'),
        },
      ];

      (prismaService.user.findMany as jest.Mock).mockResolvedValue(mockUsersRaw);
      (prismaService.user.count as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await useCase.execute({});

      // Assert
      expect(result.users[0].email).toBeUndefined();
      expect(result.users[0].lastLoginAt).toBeUndefined();
      expect(result.users[0].mustChangePassword).toBe(true);
    });
  });
});
