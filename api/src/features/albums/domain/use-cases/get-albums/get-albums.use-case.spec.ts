import { Test, TestingModule } from '@nestjs/testing';
import { GetAlbumsUseCase } from './get-albums.use-case';
import { GetAlbumsInput } from './get-albums.dto';
import { ALBUM_REPOSITORY, IAlbumRepository } from '../../ports/album-repository.port';
import { Album } from '../../entities/album.entity';

describe('GetAlbumsUseCase', () => {
  let useCase: GetAlbumsUseCase;
  let albumRepository: jest.Mocked<IAlbumRepository>;

  const mockAlbums = [
    Album.reconstruct({
      id: 'album-1',
      name: 'Abbey Road',
      artistId: 'artist-1',
      compilation: false,
      songCount: 17,
      duration: 2820,
      size: Number(125000000),
      year: 1969,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    }),
    Album.reconstruct({
      id: 'album-2',
      name: 'Thriller',
      artistId: 'artist-2',
      compilation: false,
      songCount: 9,
      duration: 2580,
      size: Number(115000000),
      year: 1982,
      createdAt: new Date('2025-01-02'),
      updatedAt: new Date('2025-01-02'),
    }),
    Album.reconstruct({
      id: 'album-3',
      name: 'The Dark Side of the Moon',
      artistId: 'artist-3',
      compilation: false,
      songCount: 10,
      duration: 2580,
      size: Number(120000000),
      year: 1973,
      createdAt: new Date('2025-01-03'),
      updatedAt: new Date('2025-01-03'),
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
        GetAlbumsUseCase,
        {
          provide: ALBUM_REPOSITORY,
          useValue: mockAlbumRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetAlbumsUseCase>(GetAlbumsUseCase);
    albumRepository = module.get(ALBUM_REPOSITORY);
  });

  describe('execute', () => {
    it('debería retornar lista paginada con valores por defecto', async () => {
      // Arrange
      (albumRepository.findAll as jest.Mock).mockResolvedValue(mockAlbums);
      (albumRepository.count as jest.Mock).mockResolvedValue(50);

      // Act
      const result = await useCase.execute({ skip: 0, take: 10 });

      // Assert
      expect(albumRepository.findAll).toHaveBeenCalledWith(0, 10);
      expect(albumRepository.count).toHaveBeenCalled();
      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(50);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(10);
      expect(result.hasMore).toBe(true); // 0 + 10 < 50
    });

    it('debería aplicar paginación correctamente', async () => {
      // Arrange
      (albumRepository.findAll as jest.Mock).mockResolvedValue([mockAlbums[2]]);
      (albumRepository.count as jest.Mock).mockResolvedValue(50);

      // Act
      const result = await useCase.execute({ skip: 20, take: 5 });

      // Assert
      expect(albumRepository.findAll).toHaveBeenCalledWith(20, 5);
      expect(result.skip).toBe(20);
      expect(result.take).toBe(5);
      expect(result.hasMore).toBe(true); // 20 + 5 < 50
    });

    it('debería limitar take a máximo 100', async () => {
      // Arrange
      (albumRepository.findAll as jest.Mock).mockResolvedValue(mockAlbums);
      (albumRepository.count as jest.Mock).mockResolvedValue(200);

      // Act
      const result = await useCase.execute({ skip: 0, take: 150 });

      // Assert
      expect(albumRepository.findAll).toHaveBeenCalledWith(0, 100); // Máximo 100
      expect(result.take).toBe(100);
    });

    it('debería establecer hasMore en false cuando no hay más resultados', async () => {
      // Arrange
      (albumRepository.findAll as jest.Mock).mockResolvedValue(mockAlbums);
      (albumRepository.count as jest.Mock).mockResolvedValue(25);

      // Act
      const result = await useCase.execute({ skip: 20, take: 10 });

      // Assert
      expect(result.hasMore).toBe(false); // 20 + 10 >= 25
    });

    it('debería convertir skip negativo a 0', async () => {
      // Arrange
      (albumRepository.findAll as jest.Mock).mockResolvedValue(mockAlbums);
      (albumRepository.count as jest.Mock).mockResolvedValue(50);

      // Act
      const result = await useCase.execute({ skip: -10, take: 10 });

      // Assert
      expect(albumRepository.findAll).toHaveBeenCalledWith(0, 10);
      expect(result.skip).toBe(0);
    });

    it('debería convertir take menor a 1 a 1', async () => {
      // Arrange
      (albumRepository.findAll as jest.Mock).mockResolvedValue([mockAlbums[0]]);
      (albumRepository.count as jest.Mock).mockResolvedValue(50);

      // Act
      const result = await useCase.execute({ skip: 0, take: 0 });

      // Assert
      expect(albumRepository.findAll).toHaveBeenCalledWith(0, 1);
      expect(result.take).toBe(1);
    });

    it('debería manejar resultado vacío', async () => {
      // Arrange
      (albumRepository.findAll as jest.Mock).mockResolvedValue([]);
      (albumRepository.count as jest.Mock).mockResolvedValue(0);

      // Act
      const result = await useCase.execute({ skip: 0, take: 10 });

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('debería mapear correctamente todos los campos de los álbumes', async () => {
      // Arrange
      const albumWithAllFields = Album.reconstruct({
        id: 'album-full',
        name: 'Complete Album',
        artistId: 'artist-1',
        albumArtistId: 'artist-1',
        coverArtPath: '/covers/complete.jpg',
        year: 2020,
        releaseDate: new Date('2020-05-15'),
        compilation: true,
        songCount: 15,
        duration: 3600,
        size: Number(150000000),
        description: 'A complete album with all fields',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
      });

      (albumRepository.findAll as jest.Mock).mockResolvedValue([albumWithAllFields]);
      (albumRepository.count as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await useCase.execute({ skip: 0, take: 10 });

      // Assert
      const mappedAlbum = result.data[0];
      expect(mappedAlbum.id).toBe('album-full');
      expect(mappedAlbum.name).toBe('Complete Album');
      expect(mappedAlbum.artistId).toBe('artist-1');
      expect(mappedAlbum.albumArtistId).toBe('artist-1');
      expect(mappedAlbum.coverArtPath).toBe('/covers/complete.jpg');
      expect(mappedAlbum.year).toBe(2020);
      expect(mappedAlbum.releaseDate).toEqual(new Date('2020-05-15'));
      expect(mappedAlbum.compilation).toBe(true);
      expect(mappedAlbum.songCount).toBe(15);
      expect(mappedAlbum.duration).toBe(3600);
      expect(mappedAlbum.size).toEqual(Number(150000000));
      expect(mappedAlbum.description).toBe('A complete album with all fields');
    });

    it('debería usar valores por defecto si no se provee skip/take', async () => {
      // Arrange
      (albumRepository.findAll as jest.Mock).mockResolvedValue(mockAlbums);
      (albumRepository.count as jest.Mock).mockResolvedValue(50);

      // Act
      const result = await useCase.execute({} as unknown as GetAlbumsInput);

      // Assert
      expect(albumRepository.findAll).toHaveBeenCalledWith(0, 10);
    });
  });
});
