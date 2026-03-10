import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { RadioFaviconsController } from './radio-favicons.controller';
import { UploadRadioFaviconUseCase } from '../infrastructure/use-cases/upload-radio-favicon';
import { DeleteRadioFaviconUseCase } from '../infrastructure/use-cases/delete-radio-favicon';
import { RadioFaviconFetchService } from '@features/radio/domain/services/radio-favicon-fetch.service';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { MockUseCase, createMockUseCase } from '@shared/testing/mock.types';

describe('RadioFaviconsController', () => {
  let controller: RadioFaviconsController;
  let mockUploadUseCase: MockUseCase;
  let mockDeleteUseCase: MockUseCase;
  let mockFetchService: { fetchAndSave: jest.Mock };

  beforeEach(async () => {
    mockUploadUseCase = createMockUseCase();
    mockDeleteUseCase = createMockUseCase();
    mockFetchService = { fetchAndSave: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RadioFaviconsController],
      providers: [
        { provide: UploadRadioFaviconUseCase, useValue: mockUploadUseCase },
        { provide: DeleteRadioFaviconUseCase, useValue: mockDeleteUseCase },
        { provide: RadioFaviconFetchService, useValue: mockFetchService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<RadioFaviconsController>(RadioFaviconsController);
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('upload', () => {
    const createMockRequest = (options: {
      fileData?: Buffer;
      mimetype?: string;
      filename?: string;
      hasFile?: boolean;
    } = {}) => {
      const {
        fileData = Buffer.from('test-image-data'),
        mimetype = 'image/png',
        filename = 'favicon.png',
        hasFile = true,
      } = options;

      return {
        file: jest.fn().mockResolvedValue(
          hasFile
            ? {
                mimetype,
                filename,
                toBuffer: jest.fn().mockResolvedValue(fileData),
              }
            : null,
        ),
        user: { id: 'admin-123' },
      } as any;
    };

    it('debería subir un favicon correctamente', async () => {
      const uploadResult = {
        success: true,
        message: 'Uploaded',
        imageId: 'img-1',
        url: '/api/images/radio/station-1/favicon',
      };
      mockUploadUseCase.execute.mockResolvedValue(uploadResult);

      const request = createMockRequest();
      const result = await controller.upload('station-1', request);

      expect(result).toEqual(uploadResult);
      expect(mockUploadUseCase.execute).toHaveBeenCalledWith({
        stationUuid: 'station-1',
        file: expect.objectContaining({
          mimetype: 'image/png',
        }),
        uploadedBy: 'admin-123',
      });
    });

    it('debería lanzar error si no hay archivo', async () => {
      const request = createMockRequest({ hasFile: false });

      await expect(
        controller.upload('station-1', request),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería lanzar error si el archivo excede 10MB', async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      const request = createMockRequest({ fileData: largeBuffer });

      await expect(
        controller.upload('station-1', request),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería lanzar error si el tipo MIME no es válido', async () => {
      const request = createMockRequest({ mimetype: 'image/gif' });

      await expect(
        controller.upload('station-1', request),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería aceptar image/jpeg', async () => {
      mockUploadUseCase.execute.mockResolvedValue({ success: true });
      const request = createMockRequest({ mimetype: 'image/jpeg' });

      const result = await controller.upload('station-1', request);

      expect(result.success).toBe(true);
    });

    it('debería aceptar image/webp', async () => {
      mockUploadUseCase.execute.mockResolvedValue({ success: true });
      const request = createMockRequest({ mimetype: 'image/webp' });

      const result = await controller.upload('station-1', request);

      expect(result.success).toBe(true);
    });
  });

  describe('remove', () => {
    it('debería eliminar un favicon correctamente', async () => {
      const deleteResult = { success: true, message: 'Deleted' };
      mockDeleteUseCase.execute.mockResolvedValue(deleteResult);

      const result = await controller.remove('station-1');

      expect(result).toEqual(deleteResult);
      expect(mockDeleteUseCase.execute).toHaveBeenCalledWith({ stationUuid: 'station-1' });
    });
  });

  describe('autoFetch', () => {
    it('debería hacer auto-fetch con nombre y homepage', async () => {
      const fetchResult = { success: true, source: 'apple-touch-icon', url: '/api/images/radio/s1/favicon' };
      mockFetchService.fetchAndSave.mockResolvedValue(fetchResult);

      const result = await controller.autoFetch('station-1', 'Radio ABC', 'https://radioabc.com');

      expect(result).toEqual(fetchResult);
      expect(mockFetchService.fetchAndSave).toHaveBeenCalledWith(
        'station-1',
        'Radio ABC',
        'https://radioabc.com',
      );
    });

    it('debería hacer auto-fetch sin homepage', async () => {
      const fetchResult = { success: true, source: 'wikipedia', url: '/api/images/radio/s1/favicon' };
      mockFetchService.fetchAndSave.mockResolvedValue(fetchResult);

      const result = await controller.autoFetch('station-1', 'Radio ABC');

      expect(result).toEqual(fetchResult);
      expect(mockFetchService.fetchAndSave).toHaveBeenCalledWith(
        'station-1',
        'Radio ABC',
        undefined,
      );
    });

    it('debería lanzar error si no se proporciona nombre', async () => {
      await expect(
        controller.autoFetch('station-1', ''),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
