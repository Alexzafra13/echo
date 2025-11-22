import { NotFoundError, ValidationError } from '@shared/errors';
import { User } from '@features/auth/domain/entities/user.entity';
import { DeleteUserUseCase } from './delete-user.use-case';

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
  let mockUserRepository: any;
  let mockLogService: any;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      updatePartial: jest.fn(),
    };

    mockLogService = {
      info: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
    };

    useCase = new DeleteUserUseCase(mockUserRepository, mockLogService);
  });

  describe('execute', () => {
    it('debería desactivar un usuario normal correctamente', async () => {
      // Arrange
      const userToDelete = User.reconstruct({
        id: 'user-123',
        username: 'juanperez',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'Juan Pérez',
        isActive: true,
        isAdmin: false,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockUserRepository.findById.mockResolvedValue(userToDelete);
      mockUserRepository.findAll.mockResolvedValue([userToDelete]);
      mockUserRepository.updatePartial.mockResolvedValue({
        ...userToDelete,
        isActive: false,
      });

      const input = {
        userId: 'user-123',
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith('user-123', {
        isActive: false,
      });
      expect(result.success).toBe(true);
    });

    it('debería permitir desactivar un admin si hay más admins', async () => {
      // Arrange
      const systemAdmin = User.reconstruct({
        id: 'admin-000',
        username: 'admin0',
        email: 'admin0@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'System Admin',
        isActive: true,
        isAdmin: true,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        createdAt: new Date('2020-01-01'), // Oldest admin
        updatedAt: new Date(),
      });

      const adminToDelete = User.reconstruct({
        id: 'admin-123',
        username: 'admin1',
        email: 'admin1@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'Admin One',
        isActive: true,
        isAdmin: true,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        createdAt: new Date('2021-01-01'), // Newer than system admin
        updatedAt: new Date(),
      });

      const otherAdmin = User.reconstruct({
        id: 'admin-456',
        username: 'admin2',
        email: 'admin2@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'Admin Two',
        isActive: true,
        isAdmin: true,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        createdAt: new Date('2022-01-01'), // Newest
        updatedAt: new Date(),
      });

      const regularUser = User.reconstruct({
        id: 'user-789',
        username: 'user1',
        email: 'user1@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'User One',
        isActive: true,
        isAdmin: false,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockUserRepository.findById.mockResolvedValue(adminToDelete);
      mockUserRepository.findAll.mockResolvedValue([systemAdmin, adminToDelete, otherAdmin, regularUser]);
      mockUserRepository.updatePartial.mockResolvedValue({
        ...adminToDelete,
        isActive: false,
      });

      const input = {
        userId: 'admin-123',
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(mockUserRepository.findAll).toHaveBeenCalledWith(0, 1000);
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith('admin-123', {
        isActive: false,
      });
      expect(result.success).toBe(true);
    });

    it('debería lanzar error si intenta desactivar el último admin', async () => {
      // Arrange
      const systemAdmin = User.reconstruct({
        id: 'admin-000',
        username: 'admin0',
        email: 'admin0@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'System Admin',
        isActive: false, // Inactive - oldest admin
        isAdmin: true,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        createdAt: new Date('2020-01-01'), // Oldest admin
        updatedAt: new Date(),
      });

      const lastAdmin = User.reconstruct({
        id: 'admin-123',
        username: 'admin',
        email: 'admin@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'Last Admin',
        isActive: true,
        isAdmin: true,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        createdAt: new Date('2021-01-01'), // Newer than system admin
        updatedAt: new Date(),
      });

      const regularUser1 = User.reconstruct({
        id: 'user-456',
        username: 'user1',
        email: 'user1@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'User One',
        isActive: true,
        isAdmin: false,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const regularUser2 = User.reconstruct({
        id: 'user-789',
        username: 'user2',
        email: 'user2@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'User Two',
        isActive: true,
        isAdmin: false,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockUserRepository.findById.mockResolvedValue(lastAdmin);
      // System admin exists but is inactive, lastAdmin is the only active admin
      mockUserRepository.findAll.mockResolvedValue([
        systemAdmin,
        lastAdmin,
        regularUser1,
        regularUser2,
      ]);

      const input = {
        userId: 'admin-123',
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(ValidationError);
      await expect(useCase.execute(input)).rejects.toThrow('Cannot delete the last admin user');
      expect(mockUserRepository.updatePartial).not.toHaveBeenCalled();
    });

    it('debería lanzar error si el usuario no existe', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      const input = {
        userId: 'nonexistent-123',
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
      await expect(useCase.execute(input)).rejects.toThrow('User not found');
      expect(mockUserRepository.updatePartial).not.toHaveBeenCalled();
    });

    it('debería hacer soft delete (no eliminar físicamente)', async () => {
      // Arrange
      const userToDelete = User.reconstruct({
        id: 'user-123',
        username: 'juanperez',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'Juan Pérez',
        isActive: true,
        isAdmin: false,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockUserRepository.findById.mockResolvedValue(userToDelete);
      mockUserRepository.findAll.mockResolvedValue([userToDelete]);
      mockUserRepository.updatePartial.mockResolvedValue({
        ...userToDelete,
        isActive: false,
      });

      const input = {
        userId: 'user-123',
      };

      // Act
      await useCase.execute(input);

      // Assert
      // Verifica que usa updatePartial en lugar de delete
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith('user-123', {
        isActive: false,
      });
      expect(mockUserRepository.updatePartial).toHaveBeenCalledTimes(1);
    });

    it('debería desactivar usuarios normales sin verificar límite de admins activos', async () => {
      // Arrange
      const systemAdmin = User.reconstruct({
        id: 'admin-000',
        username: 'admin0',
        email: 'admin0@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'System Admin',
        isActive: true,
        isAdmin: true,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        createdAt: new Date('2020-01-01'),
        updatedAt: new Date(),
      });

      const regularUser = User.reconstruct({
        id: 'user-123',
        username: 'juanperez',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'Juan Pérez',
        isActive: true,
        isAdmin: false,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockUserRepository.findById.mockResolvedValue(regularUser);
      // findAll is called to check system admin, but admin count check is skipped for non-admins
      mockUserRepository.findAll.mockResolvedValue([systemAdmin, regularUser]);
      mockUserRepository.updatePartial.mockResolvedValue({
        ...regularUser,
        isActive: false,
      });

      const input = {
        userId: 'user-123',
      };

      // Act
      await useCase.execute(input);

      // Assert
      // findAll is called to check system admin
      expect(mockUserRepository.findAll).toHaveBeenCalledWith(0, 1000);
      // But updatePartial should succeed since user is not admin
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith('user-123', {
        isActive: false,
      });
    });

    it('debería contar solo admins activos al verificar el último admin', async () => {
      // Arrange
      const systemAdmin = User.reconstruct({
        id: 'admin-000',
        username: 'admin0',
        email: 'admin0@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'System Admin',
        isActive: false, // Inactive
        isAdmin: true,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        createdAt: new Date('2020-01-01'), // Oldest
        updatedAt: new Date(),
      });

      const adminToDelete = User.reconstruct({
        id: 'admin-123',
        username: 'admin1',
        email: 'admin1@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'Admin One',
        isActive: true,
        isAdmin: true,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        createdAt: new Date('2021-01-01'), // Newer than system admin
        updatedAt: new Date(),
      });

      // Este admin ya está inactivo, no debería contar
      const inactiveAdmin = User.reconstruct({
        id: 'admin-456',
        username: 'admin2',
        email: 'admin2@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'Admin Two',
        isActive: false,
        isAdmin: true,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        createdAt: new Date('2022-01-01'),
        updatedAt: new Date(),
      });

      mockUserRepository.findById.mockResolvedValue(adminToDelete);
      mockUserRepository.findAll.mockResolvedValue([systemAdmin, adminToDelete, inactiveAdmin]);

      const input = {
        userId: 'admin-123',
      };

      // Act & Assert
      // Solo hay 1 admin activo (adminToDelete), por lo que debería fallar
      await expect(useCase.execute(input)).rejects.toThrow(ValidationError);
      await expect(useCase.execute(input)).rejects.toThrow('Cannot delete the last admin user');
    });
  });
});
