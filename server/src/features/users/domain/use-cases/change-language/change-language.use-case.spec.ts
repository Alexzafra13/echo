import { NotFoundError, ValidationError } from '@shared/errors';
import { User } from '@features/auth/domain/entities/user.entity';
import { ChangeLanguageUseCase } from './change-language.use-case';

describe('ChangeLanguageUseCase', () => {
  let useCase: ChangeLanguageUseCase;
  let mockUserRepository: any;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      updatePartial: jest.fn(),
    };

    useCase = new ChangeLanguageUseCase(mockUserRepository);
  });

  describe('execute', () => {
    it('debería cambiar idioma a español', async () => {
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
        language: 'en',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act
      await useCase.execute({
        userId: 'user-123',
        language: 'es',
      });

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith('user-123', {
        language: 'es',
      });
    });

    it('debería cambiar idioma a inglés', async () => {
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

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act
      await useCase.execute({
        userId: 'user-123',
        language: 'en',
      });

      // Assert
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith('user-123', {
        language: 'en',
      });
    });

    it('debería permitir establecer el mismo idioma actual', async () => {
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

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: 'user-123',
          language: 'es',
        })
      ).resolves.not.toThrow();
    });

    it('debería lanzar error si usuario no existe', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: 'invalid-id',
          language: 'es',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('debería lanzar error si idioma no es válido', async () => {
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

      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: 'user-123',
          language: 'fr',
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute({
          userId: 'user-123',
          language: 'fr',
        })
      ).rejects.toThrow('Invalid language. Must be one of: es, en');
    });

    it('debería lanzar error para idioma vacío', async () => {
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

      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: 'user-123',
          language: '',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('debería lanzar error para idioma con mayúsculas', async () => {
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

      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: 'user-123',
          language: 'ES',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('debería validar idioma ANTES de verificar si usuario existe', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: 'user-123',
          language: 'fr',
        })
      ).rejects.toThrow(ValidationError);

      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('debería rechazar códigos de idioma con región', async () => {
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

      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act & Assert
      const regionalCodes = ['es-ES', 'es-MX', 'en-US', 'en-GB'];

      for (const code of regionalCodes) {
        await expect(
          useCase.execute({
            userId: 'user-123',
            language: code,
          })
        ).rejects.toThrow(ValidationError);
      }
    });

    it('NO debería retornar nada (void)', async () => {
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
        language: 'en',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute({
        userId: 'user-123',
        language: 'es',
      });

      // Assert
      expect(result).toBeUndefined();
    });

    it('debería funcionar para usuarios inactivos', async () => {
      // Arrange
      const mockUser = User.reconstruct({
        id: 'user-123',
        username: 'juan',
        passwordHash: '$2b$12$hashed',
        name: 'Juan',
        isActive: false,
        isAdmin: false,
        mustChangePassword: false,
        theme: 'dark',
        language: 'en',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: 'user-123',
          language: 'es',
        })
      ).resolves.not.toThrow();
    });
  });
});