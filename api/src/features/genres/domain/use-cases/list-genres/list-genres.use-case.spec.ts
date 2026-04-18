import { ListGenresUseCase } from './list-genres.use-case';
import { IGenreRepository } from '../../ports/genre-repository.port';
import { Genre } from '../../entities/genre.entity';

describe('ListGenresUseCase', () => {
  let useCase: ListGenresUseCase;
  let mockRepo: jest.Mocked<IGenreRepository>;

  const makeGenre = (id: string, name: string) =>
    Genre.reconstruct({ id, name, trackCount: 10, albumCount: 2, artistCount: 1 });

  beforeEach(() => {
    mockRepo = {
      list: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      findAlbumsByGenre: jest.fn(),
      findTracksByGenre: jest.fn(),
      findArtistsByGenre: jest.fn(),
    };
    useCase = new ListGenresUseCase(mockRepo);
  });

  it('returns paginated data with hasMore=true when more results exist', async () => {
    mockRepo.list.mockResolvedValue([makeGenre('1', 'Rock'), makeGenre('2', 'Pop')]);
    mockRepo.count.mockResolvedValue(10);

    const result = await useCase.execute({
      skip: 0,
      take: 2,
      sort: 'trackCount',
      order: 'desc',
    });

    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(10);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(2);
    expect(result.hasMore).toBe(true);
  });

  it('returns hasMore=false when last page', async () => {
    mockRepo.list.mockResolvedValue([makeGenre('1', 'Rock')]);
    mockRepo.count.mockResolvedValue(1);

    const result = await useCase.execute({
      skip: 0,
      take: 20,
      sort: 'name',
      order: 'asc',
    });

    expect(result.hasMore).toBe(false);
  });

  it('clamps negative skip to 0', async () => {
    mockRepo.list.mockResolvedValue([]);
    mockRepo.count.mockResolvedValue(0);

    const result = await useCase.execute({
      skip: -5,
      take: 20,
      sort: 'name',
      order: 'asc',
    });

    expect(result.skip).toBe(0);
    expect(mockRepo.list).toHaveBeenCalledWith(expect.objectContaining({ skip: 0 }));
  });

  it('clamps take above 100 to 100', async () => {
    mockRepo.list.mockResolvedValue([]);
    mockRepo.count.mockResolvedValue(0);

    const result = await useCase.execute({
      skip: 0,
      take: 500,
      sort: 'name',
      order: 'asc',
    });

    expect(result.take).toBe(100);
    expect(mockRepo.list).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
  });

  it('clamps take below 1 to 1', async () => {
    mockRepo.list.mockResolvedValue([]);
    mockRepo.count.mockResolvedValue(0);

    const result = await useCase.execute({
      skip: 0,
      take: 0,
      sort: 'name',
      order: 'asc',
    });

    expect(result.take).toBe(1);
  });

  it('trims search and passes through when non-empty', async () => {
    mockRepo.list.mockResolvedValue([]);
    mockRepo.count.mockResolvedValue(0);

    await useCase.execute({
      skip: 0,
      take: 20,
      sort: 'name',
      order: 'asc',
      search: '  rock  ',
    });

    expect(mockRepo.list).toHaveBeenCalledWith(expect.objectContaining({ search: 'rock' }));
    expect(mockRepo.count).toHaveBeenCalledWith('rock');
  });

  it('treats whitespace-only search as undefined', async () => {
    mockRepo.list.mockResolvedValue([]);
    mockRepo.count.mockResolvedValue(0);

    await useCase.execute({
      skip: 0,
      take: 20,
      sort: 'name',
      order: 'asc',
      search: '   ',
    });

    expect(mockRepo.list).toHaveBeenCalledWith(expect.objectContaining({ search: undefined }));
    expect(mockRepo.count).toHaveBeenCalledWith(undefined);
  });
});
