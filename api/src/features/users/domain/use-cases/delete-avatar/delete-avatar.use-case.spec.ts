import { NotFoundError } from '@shared/errors';
import { User } from '@features/auth/domain/entities/user.entity';
import { DeleteAvatarUseCase } from './delete-avatar.use-case';
import {
  MockUserRepository,
  createMockUserRepository,
  createMockPinoLogger,
} from '@shared/testing/mock.types';

describe('DeleteAvatarUseCase', () => {
  let useCase: DeleteAvatarUseCase;
  let mockUserRepository: MockUserRepository;
  let mockStorageService: {
    deleteImage: jest.Mock;
  };
  let mockImageService: {
    invalidateUserAvatarCache: jest.Mock;
  };
  let mockLogger: ReturnType<typeof createMockPinoLogger>;

  const createMockUser = (overrides = {}): User => {
    return User.reconstruct({
      id: 'user-123',
      username: 'testuser',
      passwordHash: '$2b$12$hashed',
      name: 'Test User',
      isActive: true,
      isAdmin: false,
      mustChangePassword: false,
      theme: 'dark',
      language: 'es',
      avatarPath: '/avatars/user-123.jpg',
      avatarMimeType: 'image/jpeg',
      avatarSize: 1024,
      avatarUpdatedAt: new Date(),
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
  };

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();
    mockLogger = createMockPinoLogger();
    mockStorageService = {
      deleteImage: jest.fn(),
    };
    mockImageService = {
      invalidateUserAvatarCache: jest.fn(),
    };

    useCase = new DeleteAvatarUseCase(
      mockLogger as any,
      mockUserRepository,
      mockStorageService as any,
      mockImageService as any,
    );
  });

  describe('execute', () => {
    it('debería eliminar el avatar correctamente', async () => {
      // Arrange
      const mockUser = createMockUser();
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockStorageService.deleteImage.mockResolvedValue(undefined);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act
      await useCase.execute({ userId: 'user-123' });

      // Assert
      expect(mockStorageService.deleteImage).toHaveBeenCalledWith('/avatars/user-123.jpg');
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith('user-123', {
        avatarPath: null,
        avatarMimeType: null,
        avatarSize: null,
        avatarUpdatedAt: null,
      });
      expect(mockImageService.invalidateUserAvatarCache).toHaveBeenCalledWith('user-123');
    });

    it('debería lanzar error si el usuario no existe', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute({ userId: 'nonexistent' }),
      ).rejects.toThrow(NotFoundError);

      expect(mockStorageService.deleteImage).not.toHaveBeenCalled();
      expect(mockUserRepository.updatePartial).not.toHaveBeenCalled();
    });

    it('debería retornar sin error si el usuario no tiene avatar', async () => {
      // Arrange
      const userWithoutAvatar = createMockUser({
        avatarPath: undefined,
        avatarMimeType: undefined,
        avatarSize: undefined,
        avatarUpdatedAt: undefined,
      });
      mockUserRepository.findById.mockResolvedValue(userWithoutAvatar);

      // Act & Assert
      await expect(
        useCase.execute({ userId: 'user-123' }),
      ).resolves.not.toThrow();

      expect(mockStorageService.deleteImage).not.toHaveBeenCalled();
      expect(mockUserRepository.updatePartial).not.toHaveBeenCalled();
    });

    it('debería continuar si falla al eliminar el archivo', async () => {
      // Arrange
      const mockUser = createMockUser();
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockStorageService.deleteImage.mockRejectedValue(new Error('File not found'));
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act
      await useCase.execute({ userId: 'user-123' });

      // Assert - Should continue despite storage error
      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith('user-123', {
        avatarPath: null,
        avatarMimeType: null,
        avatarSize: null,
        avatarUpdatedAt: null,
      });
      expect(mockImageService.invalidateUserAvatarCache).toHaveBeenCalledWith('user-123');
    });

    it('debería invalidar el cache después de eliminar', async () => {
      // Arrange
      const mockUser = createMockUser();
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockStorageService.deleteImage.mockResolvedValue(undefined);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act
      await useCase.execute({ userId: 'user-123' });

      // Assert
      expect(mockImageService.invalidateUserAvatarCache).toHaveBeenCalledWith('user-123');
    });

    it('debería retornar void (undefined)', async () => {
      // Arrange
      const mockUser = createMockUser();
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockStorageService.deleteImage.mockResolvedValue(undefined);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute({ userId: 'user-123' });

      // Assert
      expect(result).toBeUndefined();
    });

    it('debería manejar avatarPath null', async () => {
      // Arrange
      const userWithNullAvatar = createMockUser({
        avatarPath: null,
      });
      mockUserRepository.findById.mockResolvedValue(userWithNullAvatar);

      // Act & Assert
      await expect(
        useCase.execute({ userId: 'user-123' }),
      ).resolves.not.toThrow();

      expect(mockStorageService.deleteImage).not.toHaveBeenCalled();
    });
  });
});
