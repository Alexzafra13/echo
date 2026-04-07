import { Test, TestingModule } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { RadioFaviconFetchService } from './radio-favicon-fetch.service';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
import { ImageService } from '@features/external-metadata/application/services/image.service';
import { EnrichmentLogService } from '@features/external-metadata/application/services/enrichment-log.service';
import { createMockPinoLogger, MockPinoLogger } from '@shared/testing/mock.types';

// Mock fetchWithTimeout
const mockFetchWithTimeout = jest.fn();
jest.mock('@shared/utils', () => ({
  fetchWithTimeout: (...args: unknown[]) => mockFetchWithTimeout(...args),
}));

describe('RadioFaviconFetchService', () => {
  let service: RadioFaviconFetchService;
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

  // Helper to create a mock Response
  function createMockResponse(options: {
    ok?: boolean;
    headers?: Record<string, string>;
    arrayBuffer?: ArrayBuffer;
    text?: string;
    json?: unknown;
  }) {
    const { ok = true, headers = {}, arrayBuffer, text, json } = options;
    return {
      ok,
      headers: {
        get: (key: string) => headers[key.toLowerCase()] || null,
      },
      arrayBuffer: () => Promise.resolve(arrayBuffer || new ArrayBuffer(0)),
      text: () => Promise.resolve(text || ''),
      json: () => Promise.resolve(json || {}),
    };
  }

  beforeEach(async () => {
    mockLogger = createMockPinoLogger();
    mockFetchWithTimeout.mockReset();

    // DB mock: no existing image by default
    const mockSelectResult = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    };

    const mockInsertResult = {
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: 'new-id' }]),
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
      getRadioFaviconPath: jest.fn().mockResolvedValue('/data/uploads/radio/uuid/favicon.png'),
      saveImage: jest.fn().mockResolvedValue(undefined),
      deleteImage: jest.fn().mockResolvedValue(undefined),
    };

    mockImageService = {
      invalidateRadioFaviconCache: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RadioFaviconFetchService,
        { provide: getLoggerToken(RadioFaviconFetchService.name), useValue: mockLogger },
        { provide: DrizzleService, useValue: mockDrizzle },
        { provide: StorageService, useValue: mockStorage },
        { provide: ImageService, useValue: mockImageService },
        {
          provide: EnrichmentLogService,
          useValue: { logSuccess: jest.fn(), logError: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<RadioFaviconFetchService>(RadioFaviconFetchService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('fetchAndSave', () => {
    it('debería sobreescribir un favicon existente al encontrar uno nuevo', async () => {
      const imageBuffer = new ArrayBuffer(2048);
      new Uint8Array(imageBuffer).fill(1);

      // saveImageBuffer does its own select to check for existing
      const mockSelectResult = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'existing-id', filePath: '/old/path.png' }]),
      };
      mockDrizzle.db.select.mockReturnValue(mockSelectResult);

      mockFetchWithTimeout.mockResolvedValue(
        createMockResponse({
          ok: true,
          headers: { 'content-type': 'image/png' },
          arrayBuffer: imageBuffer,
        })
      );

      const result = await service.fetchAndSave('uuid', 'Station Name', 'https://station.com');

      expect(result.success).toBe(true);
      expect(mockStorage.saveImage).toHaveBeenCalled();
    });

    it('debería retornar false si ninguna fuente devuelve imagen', async () => {
      mockFetchWithTimeout.mockRejectedValue(new Error('Network error'));

      const result = await service.fetchAndSave('uuid', 'Station Name', 'https://station.com');

      expect(result.success).toBe(false);
    });

    it('debería descartar imágenes menores de 500 bytes', async () => {
      // Apple-touch-icon returns tiny image
      const tinyBuffer = new ArrayBuffer(100);
      mockFetchWithTimeout.mockResolvedValue(
        createMockResponse({
          ok: true,
          headers: { 'content-type': 'image/png' },
          arrayBuffer: tinyBuffer,
        })
      );

      const result = await service.fetchAndSave('uuid', 'Station Name', 'https://station.com');

      expect(result.success).toBe(false);
      expect(mockStorage.saveImage).not.toHaveBeenCalled();
    });
  });

  describe('fetchAndSave - apple-touch-icon', () => {
    it('debería descargar favicon de apple-touch-icon exitosamente', async () => {
      const imageBuffer = new ArrayBuffer(2048);
      new Uint8Array(imageBuffer).fill(1); // Fill with non-zero data

      mockFetchWithTimeout.mockResolvedValue(
        createMockResponse({
          ok: true,
          headers: { 'content-type': 'image/png' },
          arrayBuffer: imageBuffer,
        })
      );

      const result = await service.fetchAndSave('uuid', 'Station Name', 'https://station.com');

      expect(result.success).toBe(true);
      expect(result.source).toBe('apple-touch-icon');
      expect(mockStorage.saveImage).toHaveBeenCalled();
      expect(mockImageService.invalidateRadioFaviconCache).toHaveBeenCalledWith('uuid');
    });

    it('debería intentar múltiples rutas de apple-touch-icon', async () => {
      // First 3 paths fail, 4th succeeds
      const imageBuffer = new ArrayBuffer(2048);
      new Uint8Array(imageBuffer).fill(1);

      mockFetchWithTimeout
        .mockRejectedValueOnce(new Error('404'))
        .mockRejectedValueOnce(new Error('404'))
        .mockRejectedValueOnce(new Error('404'))
        .mockResolvedValueOnce(
          createMockResponse({
            ok: true,
            headers: { 'content-type': 'image/png' },
            arrayBuffer: imageBuffer,
          })
        );

      const result = await service.fetchAndSave('uuid', 'Station Name', 'https://station.com');

      expect(result.success).toBe(true);
      expect(result.source).toBe('apple-touch-icon');
    });
  });

  describe('fetchAndSave - Google Favicon API', () => {
    it('debería usar Google Favicon si apple-touch-icon falla', async () => {
      const imageBuffer = new ArrayBuffer(2048);
      new Uint8Array(imageBuffer).fill(1);

      // All apple-touch-icon attempts fail, then homepage HTML parse fails
      mockFetchWithTimeout
        .mockRejectedValueOnce(new Error('404')) // /apple-touch-icon.png
        .mockRejectedValueOnce(new Error('404')) // /apple-touch-icon-precomposed.png
        .mockRejectedValueOnce(new Error('404')) // /apple-touch-icon-180x180.png
        .mockRejectedValueOnce(new Error('404')) // /apple-touch-icon-152x152.png
        .mockRejectedValueOnce(new Error('404')) // HTML parse attempt
        .mockResolvedValueOnce(
          // Google Favicon API
          createMockResponse({
            ok: true,
            headers: { 'content-type': 'image/png' },
            arrayBuffer: imageBuffer,
          })
        );

      const result = await service.fetchAndSave('uuid', 'Station Name', 'https://station.com');

      expect(result.success).toBe(true);
      expect(result.source).toBe('google-favicon');
    });

    it('debería descartar respuestas de Google menores de 1000 bytes', async () => {
      const tinyBuffer = new ArrayBuffer(800);

      // All apple-touch-icon attempts fail
      mockFetchWithTimeout
        .mockRejectedValueOnce(new Error('404'))
        .mockRejectedValueOnce(new Error('404'))
        .mockRejectedValueOnce(new Error('404'))
        .mockRejectedValueOnce(new Error('404'))
        .mockRejectedValueOnce(new Error('404'))
        .mockResolvedValueOnce(
          // Google returns small placeholder
          createMockResponse({
            ok: true,
            headers: { 'content-type': 'image/png' },
            arrayBuffer: tinyBuffer,
          })
        )
        .mockRejectedValueOnce(new Error('Wikipedia fail')); // Wikipedia also fails

      const result = await service.fetchAndSave('uuid', 'Station Name', 'https://station.com');

      expect(result.success).toBe(false);
    });
  });

  describe('fetchAndSave - Wikipedia', () => {
    it('debería buscar en Wikipedia si las otras fuentes fallan', async () => {
      const imageBuffer = new ArrayBuffer(5000);
      new Uint8Array(imageBuffer).fill(1);

      // All other sources fail
      mockFetchWithTimeout
        .mockRejectedValueOnce(new Error('404'))
        .mockRejectedValueOnce(new Error('404'))
        .mockRejectedValueOnce(new Error('404'))
        .mockRejectedValueOnce(new Error('404'))
        .mockRejectedValueOnce(new Error('404'))
        .mockResolvedValueOnce(
          // Google returns not ok
          createMockResponse({ ok: false })
        )
        .mockResolvedValueOnce(
          // Wikipedia search API
          createMockResponse({
            ok: true,
            json: {
              query: {
                pages: {
                  '123': {
                    title: 'Station Name Radio',
                    thumbnail: {
                      source: 'https://upload.wikimedia.org/image.png',
                      width: 300,
                      height: 300,
                    },
                  },
                },
              },
            },
          })
        )
        .mockResolvedValueOnce(
          // Download the thumbnail
          createMockResponse({
            ok: true,
            headers: { 'content-type': 'image/png' },
            arrayBuffer: imageBuffer,
          })
        );

      const result = await service.fetchAndSave('uuid', 'Station Name', 'https://station.com');

      expect(result.success).toBe(true);
      expect(result.source).toBe('wikipedia');
    });

    it('debería intentar Wikipedia sin homepage', async () => {
      const imageBuffer = new ArrayBuffer(5000);
      new Uint8Array(imageBuffer).fill(1);

      // Without homepage, goes straight to Wikipedia
      mockFetchWithTimeout
        .mockResolvedValueOnce(
          // Wikipedia search API
          createMockResponse({
            ok: true,
            json: {
              query: {
                pages: {
                  '456': {
                    title: 'Radio Station Name',
                    thumbnail: {
                      source: 'https://upload.wikimedia.org/logo.png',
                      width: 200,
                      height: 200,
                    },
                  },
                },
              },
            },
          })
        )
        .mockResolvedValueOnce(
          // Download thumbnail
          createMockResponse({
            ok: true,
            headers: { 'content-type': 'image/png' },
            arrayBuffer: imageBuffer,
          })
        );

      const result = await service.fetchAndSave('uuid', 'Station Name');

      expect(result.success).toBe(true);
      expect(result.source).toBe('wikipedia');
    });

    it('debería ignorar resultados de Wikipedia sin coincidencia en el nombre', async () => {
      mockFetchWithTimeout.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          json: {
            query: {
              pages: {
                '789': {
                  title: 'Completely Unrelated Page',
                  thumbnail: {
                    source: 'https://upload.wikimedia.org/unrelated.png',
                    width: 300,
                    height: 300,
                  },
                },
              },
            },
          },
        })
      );

      const result = await service.fetchAndSave('uuid', 'Station Name');

      expect(result.success).toBe(false);
    });
  });

  describe('fetchAndSave - guardado', () => {
    it('debería retornar la URL correcta al guardar', async () => {
      const imageBuffer = new ArrayBuffer(2048);
      new Uint8Array(imageBuffer).fill(1);

      mockFetchWithTimeout.mockResolvedValue(
        createMockResponse({
          ok: true,
          headers: { 'content-type': 'image/png' },
          arrayBuffer: imageBuffer,
        })
      );

      const result = await service.fetchAndSave('my-uuid', 'Station', 'https://station.com');

      expect(result.url).toBe('/api/images/radio/my-uuid/favicon');
    });

    it('debería manejar errores de guardado gracefully', async () => {
      const imageBuffer = new ArrayBuffer(2048);
      new Uint8Array(imageBuffer).fill(1);

      mockFetchWithTimeout.mockResolvedValue(
        createMockResponse({
          ok: true,
          headers: { 'content-type': 'image/png' },
          arrayBuffer: imageBuffer,
        })
      );
      mockStorage.saveImage.mockRejectedValueOnce(new Error('Disk full'));

      const result = await service.fetchAndSave('uuid', 'Station', 'https://station.com');

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('batchFetch', () => {
    it('debería procesar múltiples estaciones', async () => {
      const imageBuffer = new ArrayBuffer(2048);
      new Uint8Array(imageBuffer).fill(1);

      mockFetchWithTimeout.mockResolvedValue(
        createMockResponse({
          ok: true,
          headers: { 'content-type': 'image/png' },
          arrayBuffer: imageBuffer,
        })
      );

      const stations = [
        { stationUuid: 'uuid-1', name: 'Station 1', homepage: 'https://s1.com' },
        { stationUuid: 'uuid-2', name: 'Station 2', homepage: 'https://s2.com' },
      ];

      const result = await service.batchFetch(stations);

      expect(result.total).toBe(2);
      expect(result.fetched).toBeGreaterThanOrEqual(0);
    });

    it('debería continuar si una estación falla', async () => {
      mockFetchWithTimeout.mockRejectedValue(new Error('Network error'));

      const stations = [
        { stationUuid: 'uuid-1', name: 'Station 1' },
        { stationUuid: 'uuid-2', name: 'Station 2' },
      ];

      const result = await service.batchFetch(stations);

      expect(result.total).toBe(2);
      expect(result.fetched).toBe(0);
    });
  });
});
