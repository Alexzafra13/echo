import { Test, TestingModule } from '@nestjs/testing';
import { GetFavoriteAlbumsUseCase } from './get-favorite-albums.use-case';
import { ALBUM_REPOSITORY, IAlbumRepository } from '../../ports/album-repository.port';
import { Album } from '../../entities/album.entity';

describe('GetFavoriteAlbumsUseCase', () => {
  let useCase: GetFavoriteAlbumsUseCase;
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
      findFavorites: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetFavoriteAlbumsUseCase,
        {
          provide: ALBUM_REPOSITORY,
          useValue: mockAlbumRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetFavoriteAlbumsUseCase>(GetFavoriteAlbumsUseCase);
    albumRepository = module.get(ALBUM_REPOSITORY);
  });

  describe('execute', () => {
    it('debería retornar álbumes favoritos del usuario', async () => {
      // Arrange
      (albumRepository.findFavorites as jest.Mock).mockResolvedValue(mockAlbums);

      // Act
      const result = await useCase.execute({
        userId: 'user-1',
        page: 1,
        limit: 20,
      });

      // Assert
      expect(albumRepository.findFavorites).toHaveBeenCalledWith('user-1', 0, 21);
      expect(result.albums).toHaveLength(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.hasMore).toBe(false);
    });

    it('debería indicar hasMore cuando hay más páginas', async () => {
      // Arrange
      const manyAlbums = [...mockAlbums, createMockAlbum('album-4', 'Help!')];
      (albumRepository.findFavorites as jest.Mock).mockResolvedValue(manyAlbums);

      // Act
      const result = await useCase.execute({
        userId: 'user-1',
        page: 1,
        limit: 3,
      });

      // Assert - Pide limit + 1 (4), recibe 4, hasMore = true
      expect(albumRepository.findFavorites).toHaveBeenCalledWith('user-1', 0, 4);
      expect(result.albums).toHaveLength(3);
      expect(result.hasMore).toBe(true);
    });

    it('debería calcular skip correctamente para página 2', async () => {
      // Arrange
      (albumRepository.findFavorites as jest.Mock).mockResolvedValue(mockAlbums);

      // Act
      await useCase.execute({
        userId: 'user-1',
        page: 2,
        limit: 10,
      });

      // Assert
      expect(albumRepository.findFavorites).toHaveBeenCalledWith('user-1', 10, 11);
    });

    it('debería usar valores por defecto para page y limit', async () => {
      // Arrange
      (albumRepository.findFavorites as jest.Mock).mockResolvedValue(mockAlbums);

      // Act - 0 es falsy, por lo que se usa el default de 20
      const result = await useCase.execute({
        userId: 'user-1',
        page: 0,
        limit: 0,
      });

      // Assert - pide limit + 1 = 21 para saber si hay más páginas
      expect(albumRepository.findFavorites).toHaveBeenCalledWith('user-1', 0, 21);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('debería limitar limit a máximo 100', async () => {
      // Arrange
      (albumRepository.findFavorites as jest.Mock).mockResolvedValue(mockAlbums);

      // Act
      const result = await useCase.execute({
        userId: 'user-1',
        page: 1,
        limit: 200,
      });

      // Assert
      expect(albumRepository.findFavorites).toHaveBeenCalledWith('user-1', 0, 101);
      expect(result.limit).toBe(100);
    });

    it('debería retornar array vacío si usuario no tiene favoritos', async () => {
      // Arrange
      (albumRepository.findFavorites as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await useCase.execute({
        userId: 'user-1',
        page: 1,
        limit: 20,
      });

      // Assert
      expect(result.albums).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });

    it('debería manejar página negativa', async () => {
      // Arrange
      (albumRepository.findFavorites as jest.Mock).mockResolvedValue(mockAlbums);

      // Act
      const result = await useCase.execute({
        userId: 'user-1',
        page: -1,
        limit: 20,
      });

      // Assert
      expect(result.page).toBe(1);
      expect(albumRepository.findFavorites).toHaveBeenCalledWith('user-1', 0, 21);
    });

    it('debería pasar el userId correctamente', async () => {
      // Arrange
      (albumRepository.findFavorites as jest.Mock).mockResolvedValue([]);

      // Act
      await useCase.execute({
        userId: 'specific-user-id',
        page: 1,
        limit: 10,
      });

      // Assert
      expect(albumRepository.findFavorites).toHaveBeenCalledWith(
        'specific-user-id',
        expect.any(Number),
        expect.any(Number),
      );
    });

    it('debería retornar exactamente limit álbumes cuando hasMore es true', async () => {
      // Arrange - 6 álbumes cuando pedimos 5
      const sixAlbums = [
        ...mockAlbums,
        createMockAlbum('album-4', 'Help!'),
        createMockAlbum('album-5', 'Rubber Soul'),
        createMockAlbum('album-6', 'Sgt. Pepper'),
      ];
      (albumRepository.findFavorites as jest.Mock).mockResolvedValue(sixAlbums);

      // Act
      const result = await useCase.execute({
        userId: 'user-1',
        page: 1,
        limit: 5,
      });

      // Assert
      expect(result.albums).toHaveLength(5);
      expect(result.hasMore).toBe(true);
    });
  });
});
