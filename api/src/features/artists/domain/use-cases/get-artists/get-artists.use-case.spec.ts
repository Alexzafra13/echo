import { Test, TestingModule } from '@nestjs/testing';
import { GetArtistsUseCase } from './get-artists.use-case';
import { ARTIST_REPOSITORY, IArtistRepository } from '../../ports/artist-repository.port';
import { Artist } from '../../entities/artist.entity';

describe('GetArtistsUseCase', () => {
  let useCase: GetArtistsUseCase;
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
      name: 'Pink Floyd',
      albumCount: 15,
      songCount: 165,
      playCount: 40000,
      size: Number(858993459),
      createdAt: new Date('2025-01-02'),
      updatedAt: new Date('2025-01-02'),
    }),
    Artist.reconstruct({
      id: 'artist-3',
      name: 'Led Zeppelin',
      albumCount: 9,
      songCount: 94,
      playCount: 30000,
      size: Number(644245094),
      createdAt: new Date('2025-01-03'),
      updatedAt: new Date('2025-01-03'),
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
        GetArtistsUseCase,
        {
          provide: ARTIST_REPOSITORY,
          useValue: mockArtistRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetArtistsUseCase>(GetArtistsUseCase);
    artistRepository = module.get(ARTIST_REPOSITORY);
  });

  describe('execute', () => {
    it('debería retornar lista paginada con valores por defecto', async () => {
      // Arrange
      (artistRepository.findAll as jest.Mock).mockResolvedValue(mockArtists);
      (artistRepository.count as jest.Mock).mockResolvedValue(50);

      // Act
      const result = await useCase.execute({ skip: 0, take: 10 });

      // Assert
      expect(artistRepository.findAll).toHaveBeenCalledWith(0, 10);
      expect(artistRepository.count).toHaveBeenCalled();
      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(50);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(10);
      expect(result.hasMore).toBe(true); // 0 + 10 < 50
    });

    it('debería aplicar paginación correctamente', async () => {
      // Arrange
      (artistRepository.findAll as jest.Mock).mockResolvedValue([mockArtists[2]]);
      (artistRepository.count as jest.Mock).mockResolvedValue(50);

      // Act
      const result = await useCase.execute({ skip: 20, take: 5 });

      // Assert
      expect(artistRepository.findAll).toHaveBeenCalledWith(20, 5);
      expect(result.skip).toBe(20);
      expect(result.take).toBe(5);
      expect(result.hasMore).toBe(true); // 20 + 5 < 50
    });

    it('debería limitar take a máximo 100', async () => {
      // Arrange
      (artistRepository.findAll as jest.Mock).mockResolvedValue(mockArtists);
      (artistRepository.count as jest.Mock).mockResolvedValue(200);

      // Act
      const result = await useCase.execute({ skip: 0, take: 150 });

      // Assert
      expect(artistRepository.findAll).toHaveBeenCalledWith(0, 100); // Máximo 100
      expect(result.take).toBe(100);
    });

    it('debería establecer hasMore en false cuando no hay más resultados', async () => {
      // Arrange
      (artistRepository.findAll as jest.Mock).mockResolvedValue(mockArtists);
      (artistRepository.count as jest.Mock).mockResolvedValue(25);

      // Act
      const result = await useCase.execute({ skip: 20, take: 10 });

      // Assert
      expect(result.hasMore).toBe(false); // 20 + 10 >= 25
    });

    it('debería convertir skip negativo a 0', async () => {
      // Arrange
      (artistRepository.findAll as jest.Mock).mockResolvedValue(mockArtists);
      (artistRepository.count as jest.Mock).mockResolvedValue(50);

      // Act
      const result = await useCase.execute({ skip: -10, take: 10 });

      // Assert
      expect(artistRepository.findAll).toHaveBeenCalledWith(0, 10);
      expect(result.skip).toBe(0);
    });

    it('debería convertir take menor a 1 a 1', async () => {
      // Arrange
      (artistRepository.findAll as jest.Mock).mockResolvedValue([mockArtists[0]]);
      (artistRepository.count as jest.Mock).mockResolvedValue(50);

      // Act
      const result = await useCase.execute({ skip: 0, take: 0 });

      // Assert
      expect(artistRepository.findAll).toHaveBeenCalledWith(0, 1);
      expect(result.take).toBe(1);
    });

    it('debería manejar resultado vacío', async () => {
      // Arrange
      (artistRepository.findAll as jest.Mock).mockResolvedValue([]);
      (artistRepository.count as jest.Mock).mockResolvedValue(0);

      // Act
      const result = await useCase.execute({ skip: 0, take: 10 });

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('debería mapear correctamente todos los campos de los artistas', async () => {
      // Arrange
      const artistWithAllFields = Artist.reconstruct({
        id: 'artist-full',
        name: 'Complete Artist',
        albumCount: 20,
        songCount: 250,
        playCount: 100000,
        mbzArtistId: 'test-mbz-id',
        biography: 'A complete artist biography',
        smallImageUrl: 'https://example.com/small.jpg',
        mediumImageUrl: 'https://example.com/medium.jpg',
        largeImageUrl: 'https://example.com/large.jpg',
        externalUrl: 'https://example.com/artist',
        externalInfoUpdatedAt: new Date('2025-01-15'),
        orderArtistName: 'Artist, Complete',
        size: Number(2147483648),
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
      });

      (artistRepository.findAll as jest.Mock).mockResolvedValue([
        artistWithAllFields,
      ]);
      (artistRepository.count as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await useCase.execute({ skip: 0, take: 10 });

      // Assert
      const mappedArtist = result.data[0];
      expect(mappedArtist.id).toBe('artist-full');
      expect(mappedArtist.name).toBe('Complete Artist');
      expect(mappedArtist.albumCount).toBe(20);
      expect(mappedArtist.songCount).toBe(250);
      expect(mappedArtist.mbzArtistId).toBe('test-mbz-id');
      expect(mappedArtist.biography).toBe('A complete artist biography');
      expect(mappedArtist.smallImageUrl).toBe('https://example.com/small.jpg');
      expect(mappedArtist.orderArtistName).toBe('Artist, Complete');
      expect(mappedArtist.size).toEqual(Number(2147483648));
    });

    it('debería usar valores por defecto si no se provee skip/take', async () => {
      // Arrange
      (artistRepository.findAll as jest.Mock).mockResolvedValue(mockArtists);
      (artistRepository.count as jest.Mock).mockResolvedValue(50);

      // Act
      const result = await useCase.execute({} as any);

      // Assert
      expect(artistRepository.findAll).toHaveBeenCalledWith(0, 10);
    });
  });
});
