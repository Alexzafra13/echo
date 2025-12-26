import { Test, TestingModule } from '@nestjs/testing';
import { GetRecentlyPlayedAlbumsUseCase } from './get-recently-played-albums.use-case';
import { ALBUM_REPOSITORY, IAlbumRepository } from '../../ports/album-repository.port';
import { Album } from '../../entities/album.entity';

describe('GetRecentlyPlayedAlbumsUseCase', () => {
  let useCase: GetRecentlyPlayedAlbumsUseCase;
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
      findRecentlyPlayed: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetRecentlyPlayedAlbumsUseCase,
        {
          provide: ALBUM_REPOSITORY,
          useValue: mockAlbumRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetRecentlyPlayedAlbumsUseCase>(GetRecentlyPlayedAlbumsUseCase);
    albumRepository = module.get(ALBUM_REPOSITORY);
  });

  describe('execute', () => {
    it('debería retornar álbumes reproducidos recientemente por el usuario', async () => {
      // Arrange
      (albumRepository.findRecentlyPlayed as jest.Mock).mockResolvedValue(mockAlbums);

      // Act
      const result = await useCase.execute({ userId: 'user-1' });

      // Assert
      expect(albumRepository.findRecentlyPlayed).toHaveBeenCalledWith('user-1', 20);
      expect(result.albums).toHaveLength(3);
      expect(result.albums[0].name).toBe('Abbey Road');
    });

    it('debería respetar el parámetro limit', async () => {
      // Arrange
      (albumRepository.findRecentlyPlayed as jest.Mock).mockResolvedValue(mockAlbums.slice(0, 2));

      // Act
      const result = await useCase.execute({ userId: 'user-1', limit: 2 });

      // Assert
      expect(albumRepository.findRecentlyPlayed).toHaveBeenCalledWith('user-1', 2);
      expect(result.albums).toHaveLength(2);
    });

    it('debería limitar limit a máximo 100', async () => {
      // Arrange
      (albumRepository.findRecentlyPlayed as jest.Mock).mockResolvedValue(mockAlbums);

      // Act
      await useCase.execute({ userId: 'user-1', limit: 200 });

      // Assert
      expect(albumRepository.findRecentlyPlayed).toHaveBeenCalledWith('user-1', 100);
    });

    it('debería usar default de 20 cuando limit es 0 (falsy)', async () => {
      // Arrange
      (albumRepository.findRecentlyPlayed as jest.Mock).mockResolvedValue(mockAlbums);

      // Act - 0 es falsy, por lo que se usa el default de 20
      await useCase.execute({ userId: 'user-1', limit: 0 });

      // Assert
      expect(albumRepository.findRecentlyPlayed).toHaveBeenCalledWith('user-1', 20);
    });

    it('debería manejar limit negativo', async () => {
      // Arrange
      (albumRepository.findRecentlyPlayed as jest.Mock).mockResolvedValue(mockAlbums);

      // Act
      await useCase.execute({ userId: 'user-1', limit: -5 });

      // Assert
      expect(albumRepository.findRecentlyPlayed).toHaveBeenCalledWith('user-1', 1);
    });

    it('debería retornar array vacío si usuario no ha reproducido álbumes', async () => {
      // Arrange
      (albumRepository.findRecentlyPlayed as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await useCase.execute({ userId: 'user-1' });

      // Assert
      expect(result.albums).toHaveLength(0);
    });

    it('debería pasar el userId correctamente', async () => {
      // Arrange
      (albumRepository.findRecentlyPlayed as jest.Mock).mockResolvedValue([]);

      // Act
      await useCase.execute({ userId: 'specific-user-id', limit: 10 });

      // Assert
      expect(albumRepository.findRecentlyPlayed).toHaveBeenCalledWith('specific-user-id', 10);
    });

    it('debería retornar entidades Album completas', async () => {
      // Arrange
      (albumRepository.findRecentlyPlayed as jest.Mock).mockResolvedValue([mockAlbums[0]]);

      // Act
      const result = await useCase.execute({ userId: 'user-1', limit: 1 });

      // Assert
      expect(result.albums[0]).toBeInstanceOf(Album);
      expect(result.albums[0].id).toBe('album-1');
      expect(result.albums[0].name).toBe('Abbey Road');
    });
  });
});
