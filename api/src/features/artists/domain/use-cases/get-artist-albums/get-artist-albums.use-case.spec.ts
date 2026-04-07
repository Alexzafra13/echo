import { Test, TestingModule } from '@nestjs/testing';
import { GetArtistAlbumsUseCase } from './get-artist-albums.use-case';
import { ALBUM_REPOSITORY, IAlbumRepository } from '@features/albums/domain/ports/album-repository.port';
import { Album } from '@features/albums/domain/entities/album.entity';

describe('GetArtistAlbumsUseCase', () => {
  let useCase: GetArtistAlbumsUseCase;
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
      countByArtistId: jest.fn(),
      findRecent: jest.fn(),
      findMostPlayed: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetArtistAlbumsUseCase,
        {
          provide: ALBUM_REPOSITORY,
          useValue: mockAlbumRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetArtistAlbumsUseCase>(GetArtistAlbumsUseCase);
    albumRepository = module.get(ALBUM_REPOSITORY);
  });

  describe('execute', () => {
    it('debería retornar álbumes de un artista con paginación', async () => {
      // Arrange
      (albumRepository.findByArtistId as jest.Mock).mockResolvedValue(mockAlbums);
      (albumRepository.countByArtistId as jest.Mock).mockResolvedValue(10);

      // Act
      const result = await useCase.execute({
        artistId: 'artist-1',
        skip: 0,
        take: 20,
      });

      // Assert
      expect(albumRepository.findByArtistId).toHaveBeenCalledWith('artist-1', 0, 20);
      expect(albumRepository.countByArtistId).toHaveBeenCalledWith('artist-1');
      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(10);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
      expect(result.hasMore).toBe(false);
    });

    it('debería indicar hasMore cuando hay más resultados', async () => {
      // Arrange
      (albumRepository.findByArtistId as jest.Mock).mockResolvedValue(mockAlbums);
      (albumRepository.countByArtistId as jest.Mock).mockResolvedValue(50);

      // Act
      const result = await useCase.execute({
        artistId: 'artist-1',
        skip: 0,
        take: 20,
      });

      // Assert
      expect(result.hasMore).toBe(true);
    });

    it('debería usar valores por defecto para skip y take', async () => {
      // Arrange
      (albumRepository.findByArtistId as jest.Mock).mockResolvedValue(mockAlbums);
      (albumRepository.countByArtistId as jest.Mock).mockResolvedValue(3);

      // Act
      const result = await useCase.execute({ artistId: 'artist-1' });

      // Assert
      expect(albumRepository.findByArtistId).toHaveBeenCalledWith('artist-1', 0, 100);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(100);
    });

    it('debería manejar paginación correctamente', async () => {
      // Arrange
      (albumRepository.findByArtistId as jest.Mock).mockResolvedValue(mockAlbums);
      (albumRepository.countByArtistId as jest.Mock).mockResolvedValue(100);

      // Act
      const result = await useCase.execute({
        artistId: 'artist-1',
        skip: 20,
        take: 10,
      });

      // Assert
      expect(albumRepository.findByArtistId).toHaveBeenCalledWith('artist-1', 20, 10);
      expect(result.skip).toBe(20);
      expect(result.take).toBe(10);
      expect(result.hasMore).toBe(true); // 20 + 10 < 100
    });

    it('debería retornar array vacío si el artista no tiene álbumes', async () => {
      // Arrange
      (albumRepository.findByArtistId as jest.Mock).mockResolvedValue([]);
      (albumRepository.countByArtistId as jest.Mock).mockResolvedValue(0);

      // Act
      const result = await useCase.execute({ artistId: 'artist-without-albums' });

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('debería mapear correctamente las propiedades del álbum', async () => {
      // Arrange
      (albumRepository.findByArtistId as jest.Mock).mockResolvedValue([mockAlbums[0]]);
      (albumRepository.countByArtistId as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await useCase.execute({ artistId: 'artist-1' });

      // Assert
      expect(result.data[0]).toEqual({
        id: 'album-1',
        name: 'Abbey Road',
        artistId: 'artist-1',
        artistName: 'The Beatles',
        coverArtPath: '/covers/album-1.jpg',
        year: 1969,
        songCount: 17,
        duration: 2820,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      });
    });

    it('debería ejecutar findByArtistId y countByArtistId en paralelo', async () => {
      // Arrange
      let findByArtistIdResolved = false;
      let countByArtistIdResolved = false;

      (albumRepository.findByArtistId as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            findByArtistIdResolved = true;
            resolve(mockAlbums);
          }, 10);
        });
      });

      (albumRepository.countByArtistId as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            countByArtistIdResolved = true;
            resolve(10);
          }, 10);
        });
      });

      // Act
      const startTime = Date.now();
      await useCase.execute({ artistId: 'artist-1' });
      const endTime = Date.now();

      // Assert - Both should complete in parallel (under 30ms, not 20ms sequentially)
      expect(findByArtistIdResolved).toBe(true);
      expect(countByArtistIdResolved).toBe(true);
      expect(endTime - startTime).toBeLessThan(30);
    });

    it('debería manejar álbumes sin campos opcionales', async () => {
      // Arrange
      const minimalAlbum = Album.reconstruct({
        id: 'album-minimal',
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

      (albumRepository.findByArtistId as jest.Mock).mockResolvedValue([minimalAlbum]);
      (albumRepository.countByArtistId as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await useCase.execute({ artistId: 'artist-1' });

      // Assert
      expect(result.data[0].artistId).toBeUndefined();
      expect(result.data[0].artistName).toBeUndefined();
      expect(result.data[0].coverArtPath).toBeUndefined();
      expect(result.data[0].year).toBeUndefined();
    });

    it('debería validar paginación con skip negativo', async () => {
      // Arrange
      (albumRepository.findByArtistId as jest.Mock).mockResolvedValue(mockAlbums);
      (albumRepository.countByArtistId as jest.Mock).mockResolvedValue(3);

      // Act
      const result = await useCase.execute({
        artistId: 'artist-1',
        skip: -10,
        take: 20,
      });

      // Assert - skip negativo se convierte en 0
      expect(albumRepository.findByArtistId).toHaveBeenCalledWith('artist-1', 0, 20);
      expect(result.skip).toBe(0);
    });

    it('debería limitar take a máximo 100', async () => {
      // Arrange
      (albumRepository.findByArtistId as jest.Mock).mockResolvedValue(mockAlbums);
      (albumRepository.countByArtistId as jest.Mock).mockResolvedValue(3);

      // Act
      const result = await useCase.execute({
        artistId: 'artist-1',
        skip: 0,
        take: 500,
      });

      // Assert
      expect(albumRepository.findByArtistId).toHaveBeenCalledWith('artist-1', 0, 100);
      expect(result.take).toBe(100);
    });
  });
});
