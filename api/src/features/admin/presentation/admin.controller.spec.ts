import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import {
  CreateUserUseCase,
  ListUsersUseCase,
  UpdateUserUseCase,
  DeleteUserUseCase,
  ResetUserPasswordUseCase,
} from '../domain/use-cases';
import { PermanentlyDeleteUserUseCase } from '../domain/use-cases/permanently-delete-user/permanently-delete-user.use-case';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { MockUseCase, createMockUseCase } from '@shared/testing/mock.types';
import { JwtUser } from '@shared/types/request.types';

// Mock current admin user
const mockCurrentUser: JwtUser = {
  id: 'admin-999',
  username: 'adminuser',
  passwordHash: '$2b$12$hashed',
  isActive: true,
  isAdmin: true,
  theme: 'dark',
  language: 'en',
  mustChangePassword: false,
  isPublicProfile: false,
  showTopTracks: true,
  showTopArtists: true,
  showTopAlbums: true,
  showPlaylists: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AdminController', () => {
  let controller: AdminController;
  let mockCreateUserUseCase: MockUseCase;
  let mockListUsersUseCase: MockUseCase;
  let mockUpdateUserUseCase: MockUseCase;
  let mockDeleteUserUseCase: MockUseCase;
  let mockResetUserPasswordUseCase: MockUseCase;
  let mockPermanentlyDeleteUserUseCase: MockUseCase;

  beforeEach(async () => {
    mockCreateUserUseCase = createMockUseCase();
    mockListUsersUseCase = createMockUseCase();
    mockUpdateUserUseCase = createMockUseCase();
    mockDeleteUserUseCase = createMockUseCase();
    mockResetUserPasswordUseCase = createMockUseCase();
    mockPermanentlyDeleteUserUseCase = createMockUseCase();

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
        {
          provide: UpdateUserUseCase,
          useValue: mockUpdateUserUseCase,
        },
        {
          provide: DeleteUserUseCase,
          useValue: mockDeleteUserUseCase,
        },
        {
          provide: ResetUserPasswordUseCase,
          useValue: mockResetUserPasswordUseCase,
        },
        {
          provide: PermanentlyDeleteUserUseCase,
          useValue: mockPermanentlyDeleteUserUseCase,
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
        name: 'New User',
        isAdmin: false,
      };

      const useCaseResponse = {
        user: {
          id: 'user-123',
          username: 'newuser',
          name: 'New User',
          isAdmin: false,
        },
        temporaryPassword: '123456',
      };

      mockCreateUserUseCase.execute.mockResolvedValue(useCaseResponse);

      // Act
      const result = await controller.createUser(dto, mockCurrentUser);

      // Assert
      expect(mockCreateUserUseCase.execute).toHaveBeenCalledWith({
        username: 'newuser',
        name: 'New User',
        isAdmin: false,
        adminId: mockCurrentUser.id,
      });
      expect(result).toEqual(useCaseResponse);
      expect(result.temporaryPassword).toBe('123456');
    });

    it('debería crear un usuario admin', async () => {
      // Arrange
      const dto = {
        username: 'admin',
        name: 'Admin User',
        isAdmin: true,
      };

      const useCaseResponse = {
        user: {
          id: 'admin-123',
          username: 'admin',
          name: 'Admin User',
          isAdmin: true,
        },
        temporaryPassword: '654321',
      };

      mockCreateUserUseCase.execute.mockResolvedValue(useCaseResponse);

      // Act
      const result = await controller.createUser(dto, mockCurrentUser);

      // Assert
      expect(result.user.isAdmin).toBe(true);
      expect(result.temporaryPassword).toBeDefined();
    });

    it('debería propagar error del use case', async () => {
      // Arrange
      const dto = {
        username: 'test',
      };

      mockCreateUserUseCase.execute.mockRejectedValue(
        new Error('Username already exists')
      );

      // Act & Assert
      await expect(controller.createUser(dto, mockCurrentUser)).rejects.toThrow(
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

  describe('PUT /admin/users/:id - updateUser', () => {
    it('debería actualizar un usuario correctamente', async () => {
      // Arrange
      const userId = 'user-123';
      const dto = {
        name: 'Juan Pérez Updated',
      };

      const useCaseResponse = {
        id: userId,
        username: 'juanperez',
        name: 'Juan Pérez Updated',
        isAdmin: false,
        isActive: true,
      };

      mockUpdateUserUseCase.execute.mockResolvedValue(useCaseResponse);

      // Act
      const result = await controller.updateUser(userId, dto);

      // Assert
      expect(mockUpdateUserUseCase.execute).toHaveBeenCalledWith({
        userId,
        ...dto,
      });
      expect(result.id).toBe(userId);
      expect(result.name).toBe('Juan Pérez Updated');
    });

    it('debería actualizar el rol de admin de un usuario', async () => {
      // Arrange
      const userId = 'user-456';
      const dto = {
        isAdmin: true,
      };

      const useCaseResponse = {
        id: userId,
        username: 'maria',
        name: 'María García',
        isAdmin: true,
        isActive: true,
      };

      mockUpdateUserUseCase.execute.mockResolvedValue(useCaseResponse);

      // Act
      const result = await controller.updateUser(userId, dto);

      // Assert
      expect(mockUpdateUserUseCase.execute).toHaveBeenCalledWith({
        userId,
        isAdmin: true,
      });
      expect(result.isAdmin).toBe(true);
    });

    it('debería actualizar el estado activo de un usuario', async () => {
      // Arrange
      const userId = 'user-789';
      const dto = {
        isActive: false,
      };

      const useCaseResponse = {
        id: userId,
        username: 'pedro',
        name: 'Pedro López',
        isAdmin: false,
        isActive: false,
      };

      mockUpdateUserUseCase.execute.mockResolvedValue(useCaseResponse);

      // Act
      const result = await controller.updateUser(userId, dto);

      // Assert
      expect(result.isActive).toBe(false);
    });

    it('debería propagar error del use case', async () => {
      // Arrange
      const userId = 'user-123';
      const dto = { name: 'Test' };

      mockUpdateUserUseCase.execute.mockRejectedValue(
        new Error('User not found')
      );

      // Act & Assert
      await expect(controller.updateUser(userId, dto)).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('DELETE /admin/users/:id - deleteUser', () => {
    it('debería desactivar un usuario correctamente', async () => {
      // Arrange
      const userId = 'user-123';

      mockDeleteUserUseCase.execute.mockResolvedValue({
        success: true,
      });

      // Act
      await controller.deleteUser(userId, mockCurrentUser);

      // Assert
      expect(mockDeleteUserUseCase.execute).toHaveBeenCalledWith({
        userId,
        adminId: mockCurrentUser.id,
      });
    });

    it('debería propagar error si intenta eliminar el último admin', async () => {
      // Arrange
      const userId = 'admin-123';

      mockDeleteUserUseCase.execute.mockRejectedValue(
        new Error('Cannot delete the last admin user')
      );

      // Act & Assert
      await expect(controller.deleteUser(userId, mockCurrentUser)).rejects.toThrow(
        'Cannot delete the last admin user'
      );
    });

    it('debería propagar error si el usuario no existe', async () => {
      // Arrange
      const userId = 'nonexistent-123';

      mockDeleteUserUseCase.execute.mockRejectedValue(
        new Error('User not found')
      );

      // Act & Assert
      await expect(controller.deleteUser(userId, mockCurrentUser)).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('POST /admin/users/:id/reset-password - resetUserPassword', () => {
    it('debería resetear la contraseña de un usuario correctamente', async () => {
      // Arrange
      const userId = 'user-123';

      const useCaseResponse = {
        temporaryPassword: 'A7h4Km2p',
      };

      mockResetUserPasswordUseCase.execute.mockResolvedValue(useCaseResponse);

      // Act
      const result = await controller.resetUserPassword(userId, mockCurrentUser);

      // Assert
      expect(mockResetUserPasswordUseCase.execute).toHaveBeenCalledWith({
        userId,
        adminId: mockCurrentUser.id,
      });
      expect(result.temporaryPassword).toBe('A7h4Km2p');
      expect(result.temporaryPassword).toMatch(/^[A-Za-z0-9]{8}$/);
    });

    it('debería generar una contraseña temporal alfanumérica', async () => {
      // Arrange
      const userId = 'user-456';

      const useCaseResponse = {
        temporaryPassword: 'X9pM3qR7',
      };

      mockResetUserPasswordUseCase.execute.mockResolvedValue(useCaseResponse);

      // Act
      const result = await controller.resetUserPassword(userId, mockCurrentUser);

      // Assert
      expect(result.temporaryPassword).toHaveLength(8);
      expect(result.temporaryPassword).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('debería propagar error si el usuario no existe', async () => {
      // Arrange
      const userId = 'nonexistent-123';

      mockResetUserPasswordUseCase.execute.mockRejectedValue(
        new Error('User not found')
      );

      // Act & Assert
      await expect(controller.resetUserPassword(userId, mockCurrentUser)).rejects.toThrow(
        'User not found'
      );
    });
  });
});