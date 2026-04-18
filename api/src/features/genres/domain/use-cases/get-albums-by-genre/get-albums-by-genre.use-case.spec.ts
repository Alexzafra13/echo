import { GetAlbumsByGenreUseCase } from './get-albums-by-genre.use-case';
import { IGenreRepository } from '../../ports/genre-repository.port';
import { Genre } from '../../entities/genre.entity';
import { Album } from '@features/albums/domain/entities/album.entity';
import { NotFoundError } from '@shared/errors';

describe('GetAlbumsByGenreUseCase', () => {
  let useCase: GetAlbumsByGenreUseCase;
  let mockRepo: jest.Mocked<IGenreRepository>;

  const mockGenre = Genre.reconstruct({
    id: 'genre-1',
    name: 'Rock',
    trackCount: 50,
    albumCount: 5,
    artistCount: 3,
  });

  const mockAlbum = Album.reconstruct({
    id: 'album-1',
    name: 'OK Computer',
    compilation: false,
    songCount: 12,
    duration: 3200,
    size: 100000000,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
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
    useCase = new GetAlbumsByGenreUseCase(mockRepo);
  });

  it('returns paginated albums for a genre', async () => {
    mockRepo.findById.mockResolvedValue(mockGenre);
    mockRepo.findAlbumsByGenre.mockResolvedValue({ data: [mockAlbum], total: 1 });

    const result = await useCase.execute({
      genreId: 'genre-1',
      skip: 0,
      take: 20,
      sort: 'releaseYear',
      order: 'desc',
    });

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.hasMore).toBe(false);
    expect(mockRepo.findAlbumsByGenre).toHaveBeenCalledWith({
      genreId: 'genre-1',
      skip: 0,
      take: 20,
      sort: 'releaseYear',
      order: 'desc',
    });
  });

  it('throws NotFoundError when genre does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        genreId: 'missing',
        skip: 0,
        take: 20,
        sort: 'releaseYear',
        order: 'desc',
      })
    ).rejects.toThrow(NotFoundError);
    expect(mockRepo.findAlbumsByGenre).not.toHaveBeenCalled();
  });

  it('clamps skip and take', async () => {
    mockRepo.findById.mockResolvedValue(mockGenre);
    mockRepo.findAlbumsByGenre.mockResolvedValue({ data: [], total: 0 });

    const result = await useCase.execute({
      genreId: 'genre-1',
      skip: -10,
      take: 500,
      sort: 'title',
      order: 'asc',
    });

    expect(result.skip).toBe(0);
    expect(result.take).toBe(100);
  });

  it('computes hasMore correctly', async () => {
    mockRepo.findById.mockResolvedValue(mockGenre);
    mockRepo.findAlbumsByGenre.mockResolvedValue({ data: [mockAlbum], total: 50 });

    const result = await useCase.execute({
      genreId: 'genre-1',
      skip: 0,
      take: 1,
      sort: 'playCount',
      order: 'desc',
    });

    expect(result.hasMore).toBe(true);
  });
});
