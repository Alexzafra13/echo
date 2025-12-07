import { ConflictError, NotFoundError } from '@shared/errors';
import { User, UserProps } from '@features/auth/domain/entities/user.entity';
import { UpdateUserUseCase } from './update-user.use-case';
import {
  MockUserRepository,
  createMockUserRepository,
  createMockUserProps,
} from '@shared/testing/mock.types';

// Helper para crear mock de usuario
const createMockUser = (overrides: Partial<UserProps> = {}): User => {
  return User.reconstruct(createMockUserProps(overrides));
};

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
  let mockUserRepository: MockUserRepository;

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();

    useCase = new UpdateUserUseCase(mockUserRepository);
  });

  describe('execute', () => {
    it('debería actualizar el nombre del usuario correctamente', async () => {
      // Arrange
      const existingUser = createMockUser({
        id: 'user-123',
        username: 'juanperez',
        name: 'Juan',
      });

      const updatedUser = User.reconstruct({
        ...existingUser.toPrimitives(),
        name: 'Juan Pérez',
      });

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.findAll.mockResolvedValue([existingUser]);
      mockUserRepository.updatePartial.mockResolvedValue(updatedUser);

      const input = {
        userId: 'user-123',
        name: 'Juan Pérez',
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith('user-123', {
        name: 'Juan Pérez',
      });
      expect(result.name).toBe('Juan Pérez');
      expect(result.username).toBe('juanperez');
    });

    it('debería actualizar el rol de admin del usuario', async () => {
      // Arrange
      const existingUser = createMockUser({
        id: 'user-123',
        username: 'juanperez',
        name: 'Juan Pérez',
      });

      const updatedUser = User.reconstruct({
        ...existingUser.toPrimitives(),
        isAdmin: true,
      });

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.findAll.mockResolvedValue([existingUser]);
      mockUserRepository.updatePartial.mockResolvedValue(updatedUser);

      const input = {
        userId: 'user-123',
        isAdmin: true,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith('user-123', {
        isAdmin: true,
      });
      expect(result.isAdmin).toBe(true);
    });

    it('debería actualizar el estado activo del usuario', async () => {
      // Arrange
      const existingUser = createMockUser({
        id: 'user-123',
        username: 'juanperez',
        name: 'Juan Pérez',
      });

      const updatedUser = User.reconstruct({
        ...existingUser.toPrimitives(),
        isActive: false,
      });

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.findAll.mockResolvedValue([existingUser]);
      mockUserRepository.updatePartial.mockResolvedValue(updatedUser);

      const input = {
        userId: 'user-123',
        isActive: false,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith('user-123', {
        isActive: false,
      });
      expect(result.isActive).toBe(false);
    });

    it('debería actualizar múltiples campos a la vez', async () => {
      // Arrange
      const existingUser = createMockUser({
        id: 'user-123',
        username: 'juanperez',
        name: 'Juan',
      });

      const updatedUser = User.reconstruct({
        ...existingUser.toPrimitives(),
        name: 'Juan Pérez',
        isAdmin: true,
      });

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.findAll.mockResolvedValue([existingUser]);
      mockUserRepository.updatePartial.mockResolvedValue(updatedUser);

      const input = {
        userId: 'user-123',
        name: 'Juan Pérez',
        isAdmin: true,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith('user-123', {
        name: 'Juan Pérez',
        isAdmin: true,
      });
      expect(result.name).toBe('Juan Pérez');
      expect(result.isAdmin).toBe(true);
    });

    it('debería lanzar error si el usuario no existe', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      const input = {
        userId: 'nonexistent-123',
        name: 'Test',
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
      await expect(useCase.execute(input)).rejects.toThrow('User not found');
    });

    it('debería lanzar error si el username ya existe en otro usuario', async () => {
      // Arrange
      const existingUser = createMockUser({
        id: 'user-123',
        username: 'juanperez',
        name: 'Juan Pérez',
      });

      const otherUser = createMockUser({
        id: 'user-456',
        username: 'maria',
        name: 'María García',
      });

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.findAll.mockResolvedValue([existingUser, otherUser]);
      mockUserRepository.findByUsername.mockResolvedValue(otherUser);

      const input = {
        userId: 'user-123',
        username: 'maria',
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(ConflictError);
      await expect(useCase.execute(input)).rejects.toThrow('Username already exists');
    });

    it('debería permitir actualizar con el mismo username del usuario', async () => {
      // Arrange
      const existingUser = createMockUser({
        id: 'user-123',
        username: 'juanperez',
        name: 'Juan Pérez',
      });

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.findAll.mockResolvedValue([existingUser]);
      mockUserRepository.findByUsername.mockResolvedValue(existingUser);
      mockUserRepository.updatePartial.mockResolvedValue(existingUser);

      const input = {
        userId: 'user-123',
        username: 'juanperez',
        name: 'Juan Pérez Updated',
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result).toBeDefined();
      // No debe lanzar ConflictError
    });
  });
});
