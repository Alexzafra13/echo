import { GetPlaylistUseCase } from './get-playlist.use-case';
import { IPlaylistRepository } from '../../ports';
import { IUserRepository } from '@features/auth/domain/ports/user-repository.port';
import { Playlist } from '../../entities';
import { User } from '@features/auth/domain/entities/user.entity';
import { NotFoundError, ValidationError, ForbiddenError } from '@shared/errors';

describe('GetPlaylistUseCase', () => {
  let useCase: GetPlaylistUseCase;
  let mockPlaylistRepo: jest.Mocked<IPlaylistRepository>;
  let mockUserRepo: jest.Mocked<IUserRepository>;

  const now = new Date();

  const mockPlaylist = Playlist.fromPrimitives({
    id: 'playlist-123',
    name: 'My Favorites',
    description: 'My favorite tracks',
    coverImageUrl: '/covers/playlist-123.jpg',
    duration: 3600,
    size: 150000000,
    ownerId: 'user-123',
    public: true,
    songCount: 25,
    path: '/playlists/my-favorites',
    sync: false,
    createdAt: now,
    updatedAt: now,
  });

  const mockUser = User.reconstruct({
    id: 'user-123',
    username: 'johndoe',
    password: 'hashedpassword',
    name: 'John Doe',
    avatarPath: '/avatars/user-123.jpg',
    isAdmin: false,
    isActive: true,
    mustChangePassword: false,
    createdAt: now,
    updatedAt: now,
  });

  beforeEach(() => {
    mockPlaylistRepo = {
      findById: jest.fn(),
    } as any;

    mockUserRepo = {
      findById: jest.fn(),
    } as any;

    useCase = new GetPlaylistUseCase(mockPlaylistRepo, mockUserRepo);
  });

  describe('execute', () => {
    it('should return playlist with owner info', async () => {
      mockPlaylistRepo.findById.mockResolvedValue(mockPlaylist);
      mockUserRepo.findById.mockResolvedValue(mockUser);

      const result = await useCase.execute({ id: 'playlist-123' });

      expect(mockPlaylistRepo.findById).toHaveBeenCalledWith('playlist-123');
      expect(mockUserRepo.findById).toHaveBeenCalledWith('user-123');
      expect(result.id).toBe('playlist-123');
      expect(result.name).toBe('My Favorites');
      expect(result.ownerName).toBe('John Doe');
      expect(result.ownerHasAvatar).toBe(true);
    });

    it('should use username if name is not set', async () => {
      const userWithoutName = User.reconstruct({
        ...mockUser.toPrimitives(),
        name: undefined,
      });
      mockPlaylistRepo.findById.mockResolvedValue(mockPlaylist);
      mockUserRepo.findById.mockResolvedValue(userWithoutName);

      const result = await useCase.execute({ id: 'playlist-123' });

      expect(result.ownerName).toBe('johndoe');
    });

    it('should set ownerHasAvatar to false when no avatar', async () => {
      const userWithoutAvatar = User.reconstruct({
        ...mockUser.toPrimitives(),
        avatarPath: undefined,
      });
      mockPlaylistRepo.findById.mockResolvedValue(mockPlaylist);
      mockUserRepo.findById.mockResolvedValue(userWithoutAvatar);

      const result = await useCase.execute({ id: 'playlist-123' });

      expect(result.ownerHasAvatar).toBe(false);
    });

    it('should throw NotFoundError when playlist not found', async () => {
      mockPlaylistRepo.findById.mockResolvedValue(null);

      await expect(useCase.execute({ id: 'non-existent' })).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when ID is empty', async () => {
      await expect(useCase.execute({ id: '' })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when ID is whitespace', async () => {
      await expect(useCase.execute({ id: '   ' })).rejects.toThrow(ValidationError);
    });

    it('should return all playlist properties', async () => {
      mockPlaylistRepo.findById.mockResolvedValue(mockPlaylist);
      mockUserRepo.findById.mockResolvedValue(mockUser);

      const result = await useCase.execute({ id: 'playlist-123' });

      expect(result.description).toBe('My favorite tracks');
      expect(result.coverImageUrl).toBe('/covers/playlist-123.jpg');
      expect(result.duration).toBe(3600);
      expect(result.size).toBe(150000000);
      expect(result.public).toBe(true);
      expect(result.songCount).toBe(25);
      expect(result.path).toBe('/playlists/my-favorites');
      expect(result.sync).toBe(false);
    });

    it('should handle playlist without optional fields', async () => {
      const minimalPlaylist = Playlist.fromPrimitives({
        id: 'playlist-minimal',
        name: 'Minimal Playlist',
        duration: 0,
        size: 0,
        ownerId: 'user-123',
        public: false,
        songCount: 0,
        sync: false,
        createdAt: now,
        updatedAt: now,
      });
      mockPlaylistRepo.findById.mockResolvedValue(minimalPlaylist);
      mockUserRepo.findById.mockResolvedValue(mockUser);

      const result = await useCase.execute({ id: 'playlist-minimal' });

      expect(result.description).toBeUndefined();
      expect(result.coverImageUrl).toBeUndefined();
      expect(result.path).toBeUndefined();
    });

    it('should handle missing owner gracefully', async () => {
      mockPlaylistRepo.findById.mockResolvedValue(mockPlaylist);
      mockUserRepo.findById.mockResolvedValue(null);

      const result = await useCase.execute({ id: 'playlist-123' });

      expect(result.ownerName).toBeUndefined();
      expect(result.ownerHasAvatar).toBe(false);
    });
  });

  describe('access control', () => {
    const privatePlaylist = Playlist.fromPrimitives({
      id: 'private-playlist',
      name: 'Private Playlist',
      duration: 0,
      size: 0,
      ownerId: 'user-123',
      public: false,
      songCount: 0,
      sync: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    it('should allow owner to access private playlist', async () => {
      mockPlaylistRepo.findById.mockResolvedValue(privatePlaylist);
      mockUserRepo.findById.mockResolvedValue(mockUser);

      const result = await useCase.execute({
        id: 'private-playlist',
        requesterId: 'user-123', // Same as ownerId
      });

      expect(result.id).toBe('private-playlist');
    });

    it('should throw ForbiddenError when non-owner accesses private playlist', async () => {
      mockPlaylistRepo.findById.mockResolvedValue(privatePlaylist);

      await expect(
        useCase.execute({
          id: 'private-playlist',
          requesterId: 'other-user', // Different from ownerId
        }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('should allow anyone to access public playlist', async () => {
      mockPlaylistRepo.findById.mockResolvedValue(mockPlaylist); // public: true
      mockUserRepo.findById.mockResolvedValue(mockUser);

      const result = await useCase.execute({
        id: 'playlist-123',
        requesterId: 'other-user', // Different from ownerId
      });

      expect(result.id).toBe('playlist-123');
    });

    it('should throw ForbiddenError when no requesterId for private playlist', async () => {
      mockPlaylistRepo.findById.mockResolvedValue(privatePlaylist);

      await expect(
        useCase.execute({
          id: 'private-playlist',
          // No requesterId
        }),
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
