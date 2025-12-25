import { NotFoundError } from '@shared/errors';
import { DeleteAvatarUseCase } from './delete-avatar.use-case';
import {
  MockUserRepository,
  createMockUserRepository,
  createMockPinoLogger,
} from '@shared/testing/mock.types';
import { UserFactory } from '@test/factories/user.factory';

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
      const mockUser = UserFactory.create({
        avatarPath: '/avatars/user-123.jpg',
        avatarMimeType: 'image/jpeg',
        avatarSize: 1024,
        avatarUpdatedAt: new Date(),
      });
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockStorageService.deleteImage.mockResolvedValue(undefined);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act
      await useCase.execute({ userId: mockUser.id });

      // Assert
      expect(mockStorageService.deleteImage).toHaveBeenCalledWith('/avatars/user-123.jpg');
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith(mockUser.id, {
        avatarPath: null,
        avatarMimeType: null,
        avatarSize: null,
        avatarUpdatedAt: null,
      });
      expect(mockImageService.invalidateUserAvatarCache).toHaveBeenCalledWith(mockUser.id);
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
      const userWithoutAvatar = UserFactory.create({
        avatarPath: undefined,
        avatarMimeType: undefined,
        avatarSize: undefined,
        avatarUpdatedAt: undefined,
      });
      mockUserRepository.findById.mockResolvedValue(userWithoutAvatar);

      // Act & Assert
      await expect(
        useCase.execute({ userId: userWithoutAvatar.id }),
      ).resolves.not.toThrow();

      expect(mockStorageService.deleteImage).not.toHaveBeenCalled();
      expect(mockUserRepository.updatePartial).not.toHaveBeenCalled();
    });

    it('debería continuar si falla al eliminar el archivo', async () => {
      // Arrange
      const mockUser = UserFactory.create({
        avatarPath: '/avatars/user-123.jpg',
        avatarMimeType: 'image/jpeg',
        avatarSize: 1024,
        avatarUpdatedAt: new Date(),
      });
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockStorageService.deleteImage.mockRejectedValue(new Error('File not found'));
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act
      await useCase.execute({ userId: mockUser.id });

      // Assert - Should continue despite storage error
      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith(mockUser.id, {
        avatarPath: null,
        avatarMimeType: null,
        avatarSize: null,
        avatarUpdatedAt: null,
      });
      expect(mockImageService.invalidateUserAvatarCache).toHaveBeenCalledWith(mockUser.id);
    });

    it('debería invalidar el cache después de eliminar', async () => {
      // Arrange
      const mockUser = UserFactory.create({
        avatarPath: '/avatars/user-123.jpg',
        avatarMimeType: 'image/jpeg',
        avatarSize: 1024,
        avatarUpdatedAt: new Date(),
      });
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockStorageService.deleteImage.mockResolvedValue(undefined);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act
      await useCase.execute({ userId: mockUser.id });

      // Assert
      expect(mockImageService.invalidateUserAvatarCache).toHaveBeenCalledWith(mockUser.id);
    });

    it('debería retornar void (undefined)', async () => {
      // Arrange
      const mockUser = UserFactory.create({
        avatarPath: '/avatars/user-123.jpg',
        avatarMimeType: 'image/jpeg',
        avatarSize: 1024,
        avatarUpdatedAt: new Date(),
      });
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockStorageService.deleteImage.mockResolvedValue(undefined);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute({ userId: mockUser.id });

      // Assert
      expect(result).toBeUndefined();
    });

    it('debería manejar avatarPath null', async () => {
      // Arrange
      const userWithNullAvatar = UserFactory.create({
        avatarPath: undefined,
      });
      mockUserRepository.findById.mockResolvedValue(userWithNullAvatar);

      // Act & Assert
      await expect(
        useCase.execute({ userId: userWithNullAvatar.id }),
      ).resolves.not.toThrow();

      expect(mockStorageService.deleteImage).not.toHaveBeenCalled();
    });
  });
});
