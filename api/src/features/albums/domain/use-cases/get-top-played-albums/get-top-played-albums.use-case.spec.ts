import { Test, TestingModule } from '@nestjs/testing';
import { GetTopPlayedAlbumsUseCase } from './get-top-played-albums.use-case';
import { ALBUM_REPOSITORY, IAlbumRepository } from '../../ports/album-repository.port';
import { Album } from '../../entities/album.entity';

describe('GetTopPlayedAlbumsUseCase', () => {
  let useCase: GetTopPlayedAlbumsUseCase;
  let albumRepository: jest.Mocked<IAlbumRepository>;

  const createMockAlbum = (id: string, name: string) =>
    Album.reconstruct({
      id,
      name,
      artistId: 'artist-1',
      artistName: 'The Beatles',
      albumArtistId: 'artist-1',
      coverArtPath: `/covers/${id}.jpg`,
      year: 1969,
      releaseDate: new Date('1969-09-26'),
      compilation: false,
      songCount: 17,
      duration: 2820,
      size: Number(125000000),
      description: `Description for ${name}`,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    });

  const mockAlbums = [
    createMockAlbum('album-1', 'Abbey Road'),
    createMockAlbum('album-2', 'Let It Be'),
    createMockAlbum('album-3', 'Revolver'),
  ];

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
        GetTopPlayedAlbumsUseCase,
        {
          provide: ALBUM_REPOSITORY,
          useValue: mockAlbumRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetTopPlayedAlbumsUseCase>(GetTopPlayedAlbumsUseCase);
    albumRepository = module.get(ALBUM_REPOSITORY);
  });

  describe('execute', () => {
    it('debería retornar álbumes más reproducidos con take por defecto', async () => {
      // Arrange
      (albumRepository.findMostPlayed as jest.Mock).mockResolvedValue(mockAlbums);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(albumRepository.findMostPlayed).toHaveBeenCalledWith(10); // Default take
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Abbey Road');
    });

    it('debería respetar el parámetro take', async () => {
      // Arrange
      (albumRepository.findMostPlayed as jest.Mock).mockResolvedValue(mockAlbums.slice(0, 2));

      // Act
      const result = await useCase.execute({ take: 2 });

      // Assert
      expect(albumRepository.findMostPlayed).toHaveBeenCalledWith(2);
      expect(result).toHaveLength(2);
    });

    it('debería limitar take a máximo 50', async () => {
      // Arrange
      (albumRepository.findMostPlayed as jest.Mock).mockResolvedValue(mockAlbums);

      // Act
      await useCase.execute({ take: 100 });

      // Assert
      expect(albumRepository.findMostPlayed).toHaveBeenCalledWith(50);
    });

    it('debería asegurar take mínimo de 1', async () => {
      // Arrange
      (albumRepository.findMostPlayed as jest.Mock).mockResolvedValue(mockAlbums);

      // Act
      await useCase.execute({ take: 0 });

      // Assert
      expect(albumRepository.findMostPlayed).toHaveBeenCalledWith(1);
    });

    it('debería manejar take negativo', async () => {
      // Arrange
      (albumRepository.findMostPlayed as jest.Mock).mockResolvedValue(mockAlbums);

      // Act
      await useCase.execute({ take: -5 });

      // Assert
      expect(albumRepository.findMostPlayed).toHaveBeenCalledWith(1);
    });

    it('debería retornar array vacío si no hay álbumes', async () => {
      // Arrange
      (albumRepository.findMostPlayed as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result).toHaveLength(0);
    });

    it('debería mapear correctamente las propiedades del álbum', async () => {
      // Arrange
      (albumRepository.findMostPlayed as jest.Mock).mockResolvedValue([mockAlbums[0]]);

      // Act
      const result = await useCase.execute({ take: 1 });

      // Assert
      expect(result[0]).toEqual({
        id: 'album-1',
        name: 'Abbey Road',
        artistId: 'artist-1',
        artistName: 'The Beatles',
        albumArtistId: 'artist-1',
        coverArtPath: '/covers/album-1.jpg',
        year: 1969,
        releaseDate: new Date('1969-09-26'),
        compilation: false,
        songCount: 17,
        duration: 2820,
        size: Number(125000000),
        description: 'Description for Abbey Road',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      });
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
      expect(result[0].artistId).toBeUndefined();
      expect(result[0].coverArtPath).toBeUndefined();
      expect(result[0].year).toBeUndefined();
    });
  });
});
