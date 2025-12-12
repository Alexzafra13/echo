import { Test, TestingModule } from '@nestjs/testing';
import { GetArtistUseCase } from './get-artist.use-case';
import { ARTIST_REPOSITORY, IArtistRepository } from '../../ports/artist-repository.port';
import { Artist } from '../../entities/artist.entity';
import { NotFoundError } from '@shared/errors';

describe('GetArtistUseCase', () => {
  let useCase: GetArtistUseCase;
  let artistRepository: jest.Mocked<IArtistRepository>;

  const mockArtist = Artist.reconstruct({
    id: 'artist-1',
    name: 'The Beatles',
    albumCount: 13,
    songCount: 213,
    playCount: 50000,
    mbzArtistId: 'b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d',
    biography: 'The Beatles were an English rock band...',
    smallImageUrl: 'https://example.com/small.jpg',
    mediumImageUrl: 'https://example.com/medium.jpg',
    largeImageUrl: 'https://example.com/large.jpg',
    externalUrl: 'https://musicbrainz.org/artist/b10bbbfc',
    externalInfoUpdatedAt: new Date('2025-01-01'),
    orderArtistName: 'Beatles, The',
    size: Number(1073741824), // 1 GB
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  });

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
        GetArtistUseCase,
        {
          provide: ARTIST_REPOSITORY,
          useValue: mockArtistRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetArtistUseCase>(GetArtistUseCase);
    artistRepository = module.get(ARTIST_REPOSITORY);
  });

  describe('execute', () => {
    it('debería retornar un artista por su ID', async () => {
      // Arrange
      (artistRepository.findById as jest.Mock).mockResolvedValue(mockArtist);

      // Act
      const result = await useCase.execute({ id: 'artist-1' });

      // Assert
      expect(artistRepository.findById).toHaveBeenCalledWith('artist-1');
      expect(result).toEqual({
        id: 'artist-1',
        name: 'The Beatles',
        albumCount: 13,
        songCount: 213,
        playCount: 50000,
        mbzArtistId: 'b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d',
        biography: 'The Beatles were an English rock band...',
        smallImageUrl: 'https://example.com/small.jpg',
        mediumImageUrl: 'https://example.com/medium.jpg',
        largeImageUrl: 'https://example.com/large.jpg',
        externalUrl: 'https://musicbrainz.org/artist/b10bbbfc',
        externalInfoUpdatedAt: new Date('2025-01-01'),
        orderArtistName: 'Beatles, The',
        size: Number(1073741824),
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      });
    });

    it('debería lanzar NotFoundError si el artista no existe', async () => {
      // Arrange
      (artistRepository.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute({ id: 'nonexistent-id' })).rejects.toThrow(
        NotFoundError,
      );
      expect(artistRepository.findById).toHaveBeenCalledWith('nonexistent-id');
    });

    it('debería lanzar NotFoundError si el ID está vacío', async () => {
      // Act & Assert
      await expect(useCase.execute({ id: '' })).rejects.toThrow(NotFoundError);
      expect(artistRepository.findById).not.toHaveBeenCalled();
    });

    it('debería lanzar NotFoundError si el ID es solo espacios', async () => {
      // Act & Assert
      await expect(useCase.execute({ id: '   ' })).rejects.toThrow(
        NotFoundError,
      );
      expect(artistRepository.findById).not.toHaveBeenCalled();
    });

    it('debería manejar artistas sin campos opcionales', async () => {
      // Arrange
      const minimalArtist = Artist.reconstruct({
        id: 'artist-2',
        name: 'Unknown Artist',
        albumCount: 0,
        songCount: 0,
        playCount: 0,
        mbzArtistId: undefined,
        biography: undefined,
        smallImageUrl: undefined,
        mediumImageUrl: undefined,
        largeImageUrl: undefined,
        externalUrl: undefined,
        externalInfoUpdatedAt: undefined,
        orderArtistName: undefined,
        size: Number(0),
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      });

      (artistRepository.findById as jest.Mock).mockResolvedValue(minimalArtist);

      // Act
      const result = await useCase.execute({ id: 'artist-2' });

      // Assert
      expect(result.mbzArtistId).toBeUndefined();
      expect(result.biography).toBeUndefined();
      expect(result.smallImageUrl).toBeUndefined();
      expect(result.externalUrl).toBeUndefined();
    });

    it('debería retornar artista con todos los campos completos', async () => {
      // Arrange
      (artistRepository.findById as jest.Mock).mockResolvedValue(mockArtist);

      // Act
      const result = await useCase.execute({ id: 'artist-1' });

      // Assert
      expect(result.name).toBe('The Beatles');
      expect(result.albumCount).toBe(13);
      expect(result.songCount).toBe(213);
      expect(result.biography).toBe('The Beatles were an English rock band...');
      expect(result.orderArtistName).toBe('Beatles, The');
    });
  });
});
