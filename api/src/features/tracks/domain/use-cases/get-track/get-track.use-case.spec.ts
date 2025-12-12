import { Test, TestingModule } from '@nestjs/testing';
import { GetTrackUseCase } from './get-track.use-case';
import { TRACK_REPOSITORY, ITrackRepository } from '../../ports/track-repository.port';
import { Track } from '../../entities/track.entity';
import { NotFoundError } from '@shared/errors';

describe('GetTrackUseCase', () => {
  let useCase: GetTrackUseCase;
  let trackRepository: jest.Mocked<ITrackRepository>;

  const mockTrack = Track.reconstruct({
    id: 'track-1',
    title: 'Come Together',
    albumId: 'album-1',
    artistId: 'artist-1',
    albumArtistId: 'artist-1',
    trackNumber: 1,
    discNumber: 1,
    year: 1969,
    duration: 259, // 4:19
    path: '/music/beatles/abbey-road/01-come-together.mp3',
    bitRate: 320000,
    size: Number(10485760), // ~10 MB
    suffix: 'mp3',
    lyrics: 'Come together, right now...',
    comment: 'Opening track',
    albumName: 'Abbey Road',
    artistName: 'The Beatles',
    albumArtistName: 'The Beatles',
    compilation: false,
    playCount: 0,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  });

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
        GetTrackUseCase,
        {
          provide: TRACK_REPOSITORY,
          useValue: mockTrackRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetTrackUseCase>(GetTrackUseCase);
    trackRepository = module.get(TRACK_REPOSITORY);
  });

  describe('execute', () => {
    it('debería retornar un track por su ID', async () => {
      // Arrange
      (trackRepository.findById as jest.Mock).mockResolvedValue(mockTrack);

      // Act
      const result = await useCase.execute({ id: 'track-1' });

      // Assert
      expect(trackRepository.findById).toHaveBeenCalledWith('track-1');
      expect(result).toEqual({
        id: 'track-1',
        title: 'Come Together',
        albumId: 'album-1',
        artistId: 'artist-1',
        albumArtistId: 'artist-1',
        trackNumber: 1,
        discNumber: 1,
        year: 1969,
        duration: 259,
        path: '/music/beatles/abbey-road/01-come-together.mp3',
        bitRate: 320000,
        size: Number(10485760),
        suffix: 'mp3',
        lyrics: 'Come together, right now...',
        comment: 'Opening track',
        albumName: 'Abbey Road',
        artistName: 'The Beatles',
        albumArtistName: 'The Beatles',
        compilation: false,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      });
    });

    it('debería lanzar NotFoundError si el track no existe', async () => {
      // Arrange
      (trackRepository.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute({ id: 'nonexistent-id' })).rejects.toThrow(
        NotFoundError,
      );
      expect(trackRepository.findById).toHaveBeenCalledWith('nonexistent-id');
    });

    it('debería lanzar NotFoundError si el ID está vacío', async () => {
      // Act & Assert
      await expect(useCase.execute({ id: '' })).rejects.toThrow(NotFoundError);
      expect(trackRepository.findById).not.toHaveBeenCalled();
    });

    it('debería lanzar NotFoundError si el ID es solo espacios', async () => {
      // Act & Assert
      await expect(useCase.execute({ id: '   ' })).rejects.toThrow(
        NotFoundError,
      );
      expect(trackRepository.findById).not.toHaveBeenCalled();
    });

    it('debería manejar tracks sin campos opcionales', async () => {
      // Arrange
      const minimalTrack = Track.reconstruct({
        id: 'track-2',
        title: 'Unknown Track',
        albumId: undefined,
        artistId: undefined,
        albumArtistId: undefined,
        trackNumber: undefined,
        discNumber: 1,
        year: undefined,
        duration: undefined,
        path: '/music/unknown.mp3',
        bitRate: undefined,
        size: undefined,
        suffix: undefined,
        lyrics: undefined,
        comment: undefined,
        albumName: undefined,
        artistName: undefined,
        albumArtistName: undefined,
        compilation: false,
        playCount: 0,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      });

      (trackRepository.findById as jest.Mock).mockResolvedValue(minimalTrack);

      // Act
      const result = await useCase.execute({ id: 'track-2' });

      // Assert
      expect(result.albumId).toBeUndefined();
      expect(result.artistId).toBeUndefined();
      expect(result.trackNumber).toBeUndefined();
      expect(result.year).toBeUndefined();
      expect(result.lyrics).toBeUndefined();
    });

    it('debería manejar tracks de compilación', async () => {
      // Arrange
      const compilationTrack = Track.reconstruct({
        id: 'track-3',
        title: 'Greatest Hit #1',
        albumId: 'compilation-album-1',
        compilation: true,
        playCount: 0,
        discNumber: 1,
        path: '/music/compilations/hit1.mp3',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      });

      (trackRepository.findById as jest.Mock).mockResolvedValue(
        compilationTrack,
      );

      // Act
      const result = await useCase.execute({ id: 'track-3' });

      // Assert
      expect(result.compilation).toBe(true);
      expect(result.title).toBe('Greatest Hit #1');
    });
  });
});
