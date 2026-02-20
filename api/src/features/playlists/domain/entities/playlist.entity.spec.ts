import { Playlist } from './playlist.entity';

describe('Playlist Entity', () => {
  const baseProps = {
    name: 'My Playlist',
    description: 'A cool playlist',
    duration: 3600,
    size: 100000,
    ownerId: 'user-1',
    public: false,
    songCount: 10,
    sync: false,
  };

  describe('create', () => {
    it('should create a playlist with generated id and timestamps', () => {
      const playlist = Playlist.create(baseProps);

      expect(playlist.id).toBeDefined();
      expect(playlist.name).toBe('My Playlist');
      expect(playlist.description).toBe('A cool playlist');
      expect(playlist.duration).toBe(3600);
      expect(playlist.size).toBe(100000);
      expect(playlist.ownerId).toBe('user-1');
      expect(playlist.public).toBe(false);
      expect(playlist.songCount).toBe(10);
      expect(playlist.sync).toBe(false);
      expect(playlist.createdAt).toBeInstanceOf(Date);
      expect(playlist.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate unique ids', () => {
      const p1 = Playlist.create(baseProps);
      const p2 = Playlist.create(baseProps);
      expect(p1.id).not.toBe(p2.id);
    });
  });

  describe('fromPrimitives', () => {
    it('should reconstruct from primitives', () => {
      const now = new Date();
      const playlist = Playlist.fromPrimitives({
        id: 'pl-1',
        name: 'Existing',
        duration: 0,
        size: 0,
        ownerId: 'user-1',
        public: true,
        songCount: 0,
        sync: false,
        createdAt: now,
        updatedAt: now,
      });

      expect(playlist.id).toBe('pl-1');
      expect(playlist.public).toBe(true);
    });
  });

  describe('mutation methods', () => {
    it('updateName should change name and update timestamp', () => {
      const playlist = Playlist.create(baseProps);
      const originalUpdatedAt = playlist.updatedAt;

      playlist.updateName('Renamed Playlist');

      expect(playlist.name).toBe('Renamed Playlist');
      expect(playlist.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('updateDescription should change description', () => {
      const playlist = Playlist.create(baseProps);
      playlist.updateDescription('New description');
      expect(playlist.description).toBe('New description');
    });

    it('updateDescription should allow clearing', () => {
      const playlist = Playlist.create(baseProps);
      playlist.updateDescription(undefined);
      expect(playlist.description).toBeUndefined();
    });

    it('updateCoverImage should change cover', () => {
      const playlist = Playlist.create(baseProps);
      playlist.updateCoverImage('/covers/img.jpg');
      expect(playlist.coverImageUrl).toBe('/covers/img.jpg');
    });

    it('updateDuration should change duration', () => {
      const playlist = Playlist.create(baseProps);
      playlist.updateDuration(7200);
      expect(playlist.duration).toBe(7200);
    });

    it('updateSize should change size', () => {
      const playlist = Playlist.create(baseProps);
      playlist.updateSize(200000);
      expect(playlist.size).toBe(200000);
    });

    it('updateSongCount should change song count', () => {
      const playlist = Playlist.create(baseProps);
      playlist.updateSongCount(20);
      expect(playlist.songCount).toBe(20);
    });

    it('setPublic should toggle public flag', () => {
      const playlist = Playlist.create(baseProps);
      expect(playlist.public).toBe(false);
      playlist.setPublic(true);
      expect(playlist.public).toBe(true);
    });
  });

  describe('toPrimitives', () => {
    it('should return all properties as a plain object', () => {
      const playlist = Playlist.create(baseProps);
      const primitives = playlist.toPrimitives();

      expect(primitives.id).toBe(playlist.id);
      expect(primitives.name).toBe('My Playlist');
      expect(primitives.ownerId).toBe('user-1');
    });

    it('should return a copy', () => {
      const playlist = Playlist.create(baseProps);
      const p1 = playlist.toPrimitives();
      const p2 = playlist.toPrimitives();
      expect(p1).not.toBe(p2);
      expect(p1).toEqual(p2);
    });
  });
});
