import { Test, TestingModule } from '@nestjs/testing';
import { GetFeaturedAlbumUseCase } from './get-featured-album.use-case';
import { ALBUM_REPOSITORY, IAlbumRepository } from '../../ports/album-repository.port';
import { Album } from '../../entities/album.entity';
import { NotFoundError } from '@shared/errors';

describe('GetFeaturedAlbumUseCase', () => {
  let useCase: GetFeaturedAlbumUseCase;
  let albumRepository: jest.Mocked<IAlbumRepository>;

  const mockAlbum = Album.reconstruct({
    id: 'album-1',
    name: 'Abbey Road',
    artistId: 'artist-1',
    artistName: 'The Beatles',
    albumArtistId: 'artist-1',
    coverArtPath: '/covers/abbey-road.jpg',
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

  const mockRecentAlbum = Album.reconstruct({
    id: 'album-2',
    name: 'Let It Be',
    artistId: 'artist-1',
    artistName: 'The Beatles',
    albumArtistId: 'artist-1',
    coverArtPath: '/covers/let-it-be.jpg',
    year: 1970,
    releaseDate: new Date('1970-05-08'),
    compilation: false,
    songCount: 12,
    duration: 2100,
    size: Number(100000000),
    description: 'The twelfth and final studio album by The Beatles',
    createdAt: new Date('2025-01-02'),
    updatedAt: new Date('2025-01-02'),
  });

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetFeaturedAlbumUseCase,
        {
          provide: ALBUM_REPOSITORY,
          useValue: mockAlbumRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetFeaturedAlbumUseCase>(GetFeaturedAlbumUseCase);
    albumRepository = module.get(ALBUM_REPOSITORY);
  });

  describe('execute', () => {
    it('debería retornar el álbum más reproducido', async () => {
      // Arrange
      (albumRepository.findMostPlayed as jest.Mock).mockResolvedValue([mockAlbum]);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(albumRepository.findMostPlayed).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        id: 'album-1',
        name: 'Abbey Road',
        artistId: 'artist-1',
        artistName: 'The Beatles',
        albumArtistId: 'artist-1',
        coverArtPath: '/covers/abbey-road.jpg',
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
    });

    it('debería retornar el álbum más reciente si no hay reproducciones', async () => {
      // Arrange
      (albumRepository.findMostPlayed as jest.Mock).mockResolvedValue([]);
      (albumRepository.findRecent as jest.Mock).mockResolvedValue([mockRecentAlbum]);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(albumRepository.findMostPlayed).toHaveBeenCalledWith(1);
      expect(albumRepository.findRecent).toHaveBeenCalledWith(1);
      expect(result.id).toBe('album-2');
      expect(result.name).toBe('Let It Be');
    });

    it('debería lanzar NotFoundError si no hay álbumes en la librería', async () => {
      // Arrange
      (albumRepository.findMostPlayed as jest.Mock).mockResolvedValue([]);
      (albumRepository.findRecent as jest.Mock).mockResolvedValue([]);

      // Act & Assert
      await expect(useCase.execute()).rejects.toThrow(NotFoundError);
      expect(albumRepository.findMostPlayed).toHaveBeenCalledWith(1);
      expect(albumRepository.findRecent).toHaveBeenCalledWith(1);
    });

    it('debería preferir álbum más reproducido sobre el más reciente', async () => {
      // Arrange
      (albumRepository.findMostPlayed as jest.Mock).mockResolvedValue([mockAlbum]);
      (albumRepository.findRecent as jest.Mock).mockResolvedValue([mockRecentAlbum]);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.id).toBe('album-1');
      expect(albumRepository.findRecent).not.toHaveBeenCalled();
    });

    it('debería manejar álbum sin campos opcionales', async () => {
      // Arrange
      const minimalAlbum = Album.reconstruct({
        id: 'album-3',
        name: 'Unknown Album',
        artistId: undefined,
        artistName: undefined,
        albumArtistId: undefined,
        coverArtPath: undefined,
        year: undefined,
        releaseDate: undefined,
        compilation: false,
        songCount: 10,
        duration: 1800,
        size: Number(50000000),
        description: undefined,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      });

      (albumRepository.findMostPlayed as jest.Mock).mockResolvedValue([minimalAlbum]);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.artistId).toBeUndefined();
      expect(result.artistName).toBeUndefined();
      expect(result.coverArtPath).toBeUndefined();
      expect(result.year).toBeUndefined();
    });
  });
});
