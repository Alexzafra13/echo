import { Test, TestingModule } from '@nestjs/testing';
import { GetShuffledTracksUseCase } from './get-shuffled-tracks.use-case';
import { TRACK_REPOSITORY, ITrackRepository } from '../../ports/track-repository.port';
import { Track } from '../../entities/track.entity';

describe('GetShuffledTracksUseCase', () => {
  let useCase: GetShuffledTracksUseCase;
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
        GetShuffledTracksUseCase,
        {
          provide: TRACK_REPOSITORY,
          useValue: mockTrackRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetShuffledTracksUseCase>(GetShuffledTracksUseCase);
    trackRepository = module.get(TRACK_REPOSITORY);
  });

  describe('execute', () => {
    it('debería retornar tracks aleatorios con valores por defecto', async () => {
      // Arrange
      (trackRepository.findShuffledPaginated as jest.Mock).mockResolvedValue(mockTracks);
      (trackRepository.count as jest.Mock).mockResolvedValue(100);

      // Act
      const result = await useCase.execute({});

      // Assert
      expect(trackRepository.findShuffledPaginated).toHaveBeenCalledWith(
        expect.any(Number), // seed generado
        0, // skip por defecto
        50, // take por defecto
      );
      expect(trackRepository.count).toHaveBeenCalled();
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(100);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(50);
      expect(result.hasMore).toBe(true);
      expect(result.seed).toBeDefined();
      expect(result.seed).toBeGreaterThanOrEqual(0);
      expect(result.seed).toBeLessThanOrEqual(1);
    });

    it('debería usar el seed proporcionado para orden determinístico', async () => {
      // Arrange
      const seed = 0.123456789;
      (trackRepository.findShuffledPaginated as jest.Mock).mockResolvedValue(mockTracks);
      (trackRepository.count as jest.Mock).mockResolvedValue(100);

      // Act
      const result = await useCase.execute({ seed });

      // Assert
      expect(trackRepository.findShuffledPaginated).toHaveBeenCalledWith(seed, 0, 50);
      expect(result.seed).toBe(seed);
    });

    it('debería aplicar paginación correctamente', async () => {
      // Arrange
      const seed = 0.5;
      (trackRepository.findShuffledPaginated as jest.Mock).mockResolvedValue([mockTracks[1]]);
      (trackRepository.count as jest.Mock).mockResolvedValue(100);

      // Act
      const result = await useCase.execute({ seed, skip: 20, take: 30 });

      // Assert
      expect(trackRepository.findShuffledPaginated).toHaveBeenCalledWith(seed, 20, 30);
      expect(result.skip).toBe(20);
      expect(result.take).toBe(30);
    });

    it('debería limitar take a máximo 100', async () => {
      // Arrange
      (trackRepository.findShuffledPaginated as jest.Mock).mockResolvedValue(mockTracks);
      (trackRepository.count as jest.Mock).mockResolvedValue(200);

      // Act
      const result = await useCase.execute({ take: 150 });

      // Assert
      expect(trackRepository.findShuffledPaginated).toHaveBeenCalledWith(
        expect.any(Number),
        0,
        100, // Máximo 100
      );
      expect(result.take).toBe(100);
    });

    it('debería convertir skip negativo a 0', async () => {
      // Arrange
      (trackRepository.findShuffledPaginated as jest.Mock).mockResolvedValue(mockTracks);
      (trackRepository.count as jest.Mock).mockResolvedValue(100);

      // Act
      const result = await useCase.execute({ skip: -10 });

      // Assert
      expect(trackRepository.findShuffledPaginated).toHaveBeenCalledWith(
        expect.any(Number),
        0, // Convertido a 0
        50,
      );
      expect(result.skip).toBe(0);
    });

    it('debería convertir take menor a 1 a 1', async () => {
      // Arrange
      (trackRepository.findShuffledPaginated as jest.Mock).mockResolvedValue([mockTracks[0]]);
      (trackRepository.count as jest.Mock).mockResolvedValue(100);

      // Act
      const result = await useCase.execute({ take: 0 });

      // Assert
      expect(trackRepository.findShuffledPaginated).toHaveBeenCalledWith(
        expect.any(Number),
        0,
        1, // Mínimo 1
      );
      expect(result.take).toBe(1);
    });

    it('debería establecer hasMore en false cuando no hay más tracks', async () => {
      // Arrange
      (trackRepository.findShuffledPaginated as jest.Mock).mockResolvedValue(mockTracks);
      (trackRepository.count as jest.Mock).mockResolvedValue(52);

      // Act
      const result = await useCase.execute({ skip: 50, take: 50 });

      // Assert
      expect(result.hasMore).toBe(false); // 50 + 2 (tracks retornados) >= 52
    });

    it('debería establecer hasMore en true cuando hay más tracks', async () => {
      // Arrange
      (trackRepository.findShuffledPaginated as jest.Mock).mockResolvedValue(mockTracks);
      (trackRepository.count as jest.Mock).mockResolvedValue(100);

      // Act
      const result = await useCase.execute({ skip: 0, take: 50 });

      // Assert
      expect(result.hasMore).toBe(true); // 0 + 2 < 100
    });

    it('debería manejar resultado vacío', async () => {
      // Arrange
      (trackRepository.findShuffledPaginated as jest.Mock).mockResolvedValue([]);
      (trackRepository.count as jest.Mock).mockResolvedValue(0);

      // Act
      const result = await useCase.execute({});

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
        albumName: 'Complete Album',
        artistName: 'Complete Artist',
        albumArtistName: 'Complete Album Artist',
        compilation: true,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
      });

      (trackRepository.findShuffledPaginated as jest.Mock).mockResolvedValue([trackWithAllFields]);
      (trackRepository.count as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await useCase.execute({});

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
      expect(mappedTrack.albumName).toBe('Complete Album');
      expect(mappedTrack.artistName).toBe('Complete Artist');
      expect(mappedTrack.albumArtistName).toBe('Complete Album Artist');
      expect(mappedTrack.compilation).toBe(true);
    });

    it('debería permitir paginación con el mismo seed para continuar la secuencia', async () => {
      // Arrange
      const seed = 0.42;
      (trackRepository.findShuffledPaginated as jest.Mock)
        .mockResolvedValueOnce([mockTracks[0]])
        .mockResolvedValueOnce([mockTracks[1]]);
      (trackRepository.count as jest.Mock).mockResolvedValue(100);

      // Act - Simular dos peticiones paginadas con el mismo seed
      const page1 = await useCase.execute({ seed, skip: 0, take: 1 });
      const page2 = await useCase.execute({ seed, skip: 1, take: 1 });

      // Assert
      expect(trackRepository.findShuffledPaginated).toHaveBeenNthCalledWith(1, seed, 0, 1);
      expect(trackRepository.findShuffledPaginated).toHaveBeenNthCalledWith(2, seed, 1, 1);
      expect(page1.seed).toBe(seed);
      expect(page2.seed).toBe(seed);
      expect(page1.data[0].id).not.toBe(page2.data[0].id);
    });

    it('debería ejecutar findShuffledPaginated y count en paralelo', async () => {
      // Arrange
      let findShuffledStarted = false;
      let countStartedWhileFindRunning = false;

      (trackRepository.findShuffledPaginated as jest.Mock).mockImplementation(async () => {
        findShuffledStarted = true;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return mockTracks;
      });

      (trackRepository.count as jest.Mock).mockImplementation(async () => {
        if (findShuffledStarted) {
          countStartedWhileFindRunning = true;
        }
        return 100;
      });

      // Act
      await useCase.execute({});

      // Assert - count debería haber empezado mientras findShuffledPaginated estaba corriendo
      expect(countStartedWhileFindRunning).toBe(true);
    });
  });
});
