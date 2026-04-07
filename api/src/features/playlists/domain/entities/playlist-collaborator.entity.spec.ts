import {
  PlaylistCollaborator,
  CollaboratorRole,
  CollaboratorStatus,
} from './playlist-collaborator.entity';

describe('PlaylistCollaborator Entity', () => {
  const baseProps = {
    playlistId: 'playlist-123',
    userId: 'user-456',
    role: 'viewer' as CollaboratorRole,
    status: 'pending' as CollaboratorStatus,
    invitedBy: 'owner-123',
  };

  describe('create', () => {
    it('should create a collaborator with generated id and timestamps', () => {
      const collaborator = PlaylistCollaborator.create(baseProps);

      expect(collaborator.id).toBeDefined();
      expect(collaborator.playlistId).toBe('playlist-123');
      expect(collaborator.userId).toBe('user-456');
      expect(collaborator.role).toBe('viewer');
      expect(collaborator.status).toBe('pending');
      expect(collaborator.invitedBy).toBe('owner-123');
      expect(collaborator.createdAt).toBeInstanceOf(Date);
      expect(collaborator.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate unique ids', () => {
      const c1 = PlaylistCollaborator.create(baseProps);
      const c2 = PlaylistCollaborator.create(baseProps);
      expect(c1.id).not.toBe(c2.id);
    });
  });

  describe('fromPrimitives', () => {
    it('should reconstruct from primitives', () => {
      const now = new Date();
      const collaborator = PlaylistCollaborator.fromPrimitives({
        id: 'collab-1',
        playlistId: 'playlist-123',
        userId: 'user-456',
        role: 'editor' as CollaboratorRole,
        status: 'accepted' as CollaboratorStatus,
        invitedBy: 'owner-123',
        createdAt: now,
        updatedAt: now,
      });

      expect(collaborator.id).toBe('collab-1');
      expect(collaborator.playlistId).toBe('playlist-123');
      expect(collaborator.userId).toBe('user-456');
      expect(collaborator.role).toBe('editor');
      expect(collaborator.status).toBe('accepted');
      expect(collaborator.invitedBy).toBe('owner-123');
      expect(collaborator.createdAt).toBe(now);
      expect(collaborator.updatedAt).toBe(now);
    });
  });

  describe('accept', () => {
    it('should update status and timestamp', () => {
      const collaborator = PlaylistCollaborator.create(baseProps);
      const originalUpdatedAt = collaborator.updatedAt;

      collaborator.accept();

      expect(collaborator.status).toBe('accepted');
      expect(collaborator.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  describe('updateRole', () => {
    it('should update role and timestamp', () => {
      const collaborator = PlaylistCollaborator.create(baseProps);
      const originalUpdatedAt = collaborator.updatedAt;

      collaborator.updateRole('editor');

      expect(collaborator.role).toBe('editor');
      expect(collaborator.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  describe('toPrimitives', () => {
    it('should return a copy of all properties', () => {
      const collaborator = PlaylistCollaborator.create(baseProps);
      const p1 = collaborator.toPrimitives();
      const p2 = collaborator.toPrimitives();

      expect(p1).not.toBe(p2);
      expect(p1).toEqual(p2);
      expect(p1.id).toBe(collaborator.id);
      expect(p1.playlistId).toBe('playlist-123');
      expect(p1.userId).toBe('user-456');
      expect(p1.role).toBe('viewer');
      expect(p1.status).toBe('pending');
      expect(p1.invitedBy).toBe('owner-123');
    });
  });
});
