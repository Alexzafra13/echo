import { ForbiddenError } from '@shared/errors';
import { assertCanViewPlaylist, assertCanEditPlaylist } from './playlist-authorization';
import { Playlist } from '../entities';
import { ICollaboratorRepository } from '../ports';

describe('playlist-authorization', () => {
  let mockCollaboratorRepo: jest.Mocked<
    Pick<ICollaboratorRepository, 'isCollaborator' | 'isEditor'>
  >;

  const createPlaylist = (overrides = {}): Playlist =>
    Playlist.fromPrimitives({
      id: 'playlist-1',
      name: 'Test Playlist',
      duration: 0,
      size: Number(0),
      ownerId: 'owner-1',
      public: false,
      songCount: 0,
      sync: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

  beforeEach(() => {
    mockCollaboratorRepo = {
      isCollaborator: jest.fn().mockResolvedValue(false),
      isEditor: jest.fn().mockResolvedValue(false),
    };
  });

  describe('assertCanViewPlaylist', () => {
    it('should allow access to public playlists for anyone', async () => {
      const playlist = createPlaylist({ public: true });

      await expect(
        assertCanViewPlaylist(
          playlist,
          undefined,
          mockCollaboratorRepo as unknown as ICollaboratorRepository
        )
      ).resolves.toBeUndefined();

      // Should not even check collaborator status
      expect(mockCollaboratorRepo.isCollaborator).not.toHaveBeenCalled();
    });

    it('should allow access to the owner', async () => {
      const playlist = createPlaylist({ public: false, ownerId: 'owner-1' });

      await expect(
        assertCanViewPlaylist(
          playlist,
          'owner-1',
          mockCollaboratorRepo as unknown as ICollaboratorRepository
        )
      ).resolves.toBeUndefined();
    });

    it('should allow access to an accepted collaborator', async () => {
      const playlist = createPlaylist({ public: false });
      mockCollaboratorRepo.isCollaborator.mockResolvedValue(true);

      await expect(
        assertCanViewPlaylist(
          playlist,
          'collab-user',
          mockCollaboratorRepo as unknown as ICollaboratorRepository
        )
      ).resolves.toBeUndefined();

      expect(mockCollaboratorRepo.isCollaborator).toHaveBeenCalledWith('playlist-1', 'collab-user');
    });

    it('should throw ForbiddenError for unauthorized user on private playlist', async () => {
      const playlist = createPlaylist({ public: false });
      mockCollaboratorRepo.isCollaborator.mockResolvedValue(false);

      await expect(
        assertCanViewPlaylist(
          playlist,
          'stranger',
          mockCollaboratorRepo as unknown as ICollaboratorRepository
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError when requesterId is undefined on private playlist', async () => {
      const playlist = createPlaylist({ public: false });

      await expect(
        assertCanViewPlaylist(
          playlist,
          undefined,
          mockCollaboratorRepo as unknown as ICollaboratorRepository
        )
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('assertCanEditPlaylist', () => {
    it('should allow the owner to edit', async () => {
      const playlist = createPlaylist({ ownerId: 'owner-1' });

      await expect(
        assertCanEditPlaylist(
          playlist,
          'owner-1',
          mockCollaboratorRepo as unknown as ICollaboratorRepository
        )
      ).resolves.toBeUndefined();

      // Should not check isEditor since owner
      expect(mockCollaboratorRepo.isEditor).not.toHaveBeenCalled();
    });

    it('should allow an editor collaborator to edit', async () => {
      const playlist = createPlaylist({ ownerId: 'owner-1' });
      mockCollaboratorRepo.isEditor.mockResolvedValue(true);

      await expect(
        assertCanEditPlaylist(
          playlist,
          'editor-user',
          mockCollaboratorRepo as unknown as ICollaboratorRepository
        )
      ).resolves.toBeUndefined();

      expect(mockCollaboratorRepo.isEditor).toHaveBeenCalledWith('playlist-1', 'editor-user');
    });

    it('should throw ForbiddenError for a viewer collaborator', async () => {
      const playlist = createPlaylist({ ownerId: 'owner-1' });
      mockCollaboratorRepo.isEditor.mockResolvedValue(false);

      await expect(
        assertCanEditPlaylist(
          playlist,
          'viewer-user',
          mockCollaboratorRepo as unknown as ICollaboratorRepository
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError for unauthorized user', async () => {
      const playlist = createPlaylist({ ownerId: 'owner-1' });
      mockCollaboratorRepo.isEditor.mockResolvedValue(false);

      await expect(
        assertCanEditPlaylist(
          playlist,
          'stranger',
          mockCollaboratorRepo as unknown as ICollaboratorRepository
        )
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
