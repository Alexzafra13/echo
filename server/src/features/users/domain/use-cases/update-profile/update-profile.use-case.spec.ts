import { NotFoundError, ConflictError } from '@shared/errors';
import { User } from '@features/auth/domain/entities/user.entity';
import { UpdateProfileUseCase } from './update-profile.use-case';

describe('UpdateProfileUseCase', () => {
  let useCase: UpdateProfileUseCase;
  let mockUserRepository: any;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      updatePartial: jest.fn(),
    };

    useCase = new UpdateProfileUseCase(mockUserRepository);
  });

  describe('execute', () => {
    it('debería actualizar nombre y email correctamente', async () => {
      // Arrange
      const mockUser = User.reconstruct({
        id: 'user-123',
        username: 'juan',
        email: 'juan.old@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'Juan Old',
        isActive: true,
        isAdmin: false,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updatedUser = User.reconstruct({
        id: 'user-123',
        username: 'juan',
        email: 'juan.new@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'Juan Updated',
        isActive: true,
        isAdmin: false,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.updatePartial.mockResolvedValue(updatedUser);

      // Act
      const result = await useCase.execute({
        userId: 'user-123',
        name: 'Juan Updated',
        email: 'juan.new@test.com',
      });

      // Assert
      expect(result.id).toBe('user-123');
      expect(result.username).toBe('juan');
      expect(result.name).toBe('Juan Updated');
      expect(result.email).toBe('juan.new@test.com');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('juan.new@test.com');
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith('user-123', {
        name: 'Juan Updated',
        email: 'juan.new@test.com',
      });
    });

    it('debería actualizar solo el nombre', async () => {
      // Arrange
      const mockUser = User.reconstruct({
        id: 'user-123',
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'Juan Old',
        isActive: true,
        isAdmin: false,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updatedUser = User.reconstruct({
        id: 'user-123',
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'Juan Updated',
        isActive: true,
        isAdmin: false,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(updatedUser);

      // Act
      const result = await useCase.execute({
        userId: 'user-123',
        name: 'Juan Updated',
      });

      // Assert
      expect(result.name).toBe('Juan Updated');
      expect(result.email).toBe('juan@test.com');
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('debería actualizar solo el email', async () => {
      // Arrange
      const mockUser = User.reconstruct({
        id: 'user-123',
        username: 'juan',
        email: 'juan.old@test.com',
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
        id: 'user-123',
        username: 'juan',
        email: 'juan.new@test.com',
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

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.updatePartial.mockResolvedValue(updatedUser);

      // Act
      const result = await useCase.execute({
        userId: 'user-123',
        email: 'juan.new@test.com',
      });

      // Assert
      expect(result.email).toBe('juan.new@test.com');
      expect(result.name).toBe('Juan');
    });

    it('debería lanzar error si usuario no existe', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: 'invalid-id',
          name: 'New Name',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('debería lanzar error si nuevo email ya está en uso', async () => {
      // Arrange
      const mockUser = User.reconstruct({
        id: 'user-123',
        username: 'juan',
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

      const otherUser = User.reconstruct({
        id: 'user-456',
        username: 'maria',
        email: 'maria@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'María',
        isActive: true,
        isAdmin: false,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.findByEmail.mockResolvedValue(otherUser);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: 'user-123',
          email: 'maria@test.com',
        })
      ).rejects.toThrow(ConflictError);
      await expect(
        useCase.execute({
          userId: 'user-123',
          email: 'maria@test.com',
        })
      ).rejects.toThrow('Email already in use');
    });

    it('NO debería lanzar error si el nuevo email es el mismo que el actual', async () => {
      // Arrange
      const mockUser = User.reconstruct({
        id: 'user-123',
        username: 'juan',
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

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: 'user-123',
          email: 'juan@test.com',
          name: 'Juan Updated',
        })
      ).resolves.not.toThrow();

      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('NO debería incluir campos sensibles en la respuesta', async () => {
      // Arrange
      const mockUser = User.reconstruct({
        id: 'user-123',
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$super_secret_hash',
        name: 'Juan',
        isActive: true,
        isAdmin: false,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(mockUser);

      // Act
      const result = await useCase.execute({
        userId: 'user-123',
        name: 'Juan Updated',
      });

      // Assert
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('isActive');
      expect(result).not.toHaveProperty('isAdmin');
      expect(JSON.stringify(result)).not.toContain('super_secret_hash');
    });

    it('debería preservar username (no debe cambiar)', async () => {
      // Arrange
      const mockUser = User.reconstruct({
        id: 'user-123',
        username: 'juan',
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
        id: 'user-123',
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'Juan Updated',
        isActive: true,
        isAdmin: false,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(updatedUser);

      // Act
      const result = await useCase.execute({
        userId: 'user-123',
        name: 'Juan Updated',
      });

      // Assert
      expect(result.username).toBe('juan');
    });
  });
});