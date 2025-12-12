import { Test, TestingModule } from '@nestjs/testing';
import { SearchTracksUseCase } from './search-tracks.use-case';
import { TRACK_REPOSITORY, ITrackRepository } from '../../ports/track-repository.port';
import { Track } from '../../entities/track.entity';
import { ValidationError } from '@shared/errors';

describe('SearchTracksUseCase', () => {
  let useCase: SearchTracksUseCase;
  let trackRepository: jest.Mocked<ITrackRepository>;

  const mockTracks = [
    Track.reconstruct({
      id: 'track-1',
      title: 'Come Together',
      albumId: 'album-1',
      artistId: 'artist-1',
      trackNumber: 1,
      discNumber: 1,
      year: 1969,
      duration: 259,
      path: '/music/beatles/01-come-together.mp3',
      bitRate: 320000,
      size: Number(10485760),
      suffix: 'mp3',
      compilation: false,
      playCount: 0,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    }),
    Track.reconstruct({
      id: 'track-2',
      title: 'Come As You Are',
      albumId: 'album-2',
      artistId: 'artist-2',
      trackNumber: 3,
      discNumber: 1,
      year: 1991,
      duration: 219,
      path: '/music/nirvana/come-as-you-are.mp3',
      bitRate: 320000,
      size: Number(8800000),
      suffix: 'mp3',
      compilation: false,
      playCount: 0,
      createdAt: new Date('2025-01-02'),
      updatedAt: new Date('2025-01-02'),
    }),
  ];

  beforeEach(async () => {
    const mockTrackRepository: Partial<ITrackRepository> = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      findAll: jest.fn(),
      search: jest.fn(),
      findByAlbumId: jest.fn(),
      findByArtistId: jest.fn(),
      count: jest.fn(),
      findShuffledPaginated: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchTracksUseCase,
        {
          provide: TRACK_REPOSITORY,
          useValue: mockTrackRepository,
        },
      ],
    }).compile();

    useCase = module.get<SearchTracksUseCase>(SearchTracksUseCase);
    trackRepository = module.get(TRACK_REPOSITORY);
  });

  describe('execute', () => {
    it('debería buscar tracks por query', async () => {
      // Arrange
      (trackRepository.search as jest.Mock).mockResolvedValue(mockTracks);

      // Act
      const result = await useCase.execute({
        query: 'Come',
        skip: 0,
        take: 10,
      });

      // Assert
      expect(trackRepository.search).toHaveBeenCalledWith('Come', 0, 10);
      expect(result.data).toHaveLength(2);
      expect(result.query).toBe('Come');
      expect(result.total).toBe(2);
    });

    it('debería lanzar ValidationError si query está vacío', async () => {
      // Act & Assert
      await expect(
        useCase.execute({ query: '', skip: 0, take: 10 }),
      ).rejects.toThrow(ValidationError);
      expect(trackRepository.search).not.toHaveBeenCalled();
    });

    it('debería lanzar ValidationError si query es solo espacios', async () => {
      // Act & Assert
      await expect(
        useCase.execute({ query: '   ', skip: 0, take: 10 }),
      ).rejects.toThrow(ValidationError);
      expect(trackRepository.search).not.toHaveBeenCalled();
    });

    it('debería lanzar ValidationError si query tiene menos de 2 caracteres', async () => {
      // Act & Assert
      await expect(
        useCase.execute({ query: 'a', skip: 0, take: 10 }),
      ).rejects.toThrow(ValidationError);
      expect(trackRepository.search).not.toHaveBeenCalled();
    });

    it('debería limpiar espacios del query antes de buscar', async () => {
      // Arrange
      (trackRepository.search as jest.Mock).mockResolvedValue(mockTracks);

      // Act
      const result = await useCase.execute({
        query: '  Come  ',
        skip: 0,
        take: 10,
      });

      // Assert
      expect(trackRepository.search).toHaveBeenCalledWith('Come', 0, 10);
      expect(result.query).toBe('Come');
    });

    it('debería limitar take a máximo 100', async () => {
      // Arrange
      (trackRepository.search as jest.Mock).mockResolvedValue(mockTracks);

      // Act
      const result = await useCase.execute({
        query: 'Come',
        skip: 0,
        take: 150,
      });

      // Assert
      expect(trackRepository.search).toHaveBeenCalledWith('Come', 0, 100);
      expect(result.take).toBe(100);
    });

    it('debería convertir skip negativo a 0', async () => {
      // Arrange
      (trackRepository.search as jest.Mock).mockResolvedValue(mockTracks);

      // Act
      const result = await useCase.execute({
        query: 'Come',
        skip: -10,
        take: 10,
      });

      // Assert
      expect(trackRepository.search).toHaveBeenCalledWith('Come', 0, 10);
      expect(result.skip).toBe(0);
    });

    it('debería convertir take menor a 1 a 1', async () => {
      // Arrange
      (trackRepository.search as jest.Mock).mockResolvedValue([mockTracks[0]]);

      // Act
      const result = await useCase.execute({
        query: 'Come',
        skip: 0,
        take: 0,
      });

      // Assert
      expect(trackRepository.search).toHaveBeenCalledWith('Come', 0, 1);
      expect(result.take).toBe(1);
    });

    it('debería establecer hasMore correctamente', async () => {
      // Arrange
      // Mock debe respetar el 'take' y retornar solo 1 track
      (trackRepository.search as jest.Mock).mockResolvedValue([mockTracks[0]]);

      // Act
      const result = await useCase.execute({
        query: 'Come',
        skip: 0,
        take: 1,
      });

      // Assert
      expect(result.hasMore).toBe(true); // tracks.length === take
    });

    it('debería establecer hasMore en false cuando no hay más resultados', async () => {
      // Arrange
      (trackRepository.search as jest.Mock).mockResolvedValue(mockTracks);

      // Act
      const result = await useCase.execute({
        query: 'Come',
        skip: 0,
        take: 10,
      });

      // Assert
      expect(result.hasMore).toBe(false); // tracks.length < take
    });

    it('debería manejar resultado vacío', async () => {
      // Arrange
      (trackRepository.search as jest.Mock).mockResolvedValue([]);

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

    it('debería mapear correctamente todos los campos de los tracks', async () => {
      // Arrange
      const trackWithAllFields = Track.reconstruct({
        id: 'track-full',
        title: 'Search Result Track',
        albumId: 'album-1',
        artistId: 'artist-1',
        albumArtistId: 'artist-1',
        trackNumber: 5,
        discNumber: 2,
        year: 2020,
        duration: 300,
        path: '/music/search.mp3',
        bitRate: 320000,
        size: Number(12000000),
        suffix: 'mp3',
        lyrics: 'These are the lyrics...',
        comment: 'A searchable track',
        albumName: 'Search Album',
        artistName: 'Search Artist',
        albumArtistName: 'Search Album Artist',
        compilation: true,
        playCount: 0,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
      });

      (trackRepository.search as jest.Mock).mockResolvedValue([
        trackWithAllFields,
      ]);

      // Act
      const result = await useCase.execute({
        query: 'Search',
        skip: 0,
        take: 10,
      });

      // Assert
      const mappedTrack = result.data[0];
      expect(mappedTrack.id).toBe('track-full');
      expect(mappedTrack.title).toBe('Search Result Track');
      expect(mappedTrack.albumId).toBe('album-1');
      expect(mappedTrack.artistId).toBe('artist-1');
      expect(mappedTrack.albumArtistId).toBe('artist-1');
      expect(mappedTrack.trackNumber).toBe(5);
      expect(mappedTrack.discNumber).toBe(2);
      expect(mappedTrack.year).toBe(2020);
      expect(mappedTrack.duration).toBe(300);
      expect(mappedTrack.path).toBe('/music/search.mp3');
      expect(mappedTrack.bitRate).toBe(320000);
      expect(mappedTrack.size).toEqual(Number(12000000));
      expect(mappedTrack.suffix).toBe('mp3');
      expect(mappedTrack.lyrics).toBe('These are the lyrics...');
      expect(mappedTrack.comment).toBe('A searchable track');
      expect(mappedTrack.albumName).toBe('Search Album');
      expect(mappedTrack.artistName).toBe('Search Artist');
      expect(mappedTrack.albumArtistName).toBe('Search Album Artist');
      expect(mappedTrack.compilation).toBe(true);
    });

    it('debería aceptar query con exactamente 2 caracteres', async () => {
      // Arrange
      (trackRepository.search as jest.Mock).mockResolvedValue([]);

      // Act
      await useCase.execute({ query: 'ab', skip: 0, take: 10 });

      // Assert
      expect(trackRepository.search).toHaveBeenCalledWith('ab', 0, 10);
    });

    it('debería manejar queries con caracteres especiales', async () => {
      // Arrange
      (trackRepository.search as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await useCase.execute({
        query: 'AC/DC',
        skip: 0,
        take: 10,
      });

      // Assert
      expect(trackRepository.search).toHaveBeenCalledWith('AC/DC', 0, 10);
      expect(result.query).toBe('AC/DC');
    });
  });
});
