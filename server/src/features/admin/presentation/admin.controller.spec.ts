import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { CreateUserUseCase, ListUsersUseCase } from '../domain/use-cases';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';

describe('AdminController', () => {
  let controller: AdminController;
  let mockCreateUserUseCase: any;
  let mockListUsersUseCase: any;

  beforeEach(async () => {
    mockCreateUserUseCase = {
      execute: jest.fn(),
    };

    mockListUsersUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: CreateUserUseCase,
          useValue: mockCreateUserUseCase,
        },
        {
          provide: ListUsersUseCase,
          useValue: mockListUsersUseCase,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AdminController>(AdminController);
  });

  describe('POST /admin/users - createUser', () => {
    it('debería crear un usuario correctamente', async () => {
      // Arrange
      const dto = {
        username: 'newuser',
        email: 'newuser@test.com',
        name: 'New User',
        isAdmin: false,
      };

      const useCaseResponse = {
        user: {
          id: 'user-123',
          username: 'newuser',
          email: 'newuser@test.com',
          name: 'New User',
          isAdmin: false,
        },
        temporaryPassword: '123456',
      };

      mockCreateUserUseCase.execute.mockResolvedValue(useCaseResponse);

      // Act
      const result = await controller.createUser(dto);

      // Assert
      expect(mockCreateUserUseCase.execute).toHaveBeenCalledWith({
        username: 'newuser',
        email: 'newuser@test.com',
        name: 'New User',
        isAdmin: false,
      });
      expect(result).toEqual(useCaseResponse);
      expect(result.temporaryPassword).toBe('123456');
    });

    it('debería crear un usuario admin', async () => {
      // Arrange
      const dto = {
        username: 'admin',
        email: 'admin@test.com',
        name: 'Admin User',
        isAdmin: true,
      };

      const useCaseResponse = {
        user: {
          id: 'admin-123',
          username: 'admin',
          email: 'admin@test.com',
          name: 'Admin User',
          isAdmin: true,
        },
        temporaryPassword: '654321',
      };

      mockCreateUserUseCase.execute.mockResolvedValue(useCaseResponse);

      // Act
      const result = await controller.createUser(dto);

      // Assert
      expect(result.user.isAdmin).toBe(true);
      expect(result.temporaryPassword).toBeDefined();
    });

    it('debería crear usuario sin email', async () => {
      // Arrange
      const dto = {
        username: 'nomail',
        name: 'No Email User',
      };

      const useCaseResponse = {
        user: {
          id: 'user-456',
          username: 'nomail',
          email: undefined,
          name: 'No Email User',
          isAdmin: false,
        },
        temporaryPassword: '111111',
      };

      mockCreateUserUseCase.execute.mockResolvedValue(useCaseResponse);

      // Act
      const result = await controller.createUser(dto);

      // Assert
      expect(result.user.email).toBeUndefined();
    });

    it('debería propagar error del use case', async () => {
      // Arrange
      const dto = {
        username: 'test',
        email: 'test@test.com',
      };

      mockCreateUserUseCase.execute.mockRejectedValue(
        new Error('Username already exists')
      );

      // Act & Assert
      await expect(controller.createUser(dto)).rejects.toThrow(
        'Username already exists'
      );
    });
  });

  describe('GET /admin/users - listUsers', () => {
    it('debería listar usuarios sin parámetros', async () => {
      // Arrange
      const useCaseResponse = {
        users: [
          {
            id: 'user-1',
            username: 'user1',
            email: 'user1@test.com',
            name: 'User One',
            isAdmin: false,
            isActive: true,
            mustChangePassword: false,
            lastLoginAt: null,
            createdAt: new Date(),
          },
          {
            id: 'user-2',
            username: 'user2',
            email: 'user2@test.com',
            name: 'User Two',
            isAdmin: true,
            isActive: true,
            mustChangePassword: false,
            lastLoginAt: null,
            createdAt: new Date(),
          },
        ],
        total: 2,
      };

      mockListUsersUseCase.execute.mockResolvedValue(useCaseResponse);

      // Act
      const result = await controller.listUsers();

      // Assert
      expect(mockListUsersUseCase.execute).toHaveBeenCalledWith({
        skip: undefined,
        take: undefined,
      });
      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('debería listar usuarios con paginación', async () => {
      // Arrange
      const useCaseResponse = {
        users: [
          {
            id: 'user-3',
            username: 'user3',
            email: 'user3@test.com',
            name: 'User Three',
            isAdmin: false,
            isActive: true,
            mustChangePassword: false,
            lastLoginAt: null,
            createdAt: new Date(),
          },
        ],
        total: 10,
      };

      mockListUsersUseCase.execute.mockResolvedValue(useCaseResponse);

      // Act
      const result = await controller.listUsers('5', '1');

      // Assert
      expect(mockListUsersUseCase.execute).toHaveBeenCalledWith({
        skip: 5,
        take: 1,
      });
      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(10);
    });

    it('debería convertir skip y take a números', async () => {
      // Arrange
      mockListUsersUseCase.execute.mockResolvedValue({
        users: [],
        total: 0,
      });

      // Act
      await controller.listUsers('10', '20');

      // Assert
      expect(mockListUsersUseCase.execute).toHaveBeenCalledWith({
        skip: 10,
        take: 20,
      });
    });

    it('debería manejar skip sin take', async () => {
      // Arrange
      mockListUsersUseCase.execute.mockResolvedValue({
        users: [],
        total: 0,
      });

      // Act
      await controller.listUsers('5');

      // Assert
      expect(mockListUsersUseCase.execute).toHaveBeenCalledWith({
        skip: 5,
        take: undefined,
      });
    });

    it('debería manejar take sin skip', async () => {
      // Arrange
      mockListUsersUseCase.execute.mockResolvedValue({
        users: [],
        total: 0,
      });

      // Act
      await controller.listUsers(undefined, '10');

      // Assert
      expect(mockListUsersUseCase.execute).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
      });
    });

    it('debería retornar lista vacía si no hay usuarios', async () => {
      // Arrange
      mockListUsersUseCase.execute.mockResolvedValue({
        users: [],
        total: 0,
      });

      // Act
      const result = await controller.listUsers();

      // Assert
      expect(result.users).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });
});