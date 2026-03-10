import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getLoggerToken } from 'nestjs-pino';
import { UploadRadioFaviconUseCase } from './upload-radio-favicon.use-case';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
import { ImageService } from '@features/external-metadata/application/services/image.service';
import { createMockPinoLogger, MockPinoLogger } from '@shared/testing/mock.types';

// Mock validateFileUpload and getExtensionFromMimeType
jest.mock('@shared/utils', () => ({
  validateFileUpload: jest.fn(),
  getExtensionFromMimeType: jest.fn((mime: string) => {
    if (mime === 'image/png') return 'png';
    if (mime === 'image/webp') return 'webp';
    return 'jpg';
  }),
  FILE_UPLOAD_CONFIGS: {
    image: { maxSize: 10485760, allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] },
  },
}));

describe('UploadRadioFaviconUseCase', () => {
  let useCase: UploadRadioFaviconUseCase;
  let mockLogger: MockPinoLogger;
  let mockDrizzle: {
    db: {
      select: jest.Mock;
      insert: jest.Mock;
      update: jest.Mock;
    };
  };
  let mockStorage: {
    getRadioFaviconPath: jest.Mock;
    saveImage: jest.Mock;
    deleteImage: jest.Mock;
  };
  let mockImageService: {
    invalidateRadioFaviconCache: jest.Mock;
  };

  const validInput = {
    stationUuid: 'test-station-uuid',
    file: {
      buffer: Buffer.from('test-image-data'),
      mimetype: 'image/png',
      size: 1024,
      originalname: 'favicon.png',
    },
    uploadedBy: 'admin-123',
  };

  beforeEach(async () => {
    mockLogger = createMockPinoLogger();

    // Setup drizzle mock with chainable API
    const mockSelectResult = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    };

    const mockInsertResult = {
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: 'new-image-id' }]),
    };

    const mockUpdateResult = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue(undefined),
    };

    mockDrizzle = {
      db: {
        select: jest.fn().mockReturnValue(mockSelectResult),
        insert: jest.fn().mockReturnValue(mockInsertResult),
        update: jest.fn().mockReturnValue(mockUpdateResult),
      },
    };

    mockStorage = {
      getRadioFaviconPath: jest.fn().mockResolvedValue('/data/uploads/radio/test-station-uuid/favicon.png'),
      saveImage: jest.fn().mockResolvedValue(undefined),
      deleteImage: jest.fn().mockResolvedValue(undefined),
    };

    mockImageService = {
      invalidateRadioFaviconCache: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadRadioFaviconUseCase,
        { provide: getLoggerToken(UploadRadioFaviconUseCase.name), useValue: mockLogger },
        { provide: DrizzleService, useValue: mockDrizzle },
        { provide: StorageService, useValue: mockStorage },
        { provide: ImageService, useValue: mockImageService },
      ],
    }).compile();

    useCase = module.get<UploadRadioFaviconUseCase>(UploadRadioFaviconUseCase);
  });

  it('debería estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute - nuevo favicon', () => {
    it('debería subir un favicon nuevo correctamente', async () => {
      const result = await useCase.execute(validInput);

      expect(result.success).toBe(true);
      expect(result.message).toContain('uploaded successfully');
      expect(result.imageId).toBe('new-image-id');
      expect(result.url).toBe('/api/images/radio/test-station-uuid/favicon');
    });

    it('debería obtener la ruta del storage', async () => {
      await useCase.execute(validInput);

      expect(mockStorage.getRadioFaviconPath).toHaveBeenCalledWith('test-station-uuid', 'png');
    });

    it('debería guardar la imagen en el storage', async () => {
      await useCase.execute(validInput);

      expect(mockStorage.saveImage).toHaveBeenCalledWith(
        '/data/uploads/radio/test-station-uuid/favicon.png',
        validInput.file.buffer,
      );
    });

    it('debería insertar el registro en la base de datos', async () => {
      await useCase.execute(validInput);

      expect(mockDrizzle.db.insert).toHaveBeenCalled();
    });

    it('debería invalidar la cache', async () => {
      await useCase.execute(validInput);

      expect(mockImageService.invalidateRadioFaviconCache).toHaveBeenCalledWith('test-station-uuid');
    });
  });

  describe('execute - actualizar favicon existente', () => {
    beforeEach(() => {
      const mockSelectResult = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'existing-id', filePath: '/old/path.png' }]),
      };
      mockDrizzle.db.select.mockReturnValue(mockSelectResult);
    });

    it('debería eliminar el archivo anterior', async () => {
      await useCase.execute(validInput);

      expect(mockStorage.deleteImage).toHaveBeenCalledWith('/old/path.png');
    });

    it('debería actualizar el registro existente', async () => {
      await useCase.execute(validInput);

      expect(mockDrizzle.db.update).toHaveBeenCalled();
    });

    it('debería retornar el ID existente', async () => {
      const result = await useCase.execute(validInput);

      expect(result.imageId).toBe('existing-id');
    });

    it('no debería fallar si la eliminación del archivo anterior falla', async () => {
      mockStorage.deleteImage.mockRejectedValueOnce(new Error('File not found'));

      const result = await useCase.execute(validInput);

      expect(result.success).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('execute - validaciones', () => {
    it('debería lanzar BadRequestException si stationUuid está vacío', async () => {
      await expect(
        useCase.execute({ ...validInput, stationUuid: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería lanzar BadRequestException si stationUuid solo tiene espacios', async () => {
      await expect(
        useCase.execute({ ...validInput, stationUuid: '   ' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
