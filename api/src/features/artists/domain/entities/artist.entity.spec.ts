import { Artist } from './artist.entity';

describe('Artist Entity', () => {
  const baseProps = {
    name: 'Radiohead',
    albumCount: 9,
    songCount: 120,
    size: 5000000000,
  };

  describe('create', () => {
    it('should create an artist with generated id and timestamps', () => {
      const artist = Artist.create(baseProps);

      expect(artist.id).toBeDefined();
      expect(artist.name).toBe('Radiohead');
      expect(artist.albumCount).toBe(9);
      expect(artist.songCount).toBe(120);
      expect(artist.size).toBe(5000000000);
      expect(artist.createdAt).toBeInstanceOf(Date);
    });

    it('should generate unique ids', () => {
      const a1 = Artist.create(baseProps);
      const a2 = Artist.create(baseProps);
      expect(a1.id).not.toBe(a2.id);
    });

    it('should handle optional fields', () => {
      const artist = Artist.create({
        name: 'Unknown',
        albumCount: 0,
        songCount: 0,
        size: 0,
      });

      expect(artist.mbzArtistId).toBeUndefined();
      expect(artist.biography).toBeUndefined();
      expect(artist.smallImageUrl).toBeUndefined();
      expect(artist.mediumImageUrl).toBeUndefined();
      expect(artist.largeImageUrl).toBeUndefined();
      expect(artist.externalUrl).toBeUndefined();
      expect(artist.orderArtistName).toBeUndefined();
    });
  });

  describe('reconstruct', () => {
    it('should reconstruct with all fields', () => {
      const now = new Date();
      const artist = Artist.reconstruct({
        id: 'artist-123',
        ...baseProps,
        mbzArtistId: 'mbz-123',
        biography: 'English rock band',
        smallImageUrl: '/img/small.jpg',
        mediumImageUrl: '/img/medium.jpg',
        largeImageUrl: '/img/large.jpg',
        externalUrl: 'https://example.com',
        externalInfoUpdatedAt: now,
        orderArtistName: 'radiohead',
        createdAt: now,
        updatedAt: now,
      });

      expect(artist.id).toBe('artist-123');
      expect(artist.biography).toBe('English rock band');
      expect(artist.mbzArtistId).toBe('mbz-123');
    });
  });

  describe('toPrimitives', () => {
    it('should return a plain object copy', () => {
      const artist = Artist.create(baseProps);
      const p1 = artist.toPrimitives();
      const p2 = artist.toPrimitives();
      expect(p1).not.toBe(p2);
      expect(p1).toEqual(p2);
      expect(p1.name).toBe('Radiohead');
    });
  });
});
