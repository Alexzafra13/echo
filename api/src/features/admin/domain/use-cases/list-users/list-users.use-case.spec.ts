import { Test, TestingModule } from '@nestjs/testing';
import { ListUsersUseCase } from './list-users.use-case';
import { USER_REPOSITORY, IUserRepository } from '@features/auth/domain/ports';
import { User, UserProps } from '@features/auth/domain/entities/user.entity';
import { createMockUserProps } from '@shared/testing/mock.types';

// Helper para crear mock de usuario
const createMockUser = (overrides: Partial<UserProps> = {}): User => {
  return User.reconstruct(createMockUserProps(overrides));
};

describe('ListUsersUseCase', () => {
  let useCase: ListUsersUseCase;
  let userRepository: jest.Mocked<IUserRepository>;

  beforeEach(async () => {
    const mockUserRepository: Partial<IUserRepository> = {
      findAll: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListUsersUseCase,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    useCase = module.get<ListUsersUseCase>(ListUsersUseCase);
    userRepository = module.get(USER_REPOSITORY);
  });

  describe('execute', () => {
    it('debería listar usuarios con paginación por defecto', async () => {
      // Arrange
      const mockUsers = [
        createMockUser({
          id: '1',
          username: 'user1',
          name: 'User One',
          theme: 'light',
          lastLoginAt: new Date('2025-10-20'),
          createdAt: new Date('2025-10-01'),
          updatedAt: new Date('2025-10-01'),
        }),
        createMockUser({
          id: '2',
          username: 'user2',
          name: 'User Two',
          isAdmin: true,
          language: 'en',
          lastLoginAt: new Date('2025-10-21'),
          createdAt: new Date('2025-10-02'),
          updatedAt: new Date('2025-10-02'),
        }),
      ];

      (userRepository.findAll as jest.Mock).mockResolvedValue(mockUsers);
      (userRepository.count as jest.Mock).mockResolvedValue(2);

      // Act
      const result = await useCase.execute({});

      // Assert
      expect(userRepository.findAll).toHaveBeenCalledWith(0, 20);
      expect(userRepository.count).toHaveBeenCalled();
      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.users[0]).toEqual({
        id: '1',
        username: 'user1',
        name: 'User One',
        isAdmin: false,
        isActive: true,
        mustChangePassword: false,
        lastLoginAt: new Date('2025-10-20'),
        createdAt: new Date('2025-10-01'),
        avatarPath: undefined,
        isSystemAdmin: false,
      });
    });

    it('debería respetar parámetros de paginación personalizados', async () => {
      // Arrange
      const mockUsers = [
        createMockUser({
          id: '3',
          username: 'user3',
          name: 'User Three',
          theme: 'light',
          lastLoginAt: undefined,
          createdAt: new Date('2025-10-03'),
          updatedAt: new Date('2025-10-03'),
        }),
      ];

      (userRepository.findAll as jest.Mock).mockResolvedValue(mockUsers);
      (userRepository.count as jest.Mock).mockResolvedValue(50);

      // Act
      const result = await useCase.execute({ skip: 10, take: 5 });

      // Assert
      expect(userRepository.findAll).toHaveBeenCalledWith(10, 5);
      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(50);
    });

    it('debería manejar lista vacía de usuarios', async () => {
      // Arrange
      (userRepository.findAll as jest.Mock).mockResolvedValue([]);
      (userRepository.count as jest.Mock).mockResolvedValue(0);

      // Act
      const result = await useCase.execute({});

      // Assert
      expect(result.users).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('debería mapear correctamente usuarios sin lastLoginAt', async () => {
      // Arrange
      const mockUsers = [
        createMockUser({
          id: '4',
          username: 'user4',
          name: 'User Four',
          mustChangePassword: true,
          theme: 'light',
          lastLoginAt: undefined,
          createdAt: new Date('2025-10-04'),
          updatedAt: new Date('2025-10-04'),
        }),
      ];

      (userRepository.findAll as jest.Mock).mockResolvedValue(mockUsers);
      (userRepository.count as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await useCase.execute({});

      // Assert
      expect(result.users[0].lastLoginAt).toBeUndefined();
      expect(result.users[0].mustChangePassword).toBe(true);
    });
  });
});
