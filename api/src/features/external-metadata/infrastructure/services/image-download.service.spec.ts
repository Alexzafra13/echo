import { Test, TestingModule } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { ImageDownloadService } from './image-download.service';
import { StorageService } from './storage.service';

// Mock fetch global
global.fetch = jest.fn();

const mockLogger = {
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  setContext: jest.fn(),
  assign: jest.fn(),
};

describe('ImageDownloadService', () => {
  let service: ImageDownloadService;
  let storage: jest.Mocked<StorageService>;

  // Helper: Create JPEG buffer (FF D8 FF magic bytes)
  const createJpegBuffer = (size: number = 1024): Buffer => {
    const buffer = Buffer.alloc(size);
    buffer[0] = 0xff;
    buffer[1] = 0xd8;
    buffer[2] = 0xff;
    return buffer;
  };

  // Helper: Create PNG buffer (89 50 4E 47 magic bytes)
  const createPngBuffer = (size: number = 1024): Buffer => {
    const buffer = Buffer.alloc(size);
    buffer[0] = 0x89;
    buffer[1] = 0x50;
    buffer[2] = 0x4e;
    buffer[3] = 0x47;
    return buffer;
  };

  // Helper: Create invalid buffer
  const createInvalidBuffer = (size: number = 1024): Buffer => {
    return Buffer.alloc(size);
  };

  beforeEach(async () => {
    // Create mock storage
    const mockStorage = {
      saveImage: jest.fn().mockResolvedValue(undefined),
      getArtistImagePath: jest.fn(),
      getAlbumCoverPath: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImageDownloadService,
        { provide: getLoggerToken(ImageDownloadService.name), useValue: mockLogger },
        {
          provide: StorageService,
          useValue: mockStorage,
        },
      ],
    }).compile();

    service = module.get<ImageDownloadService>(ImageDownloadService);
    storage = module.get(StorageService);

    // Clear fetch mock
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('downloadImage', () => {
    it('debería descargar una imagen válida', async () => {
      // Arrange
      const imageBuffer = createJpegBuffer();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: {
          get: (header: string) => {
            if (header === 'content-type') return 'image/jpeg';
            if (header === 'content-length') return String(imageBuffer.length);
            return null;
          },
        },
        arrayBuffer: async () => imageBuffer.buffer,
      });

      // Act
      const result = await service.downloadImage('https://example.com/image.jpg');

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(imageBuffer.length);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/image.jpg',
        expect.objectContaining({
          headers: {
            'User-Agent': 'Echo-Music-Server/1.0.0',
          },
        })
      );
    });

    it('debería rechazar si HTTP status no es OK', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      // Act & Assert
      await expect(
        service.downloadImage('https://example.com/notfound.jpg')
      ).rejects.toThrow('ImageDownload API error: HTTP 404 Not Found');
    });

    it('debería rechazar si content-type no es imagen', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: {
          get: (header: string) => {
            if (header === 'content-type') return 'text/html';
            return null;
          },
        },
      });

      // Act & Assert
      await expect(
        service.downloadImage('https://example.com/file.html')
      ).rejects.toThrow('Invalid content type: text/html');
    });

    it('debería rechazar si imagen es muy grande (content-length)', async () => {
      // Arrange
      const largeSize = 11 * 1024 * 1024; // 11 MB (límite es 10 MB)
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: {
          get: (header: string) => {
            if (header === 'content-type') return 'image/jpeg';
            if (header === 'content-length') return String(largeSize);
            return null;
          },
        },
      });

      // Act & Assert
      await expect(
        service.downloadImage('https://example.com/large.jpg')
      ).rejects.toThrow('Image too large');
    });

    it('debería rechazar si buffer descargado es muy grande', async () => {
      // Arrange
      const largeBuffer = createJpegBuffer(11 * 1024 * 1024);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: {
          get: (header: string) => {
            if (header === 'content-type') return 'image/jpeg';
            return null;
          },
        },
        arrayBuffer: async () => largeBuffer.buffer,
      });

      // Act & Assert
      await expect(
        service.downloadImage('https://example.com/large.jpg')
      ).rejects.toThrow('Image too large');
    });

    it('debería rechazar si buffer no contiene imagen válida', async () => {
      // Arrange
      const invalidBuffer = createInvalidBuffer();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: {
          get: (header: string) => {
            if (header === 'content-type') return 'image/jpeg';
            return null;
          },
        },
        arrayBuffer: async () => invalidBuffer.buffer,
      });

      // Act & Assert
      await expect(
        service.downloadImage('https://example.com/invalid.jpg')
      ).rejects.toThrow('Downloaded file is not a valid image');
    });

    it('debería manejar errores de red', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(
        service.downloadImage('https://example.com/image.jpg')
      ).rejects.toThrow('Network error');
    });
  });

  describe('downloadAndSave', () => {
    it('debería descargar y guardar una imagen', async () => {
      // Arrange
      const imageBuffer = createJpegBuffer();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: {
          get: (header: string) => {
            if (header === 'content-type') return 'image/jpeg';
            return null;
          },
        },
        arrayBuffer: async () => imageBuffer.buffer,
      });

      // Act
      await service.downloadAndSave('https://example.com/image.jpg', '/path/to/save.jpg');

      // Assert
      expect(storage.saveImage).toHaveBeenCalledWith('/path/to/save.jpg', expect.any(Buffer));
    });

    it('debería propagar errores de descarga', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Download failed'));

      // Act & Assert
      await expect(
        service.downloadAndSave('https://example.com/image.jpg', '/path/to/save.jpg')
      ).rejects.toThrow('Download failed');
    });

    it('debería propagar errores de guardado', async () => {
      // Arrange
      const imageBuffer = createJpegBuffer();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: {
          get: (header: string) => {
            if (header === 'content-type') return 'image/jpeg';
            return null;
          },
        },
        arrayBuffer: async () => imageBuffer.buffer,
      });
      storage.saveImage.mockRejectedValue(new Error('Save failed'));

      // Act & Assert
      await expect(
        service.downloadAndSave('https://example.com/image.jpg', '/path/to/save.jpg')
      ).rejects.toThrow('Save failed');
    });
  });

  describe('downloadMultiple', () => {
    it('debería descargar múltiples imágenes en paralelo', async () => {
      // Arrange
      const imageBuffer1 = createJpegBuffer(512);
      const imageBuffer2 = createPngBuffer(1024);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          headers: {
            get: (header: string) => {
              if (header === 'content-type') return 'image/jpeg';
              return null;
            },
          },
          arrayBuffer: async () => imageBuffer1.buffer,
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: {
            get: (header: string) => {
              if (header === 'content-type') return 'image/png';
              return null;
            },
          },
          arrayBuffer: async () => imageBuffer2.buffer,
        });

      // Act
      const result = await service.downloadMultiple([
        'https://example.com/image1.jpg',
        'https://example.com/image2.png',
      ]);

      // Assert
      expect(result.size).toBe(2);
      expect(result.has('https://example.com/image1.jpg')).toBe(true);
      expect(result.has('https://example.com/image2.png')).toBe(true);
    });

    it('debería manejar errores individuales sin fallar todo', async () => {
      // Arrange
      const imageBuffer = createJpegBuffer();

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          headers: {
            get: (header: string) => {
              if (header === 'content-type') return 'image/jpeg';
              return null;
            },
          },
          arrayBuffer: async () => imageBuffer.buffer,
        })
        .mockRejectedValueOnce(new Error('Network error'));

      // Act
      const result = await service.downloadMultiple([
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ]);

      // Assert
      expect(result.size).toBe(1);
      expect(result.has('https://example.com/image1.jpg')).toBe(true);
      expect(result.has('https://example.com/image2.jpg')).toBe(false);
    });
  });

  describe('downloadMultipleSizes', () => {
    it('debería descargar múltiples tamaños de imagen', async () => {
      // Arrange
      const imageBuffer = createJpegBuffer();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: {
          get: (header: string) => {
            if (header === 'content-type') return 'image/jpeg';
            return null;
          },
        },
        arrayBuffer: async () => imageBuffer.buffer,
      });

      // Act
      const result = await service.downloadMultipleSizes(
        {
          small: 'https://example.com/small.jpg',
          medium: 'https://example.com/medium.jpg',
          large: 'https://example.com/large.jpg',
        },
        '/storage/artists/123',
        'profile'
      );

      // Assert
      expect(result.smallPath).toBe('/storage/artists/123/profile-small.jpg');
      expect(result.mediumPath).toBe('/storage/artists/123/profile-medium.jpg');
      expect(result.largePath).toBe('/storage/artists/123/profile-large.jpg');
      expect(storage.saveImage).toHaveBeenCalledTimes(3);
    });

    it('debería manejar URLs faltantes', async () => {
      // Arrange
      const imageBuffer = createJpegBuffer();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: {
          get: (header: string) => {
            if (header === 'content-type') return 'image/jpeg';
            return null;
          },
        },
        arrayBuffer: async () => imageBuffer.buffer,
      });

      // Act
      const result = await service.downloadMultipleSizes(
        {
          small: 'https://example.com/small.jpg',
          // medium y large omitidos
        },
        '/storage/artists/123',
        'profile'
      );

      // Assert
      expect(result.smallPath).toBe('/storage/artists/123/profile-small.jpg');
      expect(result.mediumPath).toBeNull();
      expect(result.largePath).toBeNull();
      expect(storage.saveImage).toHaveBeenCalledTimes(1);
    });

    it('debería continuar si algún tamaño falla', async () => {
      // Arrange
      const imageBuffer = createJpegBuffer();
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          headers: {
            get: (header: string) => {
              if (header === 'content-type') return 'image/jpeg';
              return null;
            },
          },
          arrayBuffer: async () => imageBuffer.buffer,
        })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          headers: {
            get: (header: string) => {
              if (header === 'content-type') return 'image/jpeg';
              return null;
            },
          },
          arrayBuffer: async () => imageBuffer.buffer,
        });

      // Act
      const result = await service.downloadMultipleSizes(
        {
          small: 'https://example.com/small.jpg',
          medium: 'https://example.com/medium.jpg',
          large: 'https://example.com/large.jpg',
        },
        '/storage/artists/123',
        'profile'
      );

      // Assert
      expect(result.smallPath).toBe('/storage/artists/123/profile-small.jpg');
      expect(result.mediumPath).toBeNull(); // Falló
      expect(result.largePath).toBe('/storage/artists/123/profile-large.jpg');
    });
  });

  describe('getImageFormat', () => {
    it('debería detectar formato JPEG', () => {
      // Arrange
      const buffer = createJpegBuffer();

      // Act
      const format = service.getImageFormat(buffer);

      // Assert
      expect(format).toBe('jpg');
    });

    it('debería detectar formato PNG', () => {
      // Arrange
      const buffer = createPngBuffer();

      // Act
      const format = service.getImageFormat(buffer);

      // Assert
      expect(format).toBe('png');
    });

    it('debería detectar formato GIF', () => {
      // Arrange
      const buffer = Buffer.alloc(10);
      buffer[0] = 0x47; // G
      buffer[1] = 0x49; // I
      buffer[2] = 0x46; // F

      // Act
      const format = service.getImageFormat(buffer);

      // Assert
      expect(format).toBe('gif');
    });

    it('debería detectar formato WebP', () => {
      // Arrange
      const buffer = Buffer.alloc(12);
      buffer[0] = 0x52; // R
      buffer[1] = 0x49; // I
      buffer[2] = 0x46; // F
      buffer[3] = 0x46; // F
      buffer[8] = 0x57; // W
      buffer[9] = 0x45; // E
      buffer[10] = 0x42; // B
      buffer[11] = 0x50; // P

      // Act
      const format = service.getImageFormat(buffer);

      // Assert
      expect(format).toBe('webp');
    });

    it('debería retornar null para buffer inválido', () => {
      // Arrange
      const buffer = createInvalidBuffer();

      // Act
      const format = service.getImageFormat(buffer);

      // Assert
      expect(format).toBeNull();
    });

    it('debería retornar null para buffer muy pequeño', () => {
      // Arrange
      const buffer = Buffer.alloc(2);

      // Act
      const format = service.getImageFormat(buffer);

      // Assert
      expect(format).toBeNull();
    });
  });
});
