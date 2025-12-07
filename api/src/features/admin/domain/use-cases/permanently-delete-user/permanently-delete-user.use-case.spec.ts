import { NotFoundError, ValidationError } from '@shared/errors';
import { User, UserProps } from '@features/auth/domain/entities/user.entity';
import { PermanentlyDeleteUserUseCase } from './permanently-delete-user.use-case';
import {
  MockUserRepository,
  createMockUserRepository,
  createMockUserProps,
} from '@shared/testing/mock.types';

describe('PermanentlyDeleteUserUseCase', () => {
  let useCase: PermanentlyDeleteUserUseCase;
  let mockUserRepository: MockUserRepository;

  // Helper para crear mock de usuario
  const createMockUser = (overrides: Partial<UserProps> = {}): User => {
    return User.reconstruct(createMockUserProps({ name: 'Test User', ...overrides }));
  };

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();
    useCase = new PermanentlyDeleteUserUseCase(mockUserRepository);
  });

  describe('execute', () => {
    it('debería eliminar permanentemente un usuario normal', async () => {
      // Arrange
      const mockUser = createMockUser();
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.delete.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute({ userId: 'user-123' });

      // Assert
      expect(result.success).toBe(true);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
      expect(mockUserRepository.delete).toHaveBeenCalledWith('user-123');
    });

    it('debería eliminar un admin si hay más admins activos', async () => {
      // Arrange
      const adminUser = createMockUser({
        id: 'admin-1',
        username: 'admin1',
        isAdmin: true,
        isActive: true,
      });

      const otherAdmin = createMockUser({
        id: 'admin-2',
        username: 'admin2',
        isAdmin: true,
        isActive: true,
      });

      mockUserRepository.findById.mockResolvedValue(adminUser);
      mockUserRepository.findAll.mockResolvedValue([adminUser, otherAdmin]);
      mockUserRepository.delete.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute({ userId: 'admin-1' });

      // Assert
      expect(result.success).toBe(true);
      expect(mockUserRepository.delete).toHaveBeenCalledWith('admin-1');
    });

    it('debería lanzar error si el usuario no existe', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute({ userId: 'nonexistent' }),
      ).rejects.toThrow(NotFoundError);
      await expect(
        useCase.execute({ userId: 'nonexistent' }),
      ).rejects.toThrow('User not found');

      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });

    it('debería lanzar error si intenta eliminar el último admin activo', async () => {
      // Arrange
      const lastAdmin = createMockUser({
        id: 'admin-1',
        username: 'admin',
        isAdmin: true,
        isActive: true,
      });

      mockUserRepository.findById.mockResolvedValue(lastAdmin);
      mockUserRepository.findAll.mockResolvedValue([lastAdmin]);

      // Act & Assert
      await expect(
        useCase.execute({ userId: 'admin-1' }),
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute({ userId: 'admin-1' }),
      ).rejects.toThrow('Cannot permanently delete the last active admin user');

      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });

    it('debería permitir eliminar admin inactivo incluso si es el único', async () => {
      // Arrange
      const inactiveAdmin = createMockUser({
        id: 'admin-1',
        username: 'admin',
        isAdmin: true,
        isActive: false, // Admin inactivo
      });

      mockUserRepository.findById.mockResolvedValue(inactiveAdmin);
      mockUserRepository.delete.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute({ userId: 'admin-1' });

      // Assert
      expect(result.success).toBe(true);
      // No debería verificar el conteo de admins porque el usuario está inactivo
      expect(mockUserRepository.findAll).not.toHaveBeenCalled();
      expect(mockUserRepository.delete).toHaveBeenCalledWith('admin-1');
    });

    it('debería permitir eliminar usuario normal sin verificar admins', async () => {
      // Arrange
      const normalUser = createMockUser({
        id: 'user-1',
        username: 'normaluser',
        isAdmin: false,
        isActive: true,
      });

      mockUserRepository.findById.mockResolvedValue(normalUser);
      mockUserRepository.delete.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute({ userId: 'user-1' });

      // Assert
      expect(result.success).toBe(true);
      // No debería verificar el conteo de admins porque no es admin
      expect(mockUserRepository.findAll).not.toHaveBeenCalled();
      expect(mockUserRepository.delete).toHaveBeenCalledWith('user-1');
    });

    it('debería contar solo admins ACTIVOS al verificar el último admin', async () => {
      // Arrange
      const activeAdmin = createMockUser({
        id: 'admin-1',
        username: 'admin1',
        isAdmin: true,
        isActive: true,
      });

      const inactiveAdmin = createMockUser({
        id: 'admin-2',
        username: 'admin2',
        isAdmin: true,
        isActive: false, // Este no cuenta
      });

      const normalUser = createMockUser({
        id: 'user-1',
        username: 'user',
        isAdmin: false,
        isActive: true,
      });

      mockUserRepository.findById.mockResolvedValue(activeAdmin);
      mockUserRepository.findAll.mockResolvedValue([activeAdmin, inactiveAdmin, normalUser]);

      // Act & Assert
      // Solo hay 1 admin activo, no debería permitir eliminarlo
      await expect(
        useCase.execute({ userId: 'admin-1' }),
      ).rejects.toThrow(ValidationError);

      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });

    it('debería permitir eliminar admin si hay al menos 2 admins activos', async () => {
      // Arrange
      const admin1 = createMockUser({
        id: 'admin-1',
        username: 'admin1',
        isAdmin: true,
        isActive: true,
      });

      const admin2 = createMockUser({
        id: 'admin-2',
        username: 'admin2',
        isAdmin: true,
        isActive: true,
      });

      const admin3 = createMockUser({
        id: 'admin-3',
        username: 'admin3',
        isAdmin: true,
        isActive: true,
      });

      mockUserRepository.findById.mockResolvedValue(admin1);
      mockUserRepository.findAll.mockResolvedValue([admin1, admin2, admin3]);
      mockUserRepository.delete.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute({ userId: 'admin-1' });

      // Assert
      expect(result.success).toBe(true);
      expect(mockUserRepository.delete).toHaveBeenCalledWith('admin-1');
    });

    it('debería retornar success: true después de eliminar', async () => {
      // Arrange
      const mockUser = createMockUser();
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.delete.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute({ userId: 'user-123' });

      // Assert
      expect(result).toEqual({ success: true });
    });
  });
});
