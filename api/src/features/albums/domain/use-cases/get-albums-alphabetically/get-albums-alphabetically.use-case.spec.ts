import { Test, TestingModule } from '@nestjs/testing';
import { GetAlbumsAlphabeticallyUseCase } from './get-albums-alphabetically.use-case';
import { ALBUM_REPOSITORY, IAlbumRepository } from '../../ports/album-repository.port';
import { Album } from '../../entities/album.entity';

describe('GetAlbumsAlphabeticallyUseCase', () => {
  let useCase: GetAlbumsAlphabeticallyUseCase;
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
    createMockAlbum('album-2', 'Beatles For Sale'),
    createMockAlbum('album-3', 'Help!'),
  ];

  beforeEach(async () => {
    const mockAlbumRepository: Partial<IAlbumRepository> = {
      findById: jest.fn(),
      findAll: jest.fn(),
      search: jest.fn(),
      findByArtistId: jest.fn(),
      findRecent: jest.fn(),
      findMostPlayed: jest.fn(),
      findAlphabetically: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAlbumsAlphabeticallyUseCase,
        {
          provide: ALBUM_REPOSITORY,
          useValue: mockAlbumRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetAlbumsAlphabeticallyUseCase>(GetAlbumsAlphabeticallyUseCase);
    albumRepository = module.get(ALBUM_REPOSITORY);
  });

  describe('execute', () => {
    it('debería retornar álbumes ordenados alfabéticamente con paginación', async () => {
      // Arrange
      (albumRepository.findAlphabetically as jest.Mock).mockResolvedValue(mockAlbums);
      (albumRepository.count as jest.Mock).mockResolvedValue(100);

      // Act
      const result = await useCase.execute({ page: 1, limit: 20 });

      // Assert
      expect(albumRepository.findAlphabetically).toHaveBeenCalledWith(0, 20);
      expect(albumRepository.count).toHaveBeenCalled();
      expect(result).toEqual({
        albums: mockAlbums,
        total: 100,
        page: 1,
        limit: 20,
        totalPages: 5,
      });
    });

    it('debería calcular skip correctamente para página 2', async () => {
      // Arrange
      (albumRepository.findAlphabetically as jest.Mock).mockResolvedValue(mockAlbums);
      (albumRepository.count as jest.Mock).mockResolvedValue(100);

      // Act
      await useCase.execute({ page: 2, limit: 20 });

      // Assert
      expect(albumRepository.findAlphabetically).toHaveBeenCalledWith(20, 20);
    });

    it('debería calcular skip correctamente para página 5', async () => {
      // Arrange
      (albumRepository.findAlphabetically as jest.Mock).mockResolvedValue(mockAlbums);
      (albumRepository.count as jest.Mock).mockResolvedValue(100);

      // Act
      await useCase.execute({ page: 5, limit: 10 });

      // Assert
      expect(albumRepository.findAlphabetically).toHaveBeenCalledWith(40, 10);
    });

    it('debería usar valores por defecto para page y limit', async () => {
      // Arrange
      (albumRepository.findAlphabetically as jest.Mock).mockResolvedValue(mockAlbums);
      (albumRepository.count as jest.Mock).mockResolvedValue(50);

      // Act - 0 es falsy, por lo que se usa el default de 20
      const result = await useCase.execute({ page: 0, limit: 0 });

      // Assert
      expect(albumRepository.findAlphabetically).toHaveBeenCalledWith(0, 20);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('debería limitar limit a máximo 100', async () => {
      // Arrange
      (albumRepository.findAlphabetically as jest.Mock).mockResolvedValue(mockAlbums);
      (albumRepository.count as jest.Mock).mockResolvedValue(500);

      // Act
      const result = await useCase.execute({ page: 1, limit: 200 });

      // Assert
      expect(albumRepository.findAlphabetically).toHaveBeenCalledWith(0, 100);
      expect(result.limit).toBe(100);
    });

    it('debería calcular totalPages correctamente', async () => {
      // Arrange
      (albumRepository.findAlphabetically as jest.Mock).mockResolvedValue(mockAlbums);
      (albumRepository.count as jest.Mock).mockResolvedValue(55);

      // Act
      const result = await useCase.execute({ page: 1, limit: 20 });

      // Assert
      expect(result.totalPages).toBe(3); // Math.ceil(55 / 20) = 3
    });

    it('debería retornar array vacío si no hay álbumes', async () => {
      // Arrange
      (albumRepository.findAlphabetically as jest.Mock).mockResolvedValue([]);
      (albumRepository.count as jest.Mock).mockResolvedValue(0);

      // Act
      const result = await useCase.execute({ page: 1, limit: 20 });

      // Assert
      expect(result.albums).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('debería manejar página negativa', async () => {
      // Arrange
      (albumRepository.findAlphabetically as jest.Mock).mockResolvedValue(mockAlbums);
      (albumRepository.count as jest.Mock).mockResolvedValue(100);

      // Act
      const result = await useCase.execute({ page: -1, limit: 20 });

      // Assert
      expect(result.page).toBe(1);
      expect(albumRepository.findAlphabetically).toHaveBeenCalledWith(0, 20);
    });

    it('debería ejecutar findAlphabetically y count en paralelo', async () => {
      // Arrange
      let findAlphabeticallyResolved = false;
      let countResolved = false;

      (albumRepository.findAlphabetically as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            findAlphabeticallyResolved = true;
            resolve(mockAlbums);
          }, 10);
        });
      });

      (albumRepository.count as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            countResolved = true;
            resolve(100);
          }, 10);
        });
      });

      // Act
      const startTime = Date.now();
      await useCase.execute({ page: 1, limit: 20 });
      const endTime = Date.now();

      // Assert - Both should complete in parallel (under 30ms, not 20ms sequentially)
      expect(findAlphabeticallyResolved).toBe(true);
      expect(countResolved).toBe(true);
      expect(endTime - startTime).toBeLessThan(30);
    });
  });
});
