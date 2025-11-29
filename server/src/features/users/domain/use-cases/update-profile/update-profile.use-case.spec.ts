import { NotFoundError } from '@shared/errors';
import { User } from '@features/auth/domain/entities/user.entity';
import { UpdateProfileUseCase } from './update-profile.use-case';

describe('UpdateProfileUseCase', () => {
  let useCase: UpdateProfileUseCase;
  let mockUserRepository: any;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      updatePartial: jest.fn(),
    };

    useCase = new UpdateProfileUseCase(mockUserRepository);
  });

  describe('execute', () => {
    it('debería actualizar nombre correctamente', async () => {
      // Arrange
      const mockUser = User.reconstruct({
        id: 'user-123',
        username: 'juan',
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
      expect(result.id).toBe('user-123');
      expect(result.username).toBe('juan');
      expect(result.name).toBe('Juan Updated');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith('user-123', {
        name: 'Juan Updated',
      });
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

    it('NO debería incluir campos sensibles en la respuesta', async () => {
      // Arrange
      const mockUser = User.reconstruct({
        id: 'user-123',
        username: 'juan',
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
