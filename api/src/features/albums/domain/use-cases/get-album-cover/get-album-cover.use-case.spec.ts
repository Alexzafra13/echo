import { Test, TestingModule } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { GetAlbumCoverUseCase } from './get-album-cover.use-case';
import { ALBUM_REPOSITORY, IAlbumRepository } from '../../ports/album-repository.port';
import { Album } from '../../entities/album.entity';
import { CoverArtService } from '@shared/services';
import { NotFoundError } from '@shared/errors';
import * as fs from 'fs/promises';

jest.mock('fs/promises');

describe('GetAlbumCoverUseCase', () => {
  let useCase: GetAlbumCoverUseCase;
  let albumRepository: jest.Mocked<IAlbumRepository>;
  let coverArtService: jest.Mocked<CoverArtService>;

  const mockAlbum = Album.reconstruct({
    id: 'album-1',
    name: 'Abbey Road',
    artistId: 'artist-1',
    artistName: 'The Beatles',
    albumArtistId: 'artist-1',
    coverArtPath: 'covers/abbey-road.jpg',
    year: 1969,
    releaseDate: new Date('1969-09-26'),
    compilation: false,
    songCount: 17,
    duration: 2820,
    size: Number(125000000),
    description: 'The eleventh studio album by The Beatles',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  });

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
          provide: getLoggerToken(GetAlbumCoverUseCase.name),
          useValue: mockLogger,
        },
      ],
    }).compile();

    useCase = module.get<GetAlbumCoverUseCase>(GetAlbumCoverUseCase);
    albumRepository = module.get(ALBUM_REPOSITORY);
    coverArtService = module.get(CoverArtService);

    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('debería retornar el buffer del cover art', async () => {
      // Arrange
      const mockBuffer = Buffer.from('fake-image-data');
      (albumRepository.findById as jest.Mock).mockResolvedValue(mockAlbum);
      (coverArtService.getCoverPath as jest.Mock).mockReturnValue('/absolute/path/covers/abbey-road.jpg');
      (fs.readFile as jest.Mock).mockResolvedValue(mockBuffer);

      // Act
      const result = await useCase.execute({ albumId: 'album-1' });

      // Assert
      expect(albumRepository.findById).toHaveBeenCalledWith('album-1');
      expect(coverArtService.getCoverPath).toHaveBeenCalledWith('covers/abbey-road.jpg');
      expect(fs.readFile).toHaveBeenCalledWith('/absolute/path/covers/abbey-road.jpg');
      expect(result).toEqual({
        buffer: mockBuffer,
        mimeType: 'image/jpeg',
        fileSize: mockBuffer.length,
      });
    });

    it('debería detectar MIME type para PNG', async () => {
      // Arrange
      const albumWithPng = Album.reconstruct({
        ...mockAlbum.toPrimitives(),
        coverArtPath: 'covers/album.png',
      });
      const mockBuffer = Buffer.from('fake-png-data');
      (albumRepository.findById as jest.Mock).mockResolvedValue(albumWithPng);
      (coverArtService.getCoverPath as jest.Mock).mockReturnValue('/path/covers/album.png');
      (fs.readFile as jest.Mock).mockResolvedValue(mockBuffer);

      // Act
      const result = await useCase.execute({ albumId: 'album-1' });

      // Assert
      expect(result.mimeType).toBe('image/png');
    });

    it('debería detectar MIME type para WebP', async () => {
      // Arrange
      const albumWithWebp = Album.reconstruct({
        ...mockAlbum.toPrimitives(),
        coverArtPath: 'covers/album.webp',
      });
      const mockBuffer = Buffer.from('fake-webp-data');
      (albumRepository.findById as jest.Mock).mockResolvedValue(albumWithWebp);
      (coverArtService.getCoverPath as jest.Mock).mockReturnValue('/path/covers/album.webp');
      (fs.readFile as jest.Mock).mockResolvedValue(mockBuffer);

      // Act
      const result = await useCase.execute({ albumId: 'album-1' });

      // Assert
      expect(result.mimeType).toBe('image/webp');
    });

    it('debería lanzar NotFoundError si albumId está vacío', async () => {
      // Act & Assert
      await expect(useCase.execute({ albumId: '' })).rejects.toThrow(NotFoundError);
      expect(albumRepository.findById).not.toHaveBeenCalled();
    });

    it('debería lanzar NotFoundError si albumId es solo espacios', async () => {
      // Act & Assert
      await expect(useCase.execute({ albumId: '   ' })).rejects.toThrow(NotFoundError);
      expect(albumRepository.findById).not.toHaveBeenCalled();
    });

    it('debería lanzar NotFoundError si el álbum no existe', async () => {
      // Arrange
      (albumRepository.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute({ albumId: 'nonexistent' })).rejects.toThrow(NotFoundError);
      expect(albumRepository.findById).toHaveBeenCalledWith('nonexistent');
    });

    it('debería lanzar NotFoundError si el álbum no tiene cover art', async () => {
      // Arrange
      (albumRepository.findById as jest.Mock).mockResolvedValue(mockAlbum);
      (coverArtService.getCoverPath as jest.Mock).mockReturnValue(null);

      // Act & Assert
      await expect(useCase.execute({ albumId: 'album-1' })).rejects.toThrow(NotFoundError);
    });

    it('debería lanzar NotFoundError si el archivo no se puede leer', async () => {
      // Arrange
      (albumRepository.findById as jest.Mock).mockResolvedValue(mockAlbum);
      (coverArtService.getCoverPath as jest.Mock).mockReturnValue('/path/covers/abbey-road.jpg');
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT: file not found'));

      // Act & Assert
      await expect(useCase.execute({ albumId: 'album-1' })).rejects.toThrow(NotFoundError);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('debería calcular el fileSize correctamente', async () => {
      // Arrange
      const mockBuffer = Buffer.alloc(1024 * 100); // 100KB
      (albumRepository.findById as jest.Mock).mockResolvedValue(mockAlbum);
      (coverArtService.getCoverPath as jest.Mock).mockReturnValue('/path/covers/abbey-road.jpg');
      (fs.readFile as jest.Mock).mockResolvedValue(mockBuffer);

      // Act
      const result = await useCase.execute({ albumId: 'album-1' });

      // Assert
      expect(result.fileSize).toBe(102400);
    });
  });
});
