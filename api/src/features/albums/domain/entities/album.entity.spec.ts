import { Album } from './album.entity';

describe('Album Entity', () => {
  const baseProps = {
    name: 'Abbey Road',
    artistId: 'artist-1',
    artistName: 'The Beatles',
    year: 1969,
    compilation: false,
    songCount: 17,
    duration: 2836,
    size: 500000000,
  };

  describe('create', () => {
    it('should create an album with generated id and timestamps', () => {
      const album = Album.create(baseProps);

      expect(album.id).toBeDefined();
      expect(album.name).toBe('Abbey Road');
      expect(album.artistId).toBe('artist-1');
      expect(album.artistName).toBe('The Beatles');
      expect(album.year).toBe(1969);
      expect(album.compilation).toBe(false);
      expect(album.songCount).toBe(17);
      expect(album.duration).toBe(2836);
      expect(album.size).toBe(500000000);
      expect(album.createdAt).toBeInstanceOf(Date);
    });

    it('should generate unique ids', () => {
      const a1 = Album.create(baseProps);
      const a2 = Album.create(baseProps);
      expect(a1.id).not.toBe(a2.id);
    });

    it('should handle optional fields', () => {
      const album = Album.create({
        name: 'Minimal',
        compilation: false,
        songCount: 0,
        duration: 0,
        size: 0,
      });

      expect(album.artistId).toBeUndefined();
      expect(album.coverArtPath).toBeUndefined();
      expect(album.year).toBeUndefined();
      expect(album.releaseDate).toBeUndefined();
      expect(album.description).toBeUndefined();
    });
  });

  describe('reconstruct', () => {
    it('should reconstruct from full props', () => {
      const now = new Date();
      const album = Album.reconstruct({
        id: 'album-123',
        ...baseProps,
        coverArtPath: '/covers/abbey_road.jpg',
        description: 'Classic album',
        createdAt: now,
        updatedAt: now,
      });

      expect(album.id).toBe('album-123');
      expect(album.coverArtPath).toBe('/covers/abbey_road.jpg');
      expect(album.description).toBe('Classic album');
    });
  });

  describe('toPrimitives', () => {
    it('should return a plain object copy', () => {
      const album = Album.create(baseProps);
      const p1 = album.toPrimitives();
      const p2 = album.toPrimitives();
      expect(p1).not.toBe(p2);
      expect(p1).toEqual(p2);
      expect(p1.name).toBe('Abbey Road');
    });
  });
});
