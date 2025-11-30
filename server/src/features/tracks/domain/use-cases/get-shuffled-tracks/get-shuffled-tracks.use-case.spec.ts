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
});
