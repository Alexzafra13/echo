import { NotFoundError, ValidationError } from '@shared/errors';
import { User, UserProps } from '@features/auth/domain/entities/user.entity';
import { ChangeThemeUseCase } from './change-theme.use-case';
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
  theme: 'light',
  language: 'es',
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

describe('ChangeThemeUseCase', () => {
  let useCase: ChangeThemeUseCase;
  let mockUserRepository: MockUserRepository;

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();

    useCase = new ChangeThemeUseCase(mockUserRepository);
  });

  describe('execute', () => {
    it('debería cambiar tema a dark', async () => {
      // Arrange
      const mockUser = User.reconstruct(createUserProps());

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act
      await useCase.execute({
        userId: 'user-123',
        theme: 'dark',
      });

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith('user-123', {
        theme: 'dark',
      });
    });

    it('debería cambiar tema a light', async () => {
      // Arrange
      const mockUser = User.reconstruct(createUserProps({ theme: 'dark' }));

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act
      await useCase.execute({
        userId: 'user-123',
        theme: 'light',
      });

      // Assert
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith('user-123', {
        theme: 'light',
      });
    });

    it('debería permitir establecer el mismo tema actual', async () => {
      // Arrange
      const mockUser = User.reconstruct(createUserProps({ theme: 'dark' }));

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: 'user-123',
          theme: 'dark',
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
          theme: 'dark',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('debería lanzar error si tema no es válido', async () => {
      // Arrange
      const mockUser = User.reconstruct(createUserProps({ theme: 'dark' }));

      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: 'user-123',
          theme: 'invalid-theme',
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute({
          userId: 'user-123',
          theme: 'invalid-theme',
        })
      ).rejects.toThrow('Invalid theme. Must be one of: dark, light');
    });

    it('debería lanzar error para tema vacío', async () => {
      // Arrange
      const mockUser = User.reconstruct(createUserProps({ theme: 'dark' }));

      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: 'user-123',
          theme: '',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('debería lanzar error para tema con mayúsculas', async () => {
      // Arrange
      const mockUser = User.reconstruct(createUserProps({ theme: 'dark' }));

      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: 'user-123',
          theme: 'DARK',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('debería validar tema ANTES de verificar si usuario existe', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: 'user-123',
          theme: 'invalid',
        })
      ).rejects.toThrow(ValidationError);

      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('NO debería retornar nada (void)', async () => {
      // Arrange
      const mockUser = User.reconstruct(createUserProps());

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute({
        userId: 'user-123',
        theme: 'dark',
      });

      // Assert
      expect(result).toBeUndefined();
    });

    it('debería funcionar para usuarios inactivos', async () => {
      // Arrange
      const mockUser = User.reconstruct(createUserProps({ isActive: false }));

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: 'user-123',
          theme: 'dark',
        })
      ).resolves.not.toThrow();
    });
  });
});