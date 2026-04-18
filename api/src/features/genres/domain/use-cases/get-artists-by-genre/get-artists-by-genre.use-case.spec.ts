import { GetArtistsByGenreUseCase } from './get-artists-by-genre.use-case';
import { IGenreRepository } from '../../ports/genre-repository.port';
import { Genre } from '../../entities/genre.entity';
import { Artist } from '@features/artists/domain/entities/artist.entity';
import { NotFoundError } from '@shared/errors';

describe('GetArtistsByGenreUseCase', () => {
  let useCase: GetArtistsByGenreUseCase;
  let mockRepo: jest.Mocked<IGenreRepository>;

  const mockGenre = Genre.reconstruct({
    id: 'genre-1',
    name: 'Electronic',
    trackCount: 80,
    albumCount: 8,
    artistCount: 4,
  });

  const mockArtist = Artist.reconstruct({
    id: 'artist-1',
    name: 'Aphex Twin',
    albumCount: 12,
    songCount: 140,
    size: 2000000000,
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
    useCase = new GetArtistsByGenreUseCase(mockRepo);
  });

  it('returns paginated artists for a genre', async () => {
    mockRepo.findById.mockResolvedValue(mockGenre);
    mockRepo.findArtistsByGenre.mockResolvedValue({ data: [mockArtist], total: 1 });

    const result = await useCase.execute({
      genreId: 'genre-1',
      skip: 0,
      take: 20,
      sort: 'name',
      order: 'asc',
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
        sort: 'name',
        order: 'asc',
      })
    ).rejects.toThrow(NotFoundError);
  });

  it('computes hasMore when more pages remain', async () => {
    mockRepo.findById.mockResolvedValue(mockGenre);
    mockRepo.findArtistsByGenre.mockResolvedValue({ data: [mockArtist], total: 100 });

    const result = await useCase.execute({
      genreId: 'genre-1',
      skip: 0,
      take: 1,
      sort: 'songCount',
      order: 'desc',
    });

    expect(result.hasMore).toBe(true);
  });
});
