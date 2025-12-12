import { NotFoundError, ValidationError } from '@shared/errors';
import { User, UserProps } from '@features/auth/domain/entities/user.entity';
import { ChangeLanguageUseCase } from './change-language.use-case';
import {
  MockUserRepository,
  createMockUserRepository,
} from '@shared/testing/mock.types';

// Helper para crear UserProps con todos los campos requeridos
const createUserProps = (overrides: Partial<UserProps> = {}): UserProps => ({
  id: 'user-123',
  username: 'juan',
  passwordHash: '$2b$12$hashed',
  name: 'Juan',
  isActive: true,
  isAdmin: false,
  mustChangePassword: false,
  theme: 'dark',
  language: 'en',
  isPublicProfile: false,
  showTopTracks: true,
  showTopArtists: true,
  showTopAlbums: true,
  showPlaylists: true,
  homeSections: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('ChangeLanguageUseCase', () => {
  let useCase: ChangeLanguageUseCase;
  let mockUserRepository: MockUserRepository;

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();

    useCase = new ChangeLanguageUseCase(mockUserRepository);
  });

  describe('execute', () => {
    it('debería cambiar idioma a español', async () => {
      // Arrange
      const mockUser = User.reconstruct(createUserProps({ language: 'en' }));

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
      const mockUser = User.reconstruct(createUserProps({ language: 'es' }));

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
      const mockUser = User.reconstruct(createUserProps({ language: 'es' }));

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
      const mockUser = User.reconstruct(createUserProps({ language: 'es' }));

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
      const mockUser = User.reconstruct(createUserProps({ language: 'es' }));

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
      const mockUser = User.reconstruct(createUserProps({ language: 'es' }));

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
      const mockUser = User.reconstruct(createUserProps({ language: 'es' }));

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
      const mockUser = User.reconstruct(createUserProps({ language: 'en' }));

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
      const mockUser = User.reconstruct(createUserProps({ isActive: false, language: 'en' }));

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