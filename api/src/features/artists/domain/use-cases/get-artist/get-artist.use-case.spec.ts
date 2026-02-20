import { GetArtistUseCase } from './get-artist.use-case';
import { IArtistRepository } from '../../ports/artist-repository.port';
import { Artist } from '../../entities/artist.entity';
import { NotFoundError } from '@shared/errors';

describe('GetArtistUseCase', () => {
  let useCase: GetArtistUseCase;
  let mockRepo: jest.Mocked<IArtistRepository>;

  const mockArtist = Artist.reconstruct({
    id: 'artist-1',
    name: 'Radiohead',
    albumCount: 9,
    songCount: 120,
    size: 5000000000,
    mbzArtistId: 'mbz-123',
    biography: 'English rock band',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    mockRepo = { findById: jest.fn() } as any;
    useCase = new GetArtistUseCase(mockRepo);
  });

  it('should return artist when found', async () => {
    mockRepo.findById.mockResolvedValue(mockArtist);

    const result = await useCase.execute({ id: 'artist-1' });

    expect(result.id).toBe('artist-1');
    expect(result.name).toBe('Radiohead');
    expect(result.albumCount).toBe(9);
    expect(result.biography).toBe('English rock band');
  });

  it('should throw NotFoundError when artist not found', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute({ id: 'nonexistent' })).rejects.toThrow(NotFoundError);
  });

  it('should throw NotFoundError for empty id', async () => {
    await expect(useCase.execute({ id: '' })).rejects.toThrow(NotFoundError);
  });

  it('should throw NotFoundError for whitespace-only id', async () => {
    await expect(useCase.execute({ id: '   ' })).rejects.toThrow(NotFoundError);
  });
});
