import { Test, TestingModule } from '@nestjs/testing';
import { GetShuffledTracksUseCase } from './get-shuffled-tracks.use-case';
import { TRACK_REPOSITORY, ITrackRepository } from '../../ports/track-repository.port';
import { Track } from '../../entities/track.entity';

describe('GetShuffledTracksUseCase', () => {
  let useCase: GetShuffledTracksUseCase;
  let trackRepository: jest.Mocked<ITrackRepository>;

  const mockTrack = Track.reconstruct({
    id: 'track-1',
    title: 'Test Track',
    discNumber: 1,
    path: '/music/test.mp3',
    compilation: false,
    playCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetShuffledTracksUseCase,
        {
          provide: TRACK_REPOSITORY,
          useValue: {
            findShuffledPaginated: jest.fn(),
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<GetShuffledTracksUseCase>(GetShuffledTracksUseCase);
    trackRepository = module.get(TRACK_REPOSITORY);
  });

  it('should return tracks with pagination metadata', async () => {
    trackRepository.findShuffledPaginated.mockResolvedValue([mockTrack]);
    trackRepository.count.mockResolvedValue(100);

    const result = await useCase.execute({});

    expect(trackRepository.findShuffledPaginated).toHaveBeenCalledWith(expect.any(Number), 0, 50);
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(100);
    expect(result.hasMore).toBe(true);
    expect(result.seed).toBeGreaterThanOrEqual(0);
  });

  it('should use provided seed for deterministic ordering', async () => {
    trackRepository.findShuffledPaginated.mockResolvedValue([mockTrack]);
    trackRepository.count.mockResolvedValue(100);

    const result = await useCase.execute({ seed: 0.5, skip: 10, take: 20 });

    expect(trackRepository.findShuffledPaginated).toHaveBeenCalledWith(0.5, 10, 20);
    expect(result.seed).toBe(0.5);
    expect(result.skip).toBe(10);
    expect(result.take).toBe(20);
  });

  it('should enforce take limits (1-100)', async () => {
    trackRepository.findShuffledPaginated.mockResolvedValue([]);
    trackRepository.count.mockResolvedValue(0);

    await useCase.execute({ take: 150 });
    expect(trackRepository.findShuffledPaginated).toHaveBeenCalledWith(expect.any(Number), 0, 100);

    await useCase.execute({ take: 0 });
    expect(trackRepository.findShuffledPaginated).toHaveBeenCalledWith(expect.any(Number), 0, 1);
  });

  it('should convert negative skip to 0', async () => {
    trackRepository.findShuffledPaginated.mockResolvedValue([]);
    trackRepository.count.mockResolvedValue(0);

    const result = await useCase.execute({ skip: -10 });

    expect(trackRepository.findShuffledPaginated).toHaveBeenCalledWith(expect.any(Number), 0, 50);
    expect(result.skip).toBe(0);
  });

  it('should set hasMore based on remaining tracks', async () => {
    trackRepository.findShuffledPaginated.mockResolvedValue([mockTrack, mockTrack]);
    trackRepository.count.mockResolvedValue(52);

    const result = await useCase.execute({ skip: 50 });

    expect(result.hasMore).toBe(false); // 50 + 2 >= 52
  });

  it('should handle empty results', async () => {
    trackRepository.findShuffledPaginated.mockResolvedValue([]);
    trackRepository.count.mockResolvedValue(0);

    const result = await useCase.execute({});

    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.hasMore).toBe(false);
  });

  it('should map track fields correctly', async () => {
    const fullTrack = Track.reconstruct({
      id: 'track-full',
      title: 'Full Track',
      albumId: 'album-1',
      artistId: 'artist-1',
      artistName: 'Artist Name',
      albumName: 'Album Name',
      discNumber: 2,
      trackNumber: 5,
      duration: 300,
      path: '/music/full.mp3',
      compilation: true,
      playCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    trackRepository.findShuffledPaginated.mockResolvedValue([fullTrack]);
    trackRepository.count.mockResolvedValue(1);

    const result = await useCase.execute({});

    expect(result.data[0]).toMatchObject({
      id: 'track-full',
      title: 'Full Track',
      albumId: 'album-1',
      artistName: 'Artist Name',
      compilation: true,
    });
  });

  it('should allow pagination with same seed for consistent sequence', async () => {
    const seed = 0.42;
    trackRepository.findShuffledPaginated.mockResolvedValue([mockTrack]);
    trackRepository.count.mockResolvedValue(100);

    const page1 = await useCase.execute({ seed, skip: 0, take: 10 });
    const page2 = await useCase.execute({ seed, skip: 10, take: 10 });

    // Both pages should use the same seed
    expect(page1.seed).toBe(seed);
    expect(page2.seed).toBe(seed);
    // Repository should be called with correct pagination
    expect(trackRepository.findShuffledPaginated).toHaveBeenNthCalledWith(1, seed, 0, 10);
    expect(trackRepository.findShuffledPaginated).toHaveBeenNthCalledWith(2, seed, 10, 10);
  });
});
