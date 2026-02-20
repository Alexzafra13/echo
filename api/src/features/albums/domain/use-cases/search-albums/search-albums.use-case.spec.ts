import { SearchAlbumsUseCase } from './search-albums.use-case';
import { IAlbumRepository } from '../../ports/album-repository.port';
import { Album } from '../../entities/album.entity';
import { ValidationError } from '@shared/errors';

describe('SearchAlbumsUseCase', () => {
  let useCase: SearchAlbumsUseCase;
  let mockRepo: jest.Mocked<IAlbumRepository>;

  const mockAlbum = Album.reconstruct({
    id: 'album-1',
    name: 'Abbey Road',
    artistId: 'artist-1',
    artistName: 'The Beatles',
    year: 1969,
    compilation: false,
    songCount: 17,
    duration: 2836,
    size: 500000000,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    mockRepo = { search: jest.fn() } as any;
    useCase = new SearchAlbumsUseCase(mockRepo);
  });

  it('should search and return albums', async () => {
    mockRepo.search.mockResolvedValue([mockAlbum]);

    const result = await useCase.execute({ query: 'Abbey', skip: 0, take: 10 });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Abbey Road');
    expect(result.query).toBe('Abbey');
    expect(mockRepo.search).toHaveBeenCalledWith('Abbey', 0, 10);
  });

  it('should throw ValidationError for empty query', async () => {
    await expect(useCase.execute({ query: '', skip: 0, take: 10 })).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for query shorter than 2 chars', async () => {
    await expect(useCase.execute({ query: 'A', skip: 0, take: 10 })).rejects.toThrow(ValidationError);
  });

  it('should trim query', async () => {
    mockRepo.search.mockResolvedValue([]);

    await useCase.execute({ query: '  Abbey  ', skip: 0, take: 10 });

    expect(mockRepo.search).toHaveBeenCalledWith('Abbey', 0, 10);
  });

  it('should clamp take to max 100', async () => {
    mockRepo.search.mockResolvedValue([]);

    await useCase.execute({ query: 'test', skip: 0, take: 500 });

    expect(mockRepo.search).toHaveBeenCalledWith('test', 0, 100);
  });

  it('should clamp take to min 1', async () => {
    mockRepo.search.mockResolvedValue([]);

    await useCase.execute({ query: 'test', skip: 0, take: -5 });

    expect(mockRepo.search).toHaveBeenCalledWith('test', 0, 1);
  });

  it('should clamp skip to min 0', async () => {
    mockRepo.search.mockResolvedValue([]);

    await useCase.execute({ query: 'test', skip: -10, take: 10 });

    expect(mockRepo.search).toHaveBeenCalledWith('test', 0, 10);
  });
});
