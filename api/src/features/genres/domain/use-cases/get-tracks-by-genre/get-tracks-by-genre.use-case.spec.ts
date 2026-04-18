import { GetTracksByGenreUseCase } from './get-tracks-by-genre.use-case';
import { IGenreRepository } from '../../ports/genre-repository.port';
import { Genre } from '../../entities/genre.entity';
import { Track } from '@features/tracks/domain/entities/track.entity';
import { NotFoundError } from '@shared/errors';

describe('GetTracksByGenreUseCase', () => {
  let useCase: GetTracksByGenreUseCase;
  let mockRepo: jest.Mocked<IGenreRepository>;

  const mockGenre = Genre.reconstruct({
    id: 'genre-1',
    name: 'Jazz',
    trackCount: 200,
    albumCount: 20,
    artistCount: 15,
  });

  const mockTrack = Track.reconstruct({
    id: 'track-1',
    title: 'So What',
    discNumber: 1,
    path: '/music/so-what.flac',
    compilation: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    mockRepo = {
      list: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      findAlbumsByGenre: jest.fn(),
      findTracksByGenre: jest.fn(),
      findArtistsByGenre: jest.fn(),
    };
    useCase = new GetTracksByGenreUseCase(mockRepo);
  });

  it('returns paginated tracks for a genre', async () => {
    mockRepo.findById.mockResolvedValue(mockGenre);
    mockRepo.findTracksByGenre.mockResolvedValue({ data: [mockTrack], total: 1 });

    const result = await useCase.execute({
      genreId: 'genre-1',
      skip: 0,
      take: 20,
      sort: 'playCount',
      order: 'desc',
    });

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.hasMore).toBe(false);
  });

  it('throws NotFoundError when genre does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        genreId: 'missing',
        skip: 0,
        take: 20,
        sort: 'playCount',
        order: 'desc',
      })
    ).rejects.toThrow(NotFoundError);
    expect(mockRepo.findTracksByGenre).not.toHaveBeenCalled();
  });

  it('clamps pagination bounds', async () => {
    mockRepo.findById.mockResolvedValue(mockGenre);
    mockRepo.findTracksByGenre.mockResolvedValue({ data: [], total: 0 });

    const result = await useCase.execute({
      genreId: 'genre-1',
      skip: -5,
      take: 9999,
      sort: 'title',
      order: 'asc',
    });

    expect(result.skip).toBe(0);
    expect(result.take).toBe(100);
  });
});
