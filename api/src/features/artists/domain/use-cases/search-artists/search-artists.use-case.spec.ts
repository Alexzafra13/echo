import { SearchArtistsUseCase } from './search-artists.use-case';
import { IArtistRepository } from '../../ports/artist-repository.port';
import { Artist } from '../../entities/artist.entity';
import { ValidationError } from '@shared/errors';

describe('SearchArtistsUseCase', () => {
  let useCase: SearchArtistsUseCase;
  let mockRepo: jest.Mocked<IArtistRepository>;

  const mockArtist = Artist.reconstruct({
    id: 'artist-1',
    name: 'Radiohead',
    albumCount: 9,
    songCount: 120,
    size: 5000000000,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    mockRepo = { search: jest.fn() } as unknown as jest.Mocked<IArtistRepository>;
    useCase = new SearchArtistsUseCase(mockRepo);
  });

  it('should search and return artists', async () => {
    mockRepo.search.mockResolvedValue([mockArtist]);

    const result = await useCase.execute({ query: 'Radio', skip: 0, take: 10 });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Radiohead');
    expect(result.query).toBe('Radio');
  });

  it('should throw ValidationError for empty query', async () => {
    await expect(useCase.execute({ query: '', skip: 0, take: 10 })).rejects.toThrow(
      ValidationError
    );
  });

  it('should throw ValidationError for query shorter than 2 chars', async () => {
    await expect(useCase.execute({ query: 'R', skip: 0, take: 10 })).rejects.toThrow(
      ValidationError
    );
  });

  it('should trim query', async () => {
    mockRepo.search.mockResolvedValue([]);
    await useCase.execute({ query: '  Radio  ', skip: 0, take: 10 });
    expect(mockRepo.search).toHaveBeenCalledWith('Radio', 0, 10);
  });

  it('should set hasMore when results fill the page', async () => {
    const artists = Array.from({ length: 10 }, (_, i) =>
      Artist.reconstruct({
        id: `artist-${i}`,
        name: `Artist ${i}`,
        albumCount: 0,
        songCount: 0,
        size: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );
    mockRepo.search.mockResolvedValue(artists);

    const result = await useCase.execute({ query: 'Artist', skip: 0, take: 10 });

    expect(result.hasMore).toBe(true);
  });

  it('should set hasMore to false when results are less than take', async () => {
    mockRepo.search.mockResolvedValue([mockArtist]);

    const result = await useCase.execute({ query: 'Radio', skip: 0, take: 10 });

    expect(result.hasMore).toBe(false);
  });

  it('should clamp take to max 100', async () => {
    mockRepo.search.mockResolvedValue([]);
    await useCase.execute({ query: 'test', skip: 0, take: 500 });
    expect(mockRepo.search).toHaveBeenCalledWith('test', 0, 100);
  });
});
