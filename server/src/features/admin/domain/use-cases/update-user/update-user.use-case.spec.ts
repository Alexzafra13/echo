import { ConflictError, NotFoundError, ValidationError } from '@shared/errors';
import { User } from '@features/auth/domain/entities/user.entity';
import { UpdateUserUseCase } from './update-user.use-case';

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
  let mockUserRepository: any;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      updatePartial: jest.fn(),
    };

    useCase = new UpdateUserUseCase(mockUserRepository);
  });

  describe('execute', () => {
    it('debería actualizar el nombre del usuario correctamente', async () => {
      // Arrange
      const existingUser = User.reconstruct({
        id: 'user-123',
        username: 'juanperez',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'Juan',
        isActive: true,
        isAdmin: false,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updatedUser = User.reconstruct({
        ...existingUser.toPrimitives(),
        name: 'Juan Pérez',
      });

      mockUserRepository.findById.mockResolvedValue(existingUser);
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

    it('debería actualizar el email del usuario correctamente', async () => {
      // Arrange
      const existingUser = User.reconstruct({
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

      const updatedUser = User.reconstruct({
        ...existingUser.toPrimitives(),
        email: 'juan.perez@test.com',
      });

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.updatePartial.mockResolvedValue(updatedUser);

      const input = {
        userId: 'user-123',
        email: 'juan.perez@test.com',
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('juan.perez@test.com');
      expect(result.email).toBe('juan.perez@test.com');
    });

    it('debería actualizar el rol de admin del usuario', async () => {
      // Arrange
      const existingUser = User.reconstruct({
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

      const updatedUser = User.reconstruct({
        ...existingUser.toPrimitives(),
        isAdmin: true,
      });

      mockUserRepository.findById.mockResolvedValue(existingUser);
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
      const existingUser = User.reconstruct({
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

      const updatedUser = User.reconstruct({
        ...existingUser.toPrimitives(),
        isActive: false,
      });

      mockUserRepository.findById.mockResolvedValue(existingUser);
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
      const existingUser = User.reconstruct({
        id: 'user-123',
        username: 'juanperez',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'Juan',
        isActive: true,
        isAdmin: false,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updatedUser = User.reconstruct({
        ...existingUser.toPrimitives(),
        name: 'Juan Pérez',
        email: 'juan.perez@test.com',
        isAdmin: true,
      });

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.updatePartial.mockResolvedValue(updatedUser);

      const input = {
        userId: 'user-123',
        name: 'Juan Pérez',
        email: 'juan.perez@test.com',
        isAdmin: true,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith('user-123', {
        name: 'Juan Pérez',
        email: 'juan.perez@test.com',
        isAdmin: true,
      });
      expect(result.name).toBe('Juan Pérez');
      expect(result.email).toBe('juan.perez@test.com');
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

    it('debería lanzar error si el email ya existe en otro usuario', async () => {
      // Arrange
      const existingUser = User.reconstruct({
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

      const otherUser = User.reconstruct({
        id: 'user-456',
        username: 'maria',
        email: 'maria@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'María García',
        isActive: true,
        isAdmin: false,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.findByEmail.mockResolvedValue(otherUser);

      const input = {
        userId: 'user-123',
        email: 'maria@test.com',
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(ConflictError);
      await expect(useCase.execute(input)).rejects.toThrow('Email already exists');
    });

    it('debería permitir actualizar con el mismo email del usuario', async () => {
      // Arrange
      const existingUser = User.reconstruct({
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

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);
      mockUserRepository.updatePartial.mockResolvedValue(existingUser);

      const input = {
        userId: 'user-123',
        email: 'juan@test.com',
        name: 'Juan Pérez Updated',
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result).toBeDefined();
      // No debe lanzar ConflictError
    });

    it('debería lanzar error si el formato del email es inválido', async () => {
      // Arrange
      const existingUser = User.reconstruct({
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

      mockUserRepository.findById.mockResolvedValue(existingUser);

      const input = {
        userId: 'user-123',
        email: 'invalid-email',
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(ValidationError);
      await expect(useCase.execute(input)).rejects.toThrow('Invalid email format');
    });

    it('debería permitir email vacío (sin validación)', async () => {
      // Arrange
      const existingUser = User.reconstruct({
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

      const updatedUser = User.reconstruct({
        ...existingUser.toPrimitives(),
        email: '',
      });

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.updatePartial.mockResolvedValue(updatedUser);

      const input = {
        userId: 'user-123',
        email: '',
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result).toBeDefined();
      // No debe lanzar ValidationError para email vacío
    });

    it('no debería verificar email duplicado si no se está cambiando', async () => {
      // Arrange
      const existingUser = User.reconstruct({
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

      const updatedUser = User.reconstruct({
        ...existingUser.toPrimitives(),
        name: 'Juan Pérez Updated',
      });

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.updatePartial.mockResolvedValue(updatedUser);

      const input = {
        userId: 'user-123',
        name: 'Juan Pérez Updated',
      };

      // Act
      await useCase.execute(input);

      // Assert
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });
  });
});
