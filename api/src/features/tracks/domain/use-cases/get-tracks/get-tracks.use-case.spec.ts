import { Test, TestingModule } from '@nestjs/testing';
import { GetTracksUseCase } from './get-tracks.use-case';
import { TRACK_REPOSITORY, ITrackRepository } from '../../ports/track-repository.port';
import { Track } from '../../entities/track.entity';

describe('GetTracksUseCase', () => {
  let useCase: GetTracksUseCase;
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
      title: 'Something',
      albumId: 'album-1',
      artistId: 'artist-1',
      trackNumber: 2,
      discNumber: 1,
      year: 1969,
      duration: 182,
      path: '/music/beatles/02-something.mp3',
      bitRate: 320000,
      size: Number(7340032),
      suffix: 'mp3',
      compilation: false,
      playCount: 0,
      createdAt: new Date('2025-01-02'),
      updatedAt: new Date('2025-01-02'),
    }),
    Track.reconstruct({
      id: 'track-3',
      title: 'Here Comes the Sun',
      albumId: 'album-1',
      artistId: 'artist-1',
      trackNumber: 3,
      discNumber: 1,
      year: 1969,
      duration: 185,
      path: '/music/beatles/03-here-comes-the-sun.mp3',
      bitRate: 320000,
      size: Number(7464960),
      suffix: 'mp3',
      compilation: false,
      playCount: 0,
      createdAt: new Date('2025-01-03'),
      updatedAt: new Date('2025-01-03'),
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
        GetTracksUseCase,
        {
          provide: TRACK_REPOSITORY,
          useValue: mockTrackRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetTracksUseCase>(GetTracksUseCase);
    trackRepository = module.get(TRACK_REPOSITORY);
  });

  describe('execute', () => {
    it('debería retornar lista paginada con valores por defecto', async () => {
      // Arrange
      (trackRepository.findAll as jest.Mock).mockResolvedValue(mockTracks);
      (trackRepository.count as jest.Mock).mockResolvedValue(50);

      // Act
      const result = await useCase.execute({ skip: 0, take: 10 });

      // Assert
      expect(trackRepository.findAll).toHaveBeenCalledWith(0, 10);
      expect(trackRepository.count).toHaveBeenCalled();
      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(50);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(10);
      expect(result.hasMore).toBe(true); // 0 + 10 < 50
    });

    it('debería aplicar paginación correctamente', async () => {
      // Arrange
      (trackRepository.findAll as jest.Mock).mockResolvedValue([mockTracks[2]]);
      (trackRepository.count as jest.Mock).mockResolvedValue(50);

      // Act
      const result = await useCase.execute({ skip: 20, take: 5 });

      // Assert
      expect(trackRepository.findAll).toHaveBeenCalledWith(20, 5);
      expect(result.skip).toBe(20);
      expect(result.take).toBe(5);
      expect(result.hasMore).toBe(true); // 20 + 5 < 50
    });

    it('debería limitar take a máximo 100', async () => {
      // Arrange
      (trackRepository.findAll as jest.Mock).mockResolvedValue(mockTracks);
      (trackRepository.count as jest.Mock).mockResolvedValue(200);

      // Act
      const result = await useCase.execute({ skip: 0, take: 150 });

      // Assert
      expect(trackRepository.findAll).toHaveBeenCalledWith(0, 100); // Máximo 100
      expect(result.take).toBe(100);
    });

    it('debería establecer hasMore en false cuando no hay más resultados', async () => {
      // Arrange
      (trackRepository.findAll as jest.Mock).mockResolvedValue(mockTracks);
      (trackRepository.count as jest.Mock).mockResolvedValue(25);

      // Act
      const result = await useCase.execute({ skip: 20, take: 10 });

      // Assert
      expect(result.hasMore).toBe(false); // 20 + 10 >= 25
    });

    it('debería convertir skip negativo a 0', async () => {
      // Arrange
      (trackRepository.findAll as jest.Mock).mockResolvedValue(mockTracks);
      (trackRepository.count as jest.Mock).mockResolvedValue(50);

      // Act
      const result = await useCase.execute({ skip: -10, take: 10 });

      // Assert
      expect(trackRepository.findAll).toHaveBeenCalledWith(0, 10);
      expect(result.skip).toBe(0);
    });

    it('debería convertir take menor a 1 a 1', async () => {
      // Arrange
      (trackRepository.findAll as jest.Mock).mockResolvedValue([mockTracks[0]]);
      (trackRepository.count as jest.Mock).mockResolvedValue(50);

      // Act
      const result = await useCase.execute({ skip: 0, take: 0 });

      // Assert
      expect(trackRepository.findAll).toHaveBeenCalledWith(0, 1);
      expect(result.take).toBe(1);
    });

    it('debería manejar resultado vacío', async () => {
      // Arrange
      (trackRepository.findAll as jest.Mock).mockResolvedValue([]);
      (trackRepository.count as jest.Mock).mockResolvedValue(0);

      // Act
      const result = await useCase.execute({ skip: 0, take: 10 });

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('debería mapear correctamente todos los campos de los tracks', async () => {
      // Arrange
      const trackWithAllFields = Track.reconstruct({
        id: 'track-full',
        title: 'Complete Track',
        albumId: 'album-1',
        artistId: 'artist-1',
        albumArtistId: 'artist-1',
        trackNumber: 5,
        discNumber: 2,
        year: 2020,
        duration: 300,
        path: '/music/complete.mp3',
        bitRate: 320000,
        size: Number(12000000),
        suffix: 'mp3',
        lyrics: 'These are the lyrics...',
        comment: 'A complete track with all fields',
        albumName: 'Complete Album',
        artistName: 'Complete Artist',
        albumArtistName: 'Complete Album Artist',
        compilation: true,
        playCount: 0,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
      });

      (trackRepository.findAll as jest.Mock).mockResolvedValue([
        trackWithAllFields,
      ]);
      (trackRepository.count as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await useCase.execute({ skip: 0, take: 10 });

      // Assert
      const mappedTrack = result.data[0];
      expect(mappedTrack.id).toBe('track-full');
      expect(mappedTrack.title).toBe('Complete Track');
      expect(mappedTrack.albumId).toBe('album-1');
      expect(mappedTrack.artistId).toBe('artist-1');
      expect(mappedTrack.albumArtistId).toBe('artist-1');
      expect(mappedTrack.trackNumber).toBe(5);
      expect(mappedTrack.discNumber).toBe(2);
      expect(mappedTrack.year).toBe(2020);
      expect(mappedTrack.duration).toBe(300);
      expect(mappedTrack.path).toBe('/music/complete.mp3');
      expect(mappedTrack.bitRate).toBe(320000);
      expect(mappedTrack.size).toEqual(Number(12000000));
      expect(mappedTrack.suffix).toBe('mp3');
      expect(mappedTrack.lyrics).toBe('These are the lyrics...');
      expect(mappedTrack.comment).toBe('A complete track with all fields');
      expect(mappedTrack.albumName).toBe('Complete Album');
      expect(mappedTrack.artistName).toBe('Complete Artist');
      expect(mappedTrack.albumArtistName).toBe('Complete Album Artist');
      expect(mappedTrack.compilation).toBe(true);
    });

    it('debería usar valores por defecto si no se provee skip/take', async () => {
      // Arrange
      (trackRepository.findAll as jest.Mock).mockResolvedValue(mockTracks);
      (trackRepository.count as jest.Mock).mockResolvedValue(50);

      // Act
      const result = await useCase.execute({} as any);

      // Assert
      expect(trackRepository.findAll).toHaveBeenCalledWith(0, 10);
    });
  });
});
