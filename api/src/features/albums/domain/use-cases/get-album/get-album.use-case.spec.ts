import { GetAlbumUseCase } from './get-album.use-case';
import { IAlbumRepository } from '../../ports/album-repository.port';
import { Album } from '../../entities/album.entity';
import { NotFoundError } from '@shared/errors';

describe('GetAlbumUseCase', () => {
  let useCase: GetAlbumUseCase;
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
    mockRepo = { findById: jest.fn() } as any;
    useCase = new GetAlbumUseCase(mockRepo);
  });

  it('should return album when found', async () => {
    mockRepo.findById.mockResolvedValue(mockAlbum);

    const result = await useCase.execute({ id: 'album-1' });

    expect(result.id).toBe('album-1');
    expect(result.name).toBe('Abbey Road');
    expect(result.artistName).toBe('The Beatles');
    expect(mockRepo.findById).toHaveBeenCalledWith('album-1');
  });

  it('should throw NotFoundError when album not found', async () => {
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
