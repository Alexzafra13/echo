import { BadRequestException } from '@nestjs/common';
import { NotFoundError } from '@shared/errors';
import { UploadAvatarUseCase } from './upload-avatar.use-case';
import {
  MockUserRepository,
  createMockUserRepository,
  createMockPinoLogger,
} from '@shared/testing/mock.types';
import { UserFactory } from '@shared/testing/factories/user.factory';
import { PinoLogger } from 'nestjs-pino';
import { IStorageService } from '@features/external-metadata/domain/ports';
import { ImageService } from '@features/external-metadata/application/services/image.service';
import { UploadAvatarInput } from './upload-avatar.dto';

describe('UploadAvatarUseCase', () => {
  let useCase: UploadAvatarUseCase;
  let mockUserRepository: MockUserRepository;
  let mockStorageService: {
    deleteImage: jest.Mock;
    getUserAvatarPath: jest.Mock;
    saveImage: jest.Mock;
  };
  let mockImageService: {
    invalidateUserAvatarCache: jest.Mock;
  };
  let mockLogger: ReturnType<typeof createMockPinoLogger>;

  // Valid magic bytes for each supported image type
  const MAGIC_BYTES: Record<string, number[]> = {
    'image/jpeg': [0xff, 0xd8, 0xff, 0xe0, ...Array(20).fill(0x00)],
    'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array(16).fill(0x00)],
    'image/webp': [
      0x52,
      0x49,
      0x46,
      0x46,
      0x00,
      0x00,
      0x00,
      0x00,
      0x57,
      0x45,
      0x42,
      0x50,
      ...Array(12).fill(0x00),
    ],
  };

  const createMockFile = (overrides: Record<string, unknown> = {}): UploadAvatarInput['file'] => {
    const mimetype = (overrides.mimetype as string) ?? 'image/jpeg';
    const magicBytes = MAGIC_BYTES[mimetype] ?? Array(24).fill(0x00);
    return {
      buffer: Buffer.from(magicBytes),
      size: 1024,
      mimetype,
      ...overrides,
    };
  };

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();
    mockLogger = createMockPinoLogger();
    mockStorageService = {
      deleteImage: jest.fn(),
      getUserAvatarPath: jest.fn(),
      saveImage: jest.fn(),
    };
    mockImageService = {
      invalidateUserAvatarCache: jest.fn(),
    };

    useCase = new UploadAvatarUseCase(
      mockLogger as unknown as PinoLogger,
      mockUserRepository,
      mockStorageService as unknown as IStorageService,
      mockImageService as unknown as ImageService
    );
  });

  describe('execute', () => {
    it('debería subir un avatar correctamente', async () => {
      // Arrange
      const mockUser = UserFactory.create();
      const mockFile = createMockFile();

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockStorageService.getUserAvatarPath.mockResolvedValue('/avatars/user-123.jpg');
      mockStorageService.saveImage.mockResolvedValue(undefined);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute({
        userId: mockUser.id,
        file: mockFile,
      });

      // Assert
      expect(result.avatarPath).toBe('/avatars/user-123.jpg');
      expect(result.avatarSize).toBe(1024);
      expect(result.avatarMimeType).toBe('image/jpeg');
      expect(mockStorageService.saveImage).toHaveBeenCalledWith(
        '/avatars/user-123.jpg',
        mockFile.buffer
      );
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith(mockUser.id, {
        avatarPath: '/avatars/user-123.jpg',
        avatarMimeType: 'image/jpeg',
        avatarSize: 1024,
        avatarUpdatedAt: expect.any(Date),
      });
      expect(mockImageService.invalidateUserAvatarCache).toHaveBeenCalledWith(mockUser.id);
    });

    it('debería eliminar el avatar anterior si existe', async () => {
      // Arrange
      const mockUser = UserFactory.create({
        avatarPath: '/avatars/user-123-old.jpg',
      });
      const mockFile = createMockFile();

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockStorageService.deleteImage.mockResolvedValue(undefined);
      mockStorageService.getUserAvatarPath.mockResolvedValue('/avatars/user-123.jpg');
      mockStorageService.saveImage.mockResolvedValue(undefined);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act
      await useCase.execute({
        userId: mockUser.id,
        file: mockFile,
      });

      // Assert
      expect(mockStorageService.deleteImage).toHaveBeenCalledWith('/avatars/user-123-old.jpg');
    });

    it('debería continuar si falla al eliminar el avatar anterior', async () => {
      // Arrange
      const mockUser = UserFactory.create({
        avatarPath: '/avatars/user-123-old.jpg',
      });
      const mockFile = createMockFile();

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockStorageService.deleteImage.mockRejectedValue(new Error('File not found'));
      mockStorageService.getUserAvatarPath.mockResolvedValue('/avatars/user-123.jpg');
      mockStorageService.saveImage.mockResolvedValue(undefined);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute({
        userId: mockUser.id,
        file: mockFile,
      });

      // Assert - Should continue despite error
      expect(result.avatarPath).toBe('/avatars/user-123.jpg');
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('debería lanzar error si el usuario no existe', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);
      const mockFile = createMockFile();

      // Act & Assert
      await expect(
        useCase.execute({
          userId: 'nonexistent',
          file: mockFile,
        })
      ).rejects.toThrow(NotFoundError);

      expect(mockStorageService.saveImage).not.toHaveBeenCalled();
    });

    it('debería lanzar error si el archivo es muy grande (>5MB)', async () => {
      // Arrange
      const mockUser = UserFactory.create();
      const largeFile = createMockFile({
        size: 6 * 1024 * 1024, // 6MB
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: mockUser.id,
          file: largeFile,
        })
      ).rejects.toThrow(BadRequestException);
      await expect(
        useCase.execute({
          userId: mockUser.id,
          file: largeFile,
        })
      ).rejects.toThrow('File size exceeds 5MB limit');

      expect(mockStorageService.saveImage).not.toHaveBeenCalled();
    });

    it('debería lanzar error si el tipo MIME no es válido', async () => {
      // Arrange
      const mockUser = UserFactory.create();
      const invalidFile = createMockFile({
        mimetype: 'image/gif', // Not allowed
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: mockUser.id,
          file: invalidFile,
        })
      ).rejects.toThrow(BadRequestException);
      await expect(
        useCase.execute({
          userId: mockUser.id,
          file: invalidFile,
        })
      ).rejects.toThrow('Invalid file type');

      expect(mockStorageService.saveImage).not.toHaveBeenCalled();
    });

    it('debería aceptar imagen PNG', async () => {
      // Arrange
      const mockUser = UserFactory.create();
      const pngFile = createMockFile({
        mimetype: 'image/png',
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockStorageService.getUserAvatarPath.mockResolvedValue('/avatars/user-123.png');
      mockStorageService.saveImage.mockResolvedValue(undefined);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute({
        userId: mockUser.id,
        file: pngFile,
      });

      // Assert
      expect(result.avatarMimeType).toBe('image/png');
    });

    it('debería aceptar imagen WebP', async () => {
      // Arrange
      const mockUser = UserFactory.create();
      const webpFile = createMockFile({
        mimetype: 'image/webp',
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockStorageService.getUserAvatarPath.mockResolvedValue('/avatars/user-123.webp');
      mockStorageService.saveImage.mockResolvedValue(undefined);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute({
        userId: mockUser.id,
        file: webpFile,
      });

      // Assert
      expect(result.avatarMimeType).toBe('image/webp');
    });

    it('debería rechazar archivos PDF', async () => {
      // Arrange
      const mockUser = UserFactory.create();
      const pdfFile = createMockFile({
        mimetype: 'application/pdf',
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: mockUser.id,
          file: pdfFile,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('debería permitir exactamente 5MB', async () => {
      // Arrange
      const mockUser = UserFactory.create();
      const exactSizeFile = createMockFile({
        size: 5 * 1024 * 1024, // Exactamente 5MB
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockStorageService.getUserAvatarPath.mockResolvedValue('/avatars/user-123.jpg');
      mockStorageService.saveImage.mockResolvedValue(undefined);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute({
        userId: mockUser.id,
        file: exactSizeFile,
      });

      // Assert
      expect(result.avatarSize).toBe(5 * 1024 * 1024);
    });
  });
});
