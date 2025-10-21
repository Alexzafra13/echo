import { Test, TestingModule } from '@nestjs/testing';
import { GetAlbumUseCase } from './get-album.use-case';
import { ALBUM_REPOSITORY, IAlbumRepository } from '../../ports/album-repository.port';
import { Album } from '../../entities/album.entity';
import { NotFoundError } from '@shared/errors';

describe('GetAlbumUseCase', () => {
  let useCase: GetAlbumUseCase;
  let albumRepository: jest.Mocked<IAlbumRepository>;

  const mockAlbum = Album.reconstruct({
    id: 'album-1',
    name: 'Abbey Road',
    artistId: 'artist-1',
    albumArtistId: 'artist-1',
    coverArtPath: '/covers/abbey-road.jpg',
    year: 1969,
    releaseDate: new Date('1969-09-26'),
    compilation: false,
    songCount: 17,
    duration: 2820, // 47 minutos
    size: BigInt(125000000), // ~125 MB
    description: 'The eleventh studio album by The Beatles',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
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
        GetAlbumUseCase,
        {
          provide: ALBUM_REPOSITORY,
          useValue: mockAlbumRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetAlbumUseCase>(GetAlbumUseCase);
    albumRepository = module.get(ALBUM_REPOSITORY);
  });

  describe('execute', () => {
    it('debería retornar un álbum por su ID', async () => {
      // Arrange
      (albumRepository.findById as jest.Mock).mockResolvedValue(mockAlbum);

      // Act
      const result = await useCase.execute({ id: 'album-1' });

      // Assert
      expect(albumRepository.findById).toHaveBeenCalledWith('album-1');
      expect(result).toEqual({
        id: 'album-1',
        name: 'Abbey Road',
        artistId: 'artist-1',
        albumArtistId: 'artist-1',
        coverArtPath: '/covers/abbey-road.jpg',
        year: 1969,
        releaseDate: new Date('1969-09-26'),
        compilation: false,
        songCount: 17,
        duration: 2820,
        size: BigInt(125000000),
        description: 'The eleventh studio album by The Beatles',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      });
    });

    it('debería lanzar NotFoundError si el álbum no existe', async () => {
      // Arrange
      (albumRepository.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute({ id: 'nonexistent-id' })).rejects.toThrow(
        NotFoundError,
      );
      expect(albumRepository.findById).toHaveBeenCalledWith('nonexistent-id');
    });

    it('debería lanzar NotFoundError si el ID está vacío', async () => {
      // Act & Assert
      await expect(useCase.execute({ id: '' })).rejects.toThrow(NotFoundError);
      expect(albumRepository.findById).not.toHaveBeenCalled();
    });

    it('debería lanzar NotFoundError si el ID es solo espacios', async () => {
      // Act & Assert
      await expect(useCase.execute({ id: '   ' })).rejects.toThrow(
        NotFoundError,
      );
      expect(albumRepository.findById).not.toHaveBeenCalled();
    });

    it('debería manejar álbumes sin campos opcionales', async () => {
      // Arrange
      const minimalAlbum = Album.reconstruct({
        id: 'album-2',
        name: 'Unknown Album',
        artistId: undefined,
        albumArtistId: undefined,
        coverArtPath: undefined,
        year: undefined,
        releaseDate: undefined,
        compilation: false,
        songCount: 10,
        duration: 1800,
        size: BigInt(50000000),
        description: undefined,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      });

      (albumRepository.findById as jest.Mock).mockResolvedValue(minimalAlbum);

      // Act
      const result = await useCase.execute({ id: 'album-2' });

      // Assert
      expect(result.artistId).toBeUndefined();
      expect(result.coverArtPath).toBeUndefined();
      expect(result.year).toBeUndefined();
      expect(result.description).toBeUndefined();
    });

    it('debería manejar álbumes de compilación', async () => {
      // Arrange
      const compilationAlbum = Album.reconstruct({
        id: 'album-3',
        name: 'Greatest Hits',
        compilation: true,
        songCount: 25,
        duration: 4500,
        size: BigInt(200000000),
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      });

      (albumRepository.findById as jest.Mock).mockResolvedValue(
        compilationAlbum,
      );

      // Act
      const result = await useCase.execute({ id: 'album-3' });

      // Assert
      expect(result.compilation).toBe(true);
      expect(result.name).toBe('Greatest Hits');
    });
  });
});
