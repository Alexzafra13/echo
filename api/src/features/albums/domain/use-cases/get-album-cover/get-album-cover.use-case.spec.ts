import { Test, TestingModule } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { GetAlbumCoverUseCase } from './get-album-cover.use-case';
import { ALBUM_REPOSITORY, IAlbumRepository } from '../../ports/album-repository.port';
import { CoverArtService } from '@shared/services';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { NotFoundError } from '@shared/errors';
import * as fs from 'fs/promises';

jest.mock('fs/promises');

describe('GetAlbumCoverUseCase', () => {
  let useCase: GetAlbumCoverUseCase;
  let coverArtService: jest.Mocked<CoverArtService>;
  let mockDbSelect: jest.Mock;

  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    trace: jest.fn(),
  };

  beforeEach(async () => {
    const mockAlbumRepository: Partial<IAlbumRepository> = {
      findById: jest.fn(),
      findAll: jest.fn(),
      search: jest.fn(),
      findByArtistId: jest.fn(),
      findRecent: jest.fn(),
      findMostPlayed: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockCoverArtService = {
      getCoverPath: jest.fn(),
    };

    // Build a chainable mock for drizzle.db.select().from().where().limit()
    mockDbSelect = jest.fn();
    const mockLimit = jest.fn();
    const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
    mockDbSelect.mockReturnValue({ from: mockFrom });
    // Store limit mock so tests can set return values
    (mockDbSelect as any)._limit = mockLimit;

    const mockDrizzleService = {
      db: {
        select: mockDbSelect,
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAlbumCoverUseCase,
        {
          provide: ALBUM_REPOSITORY,
          useValue: mockAlbumRepository,
        },
        {
          provide: CoverArtService,
          useValue: mockCoverArtService,
        },
        {
          provide: DrizzleService,
          useValue: mockDrizzleService,
        },
        {
          provide: getLoggerToken(GetAlbumCoverUseCase.name),
          useValue: mockLogger,
        },
      ],
    }).compile();

    useCase = module.get<GetAlbumCoverUseCase>(GetAlbumCoverUseCase);
    coverArtService = module.get(CoverArtService);

    jest.clearAllMocks();

    // Re-wire the chain after clearAllMocks
    mockDbSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
  });

  // Helper to set the DB query result
  function setDbResult(
    row: { coverArtPath: string | null; externalCoverPath: string | null } | null
  ) {
    (mockDbSelect as any)._limit.mockResolvedValue(row ? [row] : []);
  }

  describe('execute', () => {
    it('debería retornar el buffer del cover art (coverArtPath)', async () => {
      // Arrange
      const mockBuffer = Buffer.from('fake-image-data');
      setDbResult({ coverArtPath: 'abbey-road.jpg', externalCoverPath: null });
      (coverArtService.getCoverPath as jest.Mock).mockReturnValue(
        '/absolute/path/covers/abbey-road.jpg'
      );
      (fs.readFile as jest.Mock).mockResolvedValue(mockBuffer);

      // Act
      const result = await useCase.execute({ albumId: 'album-1' });

      // Assert
      expect(coverArtService.getCoverPath).toHaveBeenCalledWith('abbey-road.jpg');
      expect(fs.readFile).toHaveBeenCalledWith('/absolute/path/covers/abbey-road.jpg');
      expect(result).toEqual({
        buffer: mockBuffer,
        mimeType: 'image/jpeg',
        fileSize: mockBuffer.length,
      });
    });

    it('debería preferir externalCoverPath sobre coverArtPath', async () => {
      // Arrange
      const mockBuffer = Buffer.from('fake-image-data');
      setDbResult({ coverArtPath: 'local.jpg', externalCoverPath: 'external.jpg' });
      (coverArtService.getCoverPath as jest.Mock).mockReturnValue(
        '/absolute/path/covers/external.jpg'
      );
      (fs.readFile as jest.Mock).mockResolvedValue(mockBuffer);

      // Act
      await useCase.execute({ albumId: 'album-1' });

      // Assert — should use externalCoverPath, not coverArtPath
      expect(coverArtService.getCoverPath).toHaveBeenCalledWith('external.jpg');
    });

    it('debería detectar MIME type para PNG', async () => {
      // Arrange
      const mockBuffer = Buffer.from('fake-png-data');
      setDbResult({ coverArtPath: 'album.png', externalCoverPath: null });
      (coverArtService.getCoverPath as jest.Mock).mockReturnValue('/path/covers/album.png');
      (fs.readFile as jest.Mock).mockResolvedValue(mockBuffer);

      // Act
      const result = await useCase.execute({ albumId: 'album-1' });

      // Assert
      expect(result.mimeType).toBe('image/png');
    });

    it('debería detectar MIME type para WebP', async () => {
      // Arrange
      const mockBuffer = Buffer.from('fake-webp-data');
      setDbResult({ coverArtPath: 'album.webp', externalCoverPath: null });
      (coverArtService.getCoverPath as jest.Mock).mockReturnValue('/path/covers/album.webp');
      (fs.readFile as jest.Mock).mockResolvedValue(mockBuffer);

      // Act
      const result = await useCase.execute({ albumId: 'album-1' });

      // Assert
      expect(result.mimeType).toBe('image/webp');
    });

    it('debería lanzar NotFoundError si albumId está vacío', async () => {
      await expect(useCase.execute({ albumId: '' })).rejects.toThrow(NotFoundError);
    });

    it('debería lanzar NotFoundError si albumId es solo espacios', async () => {
      await expect(useCase.execute({ albumId: '   ' })).rejects.toThrow(NotFoundError);
    });

    it('debería lanzar NotFoundError si el álbum no existe', async () => {
      setDbResult(null);
      await expect(useCase.execute({ albumId: 'nonexistent' })).rejects.toThrow(NotFoundError);
    });

    it('debería lanzar NotFoundError si el álbum no tiene cover art', async () => {
      setDbResult({ coverArtPath: null, externalCoverPath: null });
      await expect(useCase.execute({ albumId: 'album-1' })).rejects.toThrow(NotFoundError);
    });

    it('debería lanzar NotFoundError si el archivo no se puede leer', async () => {
      setDbResult({ coverArtPath: 'abbey-road.jpg', externalCoverPath: null });
      (coverArtService.getCoverPath as jest.Mock).mockReturnValue('/path/covers/abbey-road.jpg');
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT: file not found'));

      await expect(useCase.execute({ albumId: 'album-1' })).rejects.toThrow(NotFoundError);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('debería calcular el fileSize correctamente', async () => {
      const mockBuffer = Buffer.alloc(1024 * 100); // 100KB
      setDbResult({ coverArtPath: 'abbey-road.jpg', externalCoverPath: null });
      (coverArtService.getCoverPath as jest.Mock).mockReturnValue('/path/covers/abbey-road.jpg');
      (fs.readFile as jest.Mock).mockResolvedValue(mockBuffer);

      const result = await useCase.execute({ albumId: 'album-1' });
      expect(result.fileSize).toBe(102400);
    });

    it('debería manejar rutas absolutas directamente', async () => {
      const mockBuffer = Buffer.from('fake-image-data');
      setDbResult({ coverArtPath: null, externalCoverPath: '/data/metadata/albums/cover.jpg' });
      (fs.readFile as jest.Mock).mockResolvedValue(mockBuffer);

      const result = await useCase.execute({ albumId: 'album-1' });

      // Should NOT call getCoverPath for absolute paths
      expect(coverArtService.getCoverPath).not.toHaveBeenCalled();
      expect(fs.readFile).toHaveBeenCalledWith('/data/metadata/albums/cover.jpg');
      expect(result.mimeType).toBe('image/jpeg');
    });
  });
});
