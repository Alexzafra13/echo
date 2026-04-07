import { NotFoundError, ValidationError } from '@shared/errors';
import { LogService } from '@features/logs/application/log.service';
import { UserFactory } from 'test/factories';
import { DeleteUserUseCase } from './delete-user.use-case';
import {
  MockUserRepository,
  MockLogService,
  createMockUserRepository,
  createMockLogService,
} from '@shared/testing/mock.types';

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
  let mockUserRepository: MockUserRepository;
  let mockLogService: MockLogService;

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();
    mockLogService = createMockLogService();

    useCase = new DeleteUserUseCase(mockUserRepository, mockLogService as unknown as LogService);
  });

  describe('execute', () => {
    it('debería desactivar un usuario normal correctamente', async () => {
      // Arrange
      const userToDelete = UserFactory.create({
        id: 'user-123',
        username: 'juanperez',
        name: 'Juan Pérez',
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
      const systemAdmin = UserFactory.create({
        id: 'admin-000',
        username: 'admin0',
        name: 'System Admin',
        isAdmin: true,
        createdAt: new Date('2020-01-01'), // Oldest admin
      });

      const adminToDelete = UserFactory.create({
        id: 'admin-123',
        username: 'admin1',
        name: 'Admin One',
        isAdmin: true,
        createdAt: new Date('2021-01-01'), // Newer than system admin
      });

      const otherAdmin = UserFactory.create({
        id: 'admin-456',
        username: 'admin2',
        name: 'Admin Two',
        isAdmin: true,
        createdAt: new Date('2022-01-01'), // Newest
      });

      const regularUser = UserFactory.create({
        id: 'user-789',
        username: 'user1',
        name: 'User One',
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
      const systemAdmin = UserFactory.create({
        id: 'admin-000',
        username: 'admin0',
        name: 'System Admin',
        isActive: false, // Inactive - oldest admin
        isAdmin: true,
        createdAt: new Date('2020-01-01'), // Oldest admin
      });

      const lastAdmin = UserFactory.create({
        id: 'admin-123',
        username: 'admin',
        name: 'Last Admin',
        isAdmin: true,
        createdAt: new Date('2021-01-01'), // Newer than system admin
      });

      const regularUser1 = UserFactory.create({
        id: 'user-456',
        username: 'user1',
        name: 'User One',
      });

      const regularUser2 = UserFactory.create({
        id: 'user-789',
        username: 'user2',
        name: 'User Two',
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
      const userToDelete = UserFactory.create({
        id: 'user-123',
        username: 'juanperez',
        name: 'Juan Pérez',
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
      const systemAdmin = UserFactory.create({
        id: 'admin-000',
        username: 'admin0',
        name: 'System Admin',
        isAdmin: true,
        createdAt: new Date('2020-01-01'),
      });

      const regularUser = UserFactory.create({
        id: 'user-123',
        username: 'juanperez',
        name: 'Juan Pérez',
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
      const systemAdmin = UserFactory.create({
        id: 'admin-000',
        username: 'admin0',
        name: 'System Admin',
        isActive: false, // Inactive
        isAdmin: true,
        createdAt: new Date('2020-01-01'), // Oldest
      });

      const adminToDelete = UserFactory.create({
        id: 'admin-123',
        username: 'admin1',
        name: 'Admin One',
        isAdmin: true,
        createdAt: new Date('2021-01-01'), // Newer than system admin
      });

      // Este admin ya está inactivo, no debería contar
      const inactiveAdmin = UserFactory.create({
        id: 'admin-456',
        username: 'admin2',
        name: 'Admin Two',
        isActive: false,
        isAdmin: true,
        createdAt: new Date('2022-01-01'),
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
