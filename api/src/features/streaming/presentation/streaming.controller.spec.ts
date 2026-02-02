import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { StreamingController } from './streaming.controller';
import { StreamTrackUseCase } from '../domain/use-cases';
import { TempoCacheService } from '../../dj/infrastructure/services/tempo-cache.service';
import { StreamTokenGuard } from './guards';
import { NotFoundError } from '@shared/errors';
import { Readable } from 'stream';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');

describe('StreamingController', () => {
  let controller: StreamingController;
  let streamTrackUseCase: jest.Mocked<StreamTrackUseCase>;
  let module: TestingModule;

  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const mockMetadata = {
    trackId: 'track-123',
    filePath: '/music/test-song.mp3',
    fileName: 'test-song.mp3',
    fileSize: 5242880, // 5 MB
    mimeType: 'audio/mpeg',
    duration: 180,
  };

  // Mock guard that always allows access
  const mockStreamTokenGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockStreamTrackUseCase = {
      execute: jest.fn(),
    };

    const mockTempoCacheService = {
      getCachedPath: jest.fn().mockResolvedValue(null),
    };

    module = await Test.createTestingModule({
      controllers: [StreamingController],
      providers: [
        {
          provide: `PinoLogger:${StreamingController.name}`,
          useValue: mockLogger,
        },
        {
          provide: StreamTrackUseCase,
          useValue: mockStreamTrackUseCase,
        },
        {
          provide: TempoCacheService,
          useValue: mockTempoCacheService,
        },
      ],
    })
      .overrideGuard(StreamTokenGuard)
      .useValue(mockStreamTokenGuard)
      .compile();

    controller = module.get<StreamingController>(StreamingController);
    streamTrackUseCase = module.get(StreamTrackUseCase);
  });

  afterEach(async () => {
    if (controller) {
      controller.onModuleDestroy();
    }
    if (module) {
      await module.close();
    }
  });

  describe('getStreamMetadata (HEAD)', () => {
    it('debería retornar headers de metadata correctos', async () => {
      // Arrange
      streamTrackUseCase.execute.mockResolvedValue(mockMetadata);

      const mockRes = {
        header: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      // Act
      await controller.getStreamMetadata('track-123', mockRes as any);

      // Assert
      expect(streamTrackUseCase.execute).toHaveBeenCalledWith({ trackId: 'track-123' });
      expect(mockRes.header).toHaveBeenCalledWith('Content-Type', 'audio/mpeg');
      expect(mockRes.header).toHaveBeenCalledWith('Content-Length', '5242880');
      expect(mockRes.header).toHaveBeenCalledWith('Accept-Ranges', 'bytes');
      expect(mockRes.header).toHaveBeenCalledWith('Cache-Control', 'public, max-age=31536000');
      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('debería propagar NotFoundError si track no existe', async () => {
      // Arrange
      streamTrackUseCase.execute.mockRejectedValue(new NotFoundError('Track', 'nonexistent'));

      const mockRes = {
        header: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      // Act & Assert
      await expect(controller.getStreamMetadata('nonexistent', mockRes as any)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('streamTrack (GET)', () => {
    const createMockResponse = () => {
      const mockRaw = {
        writeHead: jest.fn(),
        destroyed: false,
        destroy: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        emit: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };

      return {
        raw: mockRaw,
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
    };

    const createMockStream = () => {
      const mockStream = new Readable({
        read() {
          this.push(null); // End stream immediately
        },
      });
      // Cast to any to add pipe method that returns the stream
      (mockStream as any).pipe = jest.fn().mockReturnThis();
      return mockStream;
    };

    beforeEach(() => {
      const mockStream = createMockStream();
      (fs.createReadStream as jest.Mock).mockReturnValue(mockStream);
    });

    it('debería streamear archivo completo sin Range header', async () => {
      // Arrange
      streamTrackUseCase.execute.mockResolvedValue(mockMetadata);
      const mockRes = createMockResponse();

      // Act
      await controller.streamTrack('track-123', undefined, undefined, mockRes as any);

      // Assert
      expect(streamTrackUseCase.execute).toHaveBeenCalledWith({
        trackId: 'track-123',
        range: undefined,
      });
      expect(mockRes.raw.writeHead).toHaveBeenCalledWith(HttpStatus.OK, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': '5242880',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      });
      expect(fs.createReadStream).toHaveBeenCalledWith(mockMetadata.filePath, undefined);
    });

    it('debería manejar Range request correctamente (partial content)', async () => {
      // Arrange
      streamTrackUseCase.execute.mockResolvedValue(mockMetadata);
      const mockRes = createMockResponse();

      // Act
      await controller.streamTrack('track-123', undefined, 'bytes=0-1023', mockRes as any);

      // Assert
      expect(mockRes.raw.writeHead).toHaveBeenCalledWith(HttpStatus.PARTIAL_CONTENT, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': '1024',
        'Content-Range': 'bytes 0-1023/5242880',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      });
      expect(fs.createReadStream).toHaveBeenCalledWith(mockMetadata.filePath, {
        start: 0,
        end: 1023,
      });
    });

    it('debería manejar Range request sin end (hasta el final)', async () => {
      // Arrange
      streamTrackUseCase.execute.mockResolvedValue(mockMetadata);
      const mockRes = createMockResponse();

      // Act
      await controller.streamTrack('track-123', undefined, 'bytes=1000-', mockRes as any);

      // Assert
      expect(mockRes.raw.writeHead).toHaveBeenCalledWith(HttpStatus.PARTIAL_CONTENT, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': (5242880 - 1000).toString(),
        'Content-Range': `bytes 1000-${5242880 - 1}/${5242880}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      });
    });

    it('debería retornar 416 para Range inválido (start >= fileSize)', async () => {
      // Arrange
      streamTrackUseCase.execute.mockResolvedValue(mockMetadata);
      const mockRes = createMockResponse();

      // Act
      await controller.streamTrack('track-123', undefined, 'bytes=10000000-', mockRes as any);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE);
      expect(mockRes.header).toHaveBeenCalledWith('Content-Range', `bytes */5242880`);
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('debería retornar 416 para Range inválido (start > end)', async () => {
      // Arrange
      streamTrackUseCase.execute.mockResolvedValue(mockMetadata);
      const mockRes = createMockResponse();

      // Act
      await controller.streamTrack('track-123', undefined, 'bytes=1000-500', mockRes as any);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE);
    });

    it('debería propagar NotFoundError', async () => {
      // Arrange
      streamTrackUseCase.execute.mockRejectedValue(new NotFoundError('Track', 'nonexistent'));
      const mockRes = createMockResponse();

      // Act & Assert
      await expect(
        controller.streamTrack('nonexistent', undefined, undefined, mockRes as any)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('downloadTrack (GET)', () => {
    const createMockResponse = () => {
      const mockRaw = {
        writeHead: jest.fn(),
        destroyed: false,
        destroy: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        emit: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };

      return {
        raw: mockRaw,
      };
    };

    const createMockStream = () => {
      const mockStream = new Readable({
        read() {
          this.push(null);
        },
      });
      (mockStream as any).pipe = jest.fn().mockReturnThis();
      return mockStream;
    };

    beforeEach(() => {
      (fs.createReadStream as jest.Mock).mockReturnValue(createMockStream());
    });

    it('debería configurar headers para descarga', async () => {
      // Arrange
      streamTrackUseCase.execute.mockResolvedValue(mockMetadata);
      const mockRes = createMockResponse();

      // Act
      await controller.downloadTrack('track-123', mockRes as any);

      // Assert
      expect(streamTrackUseCase.execute).toHaveBeenCalledWith({ trackId: 'track-123' });
      expect(mockRes.raw.writeHead).toHaveBeenCalledWith(HttpStatus.OK, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': '5242880',
        'Content-Disposition': 'attachment; filename="test-song.mp3"',
        'Cache-Control': 'public, max-age=31536000',
      });
    });

    it('debería encodear correctamente nombres de archivo con caracteres especiales', async () => {
      // Arrange
      const metadataWithSpecialChars = {
        ...mockMetadata,
        fileName: 'canción española (remix).mp3',
      };
      streamTrackUseCase.execute.mockResolvedValue(metadataWithSpecialChars);
      const mockRes = createMockResponse();

      // Act
      await controller.downloadTrack('track-123', mockRes as any);

      // Assert
      expect(mockRes.raw.writeHead).toHaveBeenCalledWith(
        HttpStatus.OK,
        expect.objectContaining({
          'Content-Disposition': `attachment; filename="${encodeURIComponent('canción española (remix).mp3')}"`,
        })
      );
    });

    it('debería propagar NotFoundError', async () => {
      // Arrange
      streamTrackUseCase.execute.mockRejectedValue(new NotFoundError('Track', 'nonexistent'));
      const mockRes = createMockResponse();

      // Act & Assert
      await expect(controller.downloadTrack('nonexistent', mockRes as any)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('debería limpiar streams activos al destruir el módulo', () => {
      // Arrange
      const mockStream1 = { destroyed: false, destroy: jest.fn() };
      const mockStream2 = { destroyed: false, destroy: jest.fn() };
      const mockStream3 = { destroyed: true, destroy: jest.fn() }; // Already destroyed

      // Access private activeStreams using type assertion
      const activeStreams = (controller as any).activeStreams as Set<any>;
      activeStreams.add(mockStream1);
      activeStreams.add(mockStream2);
      activeStreams.add(mockStream3);

      // Act
      controller.onModuleDestroy();

      // Assert
      expect(mockStream1.destroy).toHaveBeenCalled();
      expect(mockStream2.destroy).toHaveBeenCalled();
      expect(mockStream3.destroy).not.toHaveBeenCalled(); // Already destroyed
      expect(activeStreams.size).toBe(0);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { activeStreams: 3 },
        'Cleaning up active streams'
      );
    });

    it('debería manejar set vacío sin errores', () => {
      // Act & Assert - should not throw
      expect(() => controller.onModuleDestroy()).not.toThrow();
    });
  });
});
