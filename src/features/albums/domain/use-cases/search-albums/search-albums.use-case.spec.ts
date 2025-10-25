import { Test, TestingModule } from '@nestjs/testing';
import { SearchAlbumsUseCase } from './search-albums.use-case';
import { ALBUM_REPOSITORY, IAlbumRepository } from '../../ports/album-repository.port';
import { Album } from '../../entities/album.entity';
import { ValidationError } from '@shared/errors';

describe('SearchAlbumsUseCase', () => {
  let useCase: SearchAlbumsUseCase;
  let albumRepository: jest.Mocked<IAlbumRepository>;

  const mockAlbums = [
    Album.reconstruct({
      id: 'album-1',
      name: 'Abbey Road',
      artistId: 'artist-1',
      compilation: false,
      songCount: 17,
      duration: 2820,
      size: BigInt(125000000),
      year: 1969,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    }),
    Album.reconstruct({
      id: 'album-2',
      name: 'Abbey Road Live',
      artistId: 'artist-1',
      compilation: false,
      songCount: 12,
      duration: 2400,
      size: BigInt(110000000),
      year: 1970,
      createdAt: new Date('2025-01-02'),
      updatedAt: new Date('2025-01-02'),
    }),
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
        SearchAlbumsUseCase,
        {
          provide: ALBUM_REPOSITORY,
          useValue: mockAlbumRepository,
        },
      ],
    }).compile();

    useCase = module.get<SearchAlbumsUseCase>(SearchAlbumsUseCase);
    albumRepository = module.get(ALBUM_REPOSITORY);
  });

  describe('execute', () => {
    it('debería buscar álbumes por query', async () => {
      // Arrange
      (albumRepository.search as jest.Mock).mockResolvedValue(mockAlbums);

      // Act
      const result = await useCase.execute({
        query: 'Abbey',
        skip: 0,
        take: 10,
      });

      // Assert
      expect(albumRepository.search).toHaveBeenCalledWith('Abbey', 0, 10);
      expect(result.data).toHaveLength(2);
      expect(result.query).toBe('Abbey');
      expect(result.total).toBe(2);
    });

    it('debería lanzar ValidationError si query está vacío', async () => {
      // Act & Assert
      await expect(
        useCase.execute({ query: '', skip: 0, take: 10 }),
      ).rejects.toThrow(ValidationError);
      expect(albumRepository.search).not.toHaveBeenCalled();
    });

    it('debería lanzar ValidationError si query es solo espacios', async () => {
      // Act & Assert
      await expect(
        useCase.execute({ query: '   ', skip: 0, take: 10 }),
      ).rejects.toThrow(ValidationError);
      expect(albumRepository.search).not.toHaveBeenCalled();
    });

    it('debería lanzar ValidationError si query tiene menos de 2 caracteres', async () => {
      // Act & Assert
      await expect(
        useCase.execute({ query: 'a', skip: 0, take: 10 }),
      ).rejects.toThrow(ValidationError);
      expect(albumRepository.search).not.toHaveBeenCalled();
    });

    it('debería limpiar espacios del query antes de buscar', async () => {
      // Arrange
      (albumRepository.search as jest.Mock).mockResolvedValue(mockAlbums);

      // Act
      const result = await useCase.execute({
        query: '  Abbey  ',
        skip: 0,
        take: 10,
      });

      // Assert
      expect(albumRepository.search).toHaveBeenCalledWith('Abbey', 0, 10);
      expect(result.query).toBe('Abbey');
    });

    it('debería limitar take a máximo 100', async () => {
      // Arrange
      (albumRepository.search as jest.Mock).mockResolvedValue(mockAlbums);

      // Act
      const result = await useCase.execute({
        query: 'Abbey',
        skip: 0,
        take: 150,
      });

      // Assert
      expect(albumRepository.search).toHaveBeenCalledWith('Abbey', 0, 100);
      expect(result.take).toBe(100);
    });

    it('debería convertir skip negativo a 0', async () => {
      // Arrange
      (albumRepository.search as jest.Mock).mockResolvedValue(mockAlbums);

      // Act
      const result = await useCase.execute({
        query: 'Abbey',
        skip: -10,
        take: 10,
      });

      // Assert
      expect(albumRepository.search).toHaveBeenCalledWith('Abbey', 0, 10);
      expect(result.skip).toBe(0);
    });

    it('debería convertir take menor a 1 a 1', async () => {
      // Arrange
      (albumRepository.search as jest.Mock).mockResolvedValue([mockAlbums[0]]);

      // Act
      const result = await useCase.execute({
        query: 'Abbey',
        skip: 0,
        take: 0,
      });

      // Assert
      expect(albumRepository.search).toHaveBeenCalledWith('Abbey', 0, 1);
      expect(result.take).toBe(1);
    });

    it('debería establecer hasMore correctamente', async () => {
      // Arrange
      (albumRepository.search as jest.Mock).mockResolvedValue(mockAlbums);

      // Act
      const result = await useCase.execute({
        query: 'Abbey',
        skip: 0,
        take: 1,
      });

      // Assert
      expect(result.hasMore).toBe(true); // 0 + 1 < 2
    });

    it('debería establecer hasMore en false cuando no hay más resultados', async () => {
      // Arrange
      (albumRepository.search as jest.Mock).mockResolvedValue(mockAlbums);

      // Act
      const result = await useCase.execute({
        query: 'Abbey',
        skip: 0,
        take: 10,
      });

      // Assert
      expect(result.hasMore).toBe(false); // 0 + 10 >= 2
    });

    it('debería manejar resultado vacío', async () => {
      // Arrange
      (albumRepository.search as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await useCase.execute({
        query: 'NonExistent',
        skip: 0,
        take: 10,
      });

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('debería mapear correctamente todos los campos de los álbumes', async () => {
      // Arrange
      const albumWithAllFields = Album.reconstruct({
        id: 'album-full',
        name: 'Search Result Album',
        artistId: 'artist-1',
        albumArtistId: 'artist-1',
        coverArtPath: '/covers/search.jpg',
        year: 2020,
        releaseDate: new Date('2020-05-15'),
        compilation: true,
        songCount: 15,
        duration: 3600,
        size: BigInt(150000000),
        description: 'A searchable album',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
      });

      (albumRepository.search as jest.Mock).mockResolvedValue([
        albumWithAllFields,
      ]);

      // Act
      const result = await useCase.execute({
        query: 'Search',
        skip: 0,
        take: 10,
      });

      // Assert
      const mappedAlbum = result.data[0];
      expect(mappedAlbum.id).toBe('album-full');
      expect(mappedAlbum.name).toBe('Search Result Album');
      expect(mappedAlbum.artistId).toBe('artist-1');
      expect(mappedAlbum.albumArtistId).toBe('artist-1');
      expect(mappedAlbum.coverArtPath).toBe('/covers/search.jpg');
      expect(mappedAlbum.year).toBe(2020);
      expect(mappedAlbum.releaseDate).toEqual(new Date('2020-05-15'));
      expect(mappedAlbum.compilation).toBe(true);
      expect(mappedAlbum.songCount).toBe(15);
      expect(mappedAlbum.duration).toBe(3600);
      expect(mappedAlbum.size).toEqual(BigInt(150000000));
      expect(mappedAlbum.description).toBe('A searchable album');
    });

    it('debería aceptar query con exactamente 2 caracteres', async () => {
      // Arrange
      (albumRepository.search as jest.Mock).mockResolvedValue([]);

      // Act
      await useCase.execute({ query: 'ab', skip: 0, take: 10 });

      // Assert
      expect(albumRepository.search).toHaveBeenCalledWith('ab', 0, 10);
    });

    it('debería manejar queries con caracteres especiales', async () => {
      // Arrange
      (albumRepository.search as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await useCase.execute({
        query: 'AC/DC',
        skip: 0,
        take: 10,
      });

      // Assert
      expect(albumRepository.search).toHaveBeenCalledWith('AC/DC', 0, 10);
      expect(result.query).toBe('AC/DC');
    });
  });
});
