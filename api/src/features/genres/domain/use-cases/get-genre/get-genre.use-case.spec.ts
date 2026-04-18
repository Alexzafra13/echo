import { GetGenreUseCase } from './get-genre.use-case';
import { IGenreRepository } from '../../ports/genre-repository.port';
import { Genre } from '../../entities/genre.entity';
import { NotFoundError } from '@shared/errors';

describe('GetGenreUseCase', () => {
  let useCase: GetGenreUseCase;
  let mockRepo: jest.Mocked<IGenreRepository>;

  const mockGenre = Genre.reconstruct({
    id: 'genre-1',
    name: 'Hip-Hop',
    trackCount: 120,
    albumCount: 10,
    artistCount: 5,
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
    useCase = new GetGenreUseCase(mockRepo);
  });

  it('returns genre when found', async () => {
    mockRepo.findById.mockResolvedValue(mockGenre);

    const result = await useCase.execute({ id: 'genre-1' });

    expect(result.id).toBe('genre-1');
    expect(result.name).toBe('Hip-Hop');
    expect(mockRepo.findById).toHaveBeenCalledWith('genre-1');
  });

  it('throws NotFoundError when genre does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute({ id: 'missing' })).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError for empty id', async () => {
    await expect(useCase.execute({ id: '' })).rejects.toThrow(NotFoundError);
    expect(mockRepo.findById).not.toHaveBeenCalled();
  });

  it('throws NotFoundError for whitespace-only id', async () => {
    await expect(useCase.execute({ id: '   ' })).rejects.toThrow(NotFoundError);
    expect(mockRepo.findById).not.toHaveBeenCalled();
  });
});
