import { Test, TestingModule } from '@nestjs/testing';
import { SearchArtistsUseCase } from './search-artists.use-case';
import { ARTIST_REPOSITORY, IArtistRepository } from '../../ports/artist-repository.port';
import { Artist } from '../../entities/artist.entity';
import { ValidationError } from '@shared/errors';

describe('SearchArtistsUseCase', () => {
  let useCase: SearchArtistsUseCase;
  let artistRepository: jest.Mocked<IArtistRepository>;

  const mockArtists = [
    Artist.reconstruct({
      id: 'artist-1',
      name: 'The Beatles',
      albumCount: 13,
      songCount: 213,
      playCount: 50000,
      size: Number(1073741824),
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    }),
    Artist.reconstruct({
      id: 'artist-2',
      name: 'The Beach Boys',
      albumCount: 29,
      songCount: 301,
      playCount: 40000,
      size: Number(1610612736),
      createdAt: new Date('2025-01-02'),
      updatedAt: new Date('2025-01-02'),
    }),
  ];

  beforeEach(async () => {
    const mockArtistRepository: Partial<IArtistRepository> = {
      findById: jest.fn(),
      findAll: jest.fn(),
      search: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchArtistsUseCase,
        {
          provide: ARTIST_REPOSITORY,
          useValue: mockArtistRepository,
        },
      ],
    }).compile();

    useCase = module.get<SearchArtistsUseCase>(SearchArtistsUseCase);
    artistRepository = module.get(ARTIST_REPOSITORY);
  });

  describe('execute', () => {
    it('debería buscar artistas por query', async () => {
      // Arrange
      (artistRepository.search as jest.Mock).mockResolvedValue(mockArtists);

      // Act
      const result = await useCase.execute({
        query: 'Beatles',
        skip: 0,
        take: 10,
      });

      // Assert
      expect(artistRepository.search).toHaveBeenCalledWith('Beatles', 0, 10);
      expect(result.data).toHaveLength(2);
      expect(result.query).toBe('Beatles');
      expect(result.total).toBe(2);
    });

    it('debería lanzar ValidationError si query está vacío', async () => {
      // Act & Assert
      await expect(
        useCase.execute({ query: '', skip: 0, take: 10 }),
      ).rejects.toThrow(ValidationError);
      expect(artistRepository.search).not.toHaveBeenCalled();
    });

    it('debería lanzar ValidationError si query es solo espacios', async () => {
      // Act & Assert
      await expect(
        useCase.execute({ query: '   ', skip: 0, take: 10 }),
      ).rejects.toThrow(ValidationError);
      expect(artistRepository.search).not.toHaveBeenCalled();
    });

    it('debería lanzar ValidationError si query tiene menos de 2 caracteres', async () => {
      // Act & Assert
      await expect(
        useCase.execute({ query: 'a', skip: 0, take: 10 }),
      ).rejects.toThrow(ValidationError);
      expect(artistRepository.search).not.toHaveBeenCalled();
    });

    it('debería limpiar espacios del query antes de buscar', async () => {
      // Arrange
      (artistRepository.search as jest.Mock).mockResolvedValue(mockArtists);

      // Act
      const result = await useCase.execute({
        query: '  Beatles  ',
        skip: 0,
        take: 10,
      });

      // Assert
      expect(artistRepository.search).toHaveBeenCalledWith('Beatles', 0, 10);
      expect(result.query).toBe('Beatles');
    });

    it('debería limitar take a máximo 100', async () => {
      // Arrange
      (artistRepository.search as jest.Mock).mockResolvedValue(mockArtists);

      // Act
      const result = await useCase.execute({
        query: 'Beatles',
        skip: 0,
        take: 150,
      });

      // Assert
      expect(artistRepository.search).toHaveBeenCalledWith('Beatles', 0, 100);
      expect(result.take).toBe(100);
    });

    it('debería convertir skip negativo a 0', async () => {
      // Arrange
      (artistRepository.search as jest.Mock).mockResolvedValue(mockArtists);

      // Act
      const result = await useCase.execute({
        query: 'Beatles',
        skip: -10,
        take: 10,
      });

      // Assert
      expect(artistRepository.search).toHaveBeenCalledWith('Beatles', 0, 10);
      expect(result.skip).toBe(0);
    });

    it('debería convertir take menor a 1 a 1', async () => {
      // Arrange
      (artistRepository.search as jest.Mock).mockResolvedValue([mockArtists[0]]);

      // Act
      const result = await useCase.execute({
        query: 'Beatles',
        skip: 0,
        take: 0,
      });

      // Assert
      expect(artistRepository.search).toHaveBeenCalledWith('Beatles', 0, 1);
      expect(result.take).toBe(1);
    });

    it('debería establecer hasMore correctamente', async () => {
      // Arrange
      // Mock debe respetar el 'take' y retornar solo 1 artista
      (artistRepository.search as jest.Mock).mockResolvedValue([mockArtists[0]]);

      // Act
      const result = await useCase.execute({
        query: 'Beatles',
        skip: 0,
        take: 1,
      });

      // Assert
      expect(result.hasMore).toBe(true); // artists.length === take
    });

    it('debería establecer hasMore en false cuando no hay más resultados', async () => {
      // Arrange
      (artistRepository.search as jest.Mock).mockResolvedValue(mockArtists);

      // Act
      const result = await useCase.execute({
        query: 'Beatles',
        skip: 0,
        take: 10,
      });

      // Assert
      expect(result.hasMore).toBe(false); // artists.length < take
    });

    it('debería manejar resultado vacío', async () => {
      // Arrange
      (artistRepository.search as jest.Mock).mockResolvedValue([]);

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

    it('debería mapear correctamente todos los campos de los artistas', async () => {
      // Arrange
      const artistWithAllFields = Artist.reconstruct({
        id: 'artist-full',
        name: 'Search Result Artist',
        albumCount: 20,
        songCount: 250,
        playCount: 100000,
        mbzArtistId: 'test-mbz-id',
        biography: 'A searchable artist',
        smallImageUrl: 'https://example.com/small.jpg',
        mediumImageUrl: 'https://example.com/medium.jpg',
        largeImageUrl: 'https://example.com/large.jpg',
        externalUrl: 'https://example.com/artist',
        externalInfoUpdatedAt: new Date('2025-01-15'),
        orderArtistName: 'Artist, Search Result',
        size: Number(2147483648),
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
      });

      (artistRepository.search as jest.Mock).mockResolvedValue([
        artistWithAllFields,
      ]);

      // Act
      const result = await useCase.execute({
        query: 'Search',
        skip: 0,
        take: 10,
      });

      // Assert
      const mappedArtist = result.data[0];
      expect(mappedArtist.id).toBe('artist-full');
      expect(mappedArtist.name).toBe('Search Result Artist');
      expect(mappedArtist.albumCount).toBe(20);
      expect(mappedArtist.songCount).toBe(250);
      expect(mappedArtist.mbzArtistId).toBe('test-mbz-id');
      expect(mappedArtist.biography).toBe('A searchable artist');
      expect(mappedArtist.smallImageUrl).toBe('https://example.com/small.jpg');
      expect(mappedArtist.orderArtistName).toBe('Artist, Search Result');
      expect(mappedArtist.size).toEqual(Number(2147483648));
    });

    it('debería aceptar query con exactamente 2 caracteres', async () => {
      // Arrange
      (artistRepository.search as jest.Mock).mockResolvedValue([]);

      // Act
      await useCase.execute({ query: 'ab', skip: 0, take: 10 });

      // Assert
      expect(artistRepository.search).toHaveBeenCalledWith('ab', 0, 10);
    });

    it('debería manejar queries con caracteres especiales', async () => {
      // Arrange
      (artistRepository.search as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await useCase.execute({
        query: 'AC/DC',
        skip: 0,
        take: 10,
      });

      // Assert
      expect(artistRepository.search).toHaveBeenCalledWith('AC/DC', 0, 10);
      expect(result.query).toBe('AC/DC');
    });
  });
});
