import { GetRecentAlbumsUseCase } from './get-recent-albums.use-case';
import { IAlbumRepository } from '../../ports/album-repository.port';
import { Album } from '../../entities/album.entity';

describe('GetRecentAlbumsUseCase', () => {
  let useCase: GetRecentAlbumsUseCase;
  let mockRepo: jest.Mocked<IAlbumRepository>;

  const mockAlbum = Album.reconstruct({
    id: 'album-1',
    name: 'Recent Album',
    compilation: false,
    songCount: 10,
    duration: 2000,
    size: 100000,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    mockRepo = { findRecent: jest.fn() } as any;
    useCase = new GetRecentAlbumsUseCase(mockRepo);
  });

  it('should return recent albums with default limit', async () => {
    mockRepo.findRecent.mockResolvedValue([mockAlbum]);

    const result = await useCase.execute();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Recent Album');
    expect(mockRepo.findRecent).toHaveBeenCalledWith(12);
  });

  it('should accept custom take', async () => {
    mockRepo.findRecent.mockResolvedValue([]);

    await useCase.execute({ take: 5 });

    expect(mockRepo.findRecent).toHaveBeenCalledWith(5);
  });

  it('should clamp take to max 50', async () => {
    mockRepo.findRecent.mockResolvedValue([]);

    await useCase.execute({ take: 100 });

    expect(mockRepo.findRecent).toHaveBeenCalledWith(50);
  });

  it('should clamp take to min 1', async () => {
    mockRepo.findRecent.mockResolvedValue([]);

    await useCase.execute({ take: -5 });

    expect(mockRepo.findRecent).toHaveBeenCalledWith(1);
  });
});
