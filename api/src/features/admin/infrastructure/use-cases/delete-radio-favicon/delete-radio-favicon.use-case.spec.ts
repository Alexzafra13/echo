import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getLoggerToken } from 'nestjs-pino';
import { DeleteRadioFaviconUseCase } from './delete-radio-favicon.use-case';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
import { ImageService } from '@features/external-metadata/application/services/image.service';
import { createMockPinoLogger, MockPinoLogger } from '@shared/testing/mock.types';

describe('DeleteRadioFaviconUseCase', () => {
  let useCase: DeleteRadioFaviconUseCase;
  let mockLogger: MockPinoLogger;
  let mockDrizzle: {
    db: {
      select: jest.Mock;
      delete: jest.Mock;
    };
  };
  let mockStorage: {
    deleteImage: jest.Mock;
  };
  let mockImageService: {
    invalidateRadioFaviconCache: jest.Mock;
  };

  const existingImage = {
    id: 'image-123',
    filePath: '/data/uploads/radio/station-uuid/favicon.png',
  };

  beforeEach(async () => {
    mockLogger = createMockPinoLogger();

    const mockSelectResult = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([existingImage]),
    };

    const mockDeleteResult = {
      where: jest.fn().mockResolvedValue(undefined),
    };

    mockDrizzle = {
      db: {
        select: jest.fn().mockReturnValue(mockSelectResult),
        delete: jest.fn().mockReturnValue(mockDeleteResult),
      },
    };

    mockStorage = {
      deleteImage: jest.fn().mockResolvedValue(undefined),
    };

    mockImageService = {
      invalidateRadioFaviconCache: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteRadioFaviconUseCase,
        { provide: getLoggerToken(DeleteRadioFaviconUseCase.name), useValue: mockLogger },
        { provide: DrizzleService, useValue: mockDrizzle },
        { provide: StorageService, useValue: mockStorage },
        { provide: ImageService, useValue: mockImageService },
      ],
    }).compile();

    useCase = module.get<DeleteRadioFaviconUseCase>(DeleteRadioFaviconUseCase);
  });

  it('debería estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute - eliminación exitosa', () => {
    it('debería eliminar el favicon correctamente', async () => {
      const result = await useCase.execute({ stationUuid: 'station-uuid' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted successfully');
    });

    it('debería eliminar el archivo del storage', async () => {
      await useCase.execute({ stationUuid: 'station-uuid' });

      expect(mockStorage.deleteImage).toHaveBeenCalledWith(existingImage.filePath);
    });

    it('debería eliminar el registro de la base de datos', async () => {
      await useCase.execute({ stationUuid: 'station-uuid' });

      expect(mockDrizzle.db.delete).toHaveBeenCalled();
    });

    it('debería invalidar la cache', async () => {
      await useCase.execute({ stationUuid: 'station-uuid' });

      expect(mockImageService.invalidateRadioFaviconCache).toHaveBeenCalledWith('station-uuid');
    });

    it('no debería fallar si la eliminación del archivo falla', async () => {
      mockStorage.deleteImage.mockRejectedValueOnce(new Error('Disk error'));

      const result = await useCase.execute({ stationUuid: 'station-uuid' });

      expect(result.success).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('execute - favicon no encontrado', () => {
    it('debería lanzar NotFoundException si no existe favicon custom', async () => {
      const mockSelectResult = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockDrizzle.db.select.mockReturnValue(mockSelectResult);

      await expect(
        useCase.execute({ stationUuid: 'nonexistent-uuid' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
