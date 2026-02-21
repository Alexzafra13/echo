import { ArtistMapper } from './artist.mapper';
import { Artist } from '../../domain/entities/artist.entity';
import { Artist as ArtistDb } from '@infrastructure/database/schema/artists';

describe('ArtistMapper', () => {
  const mockDbArtist = {
    id: 'artist-1',
    name: 'Radiohead',
    albumCount: 9,
    songCount: 120,
    mbzArtistId: 'mbz-123',
    biography: 'English rock band',
    externalUrl: 'https://example.com',
    externalProfileUpdatedAt: new Date('2024-06-01'),
    orderArtistName: 'radiohead',
    size: BigInt(5000000000),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-15'),
  };

  describe('toDomain', () => {
    it('should convert DB artist to domain Artist', () => {
      const artist = ArtistMapper.toDomain(mockDbArtist as unknown as ArtistDb);

      expect(artist).toBeInstanceOf(Artist);
      expect(artist.id).toBe('artist-1');
      expect(artist.name).toBe('Radiohead');
      expect(artist.albumCount).toBe(9);
      expect(artist.songCount).toBe(120);
      expect(artist.mbzArtistId).toBe('mbz-123');
      expect(artist.biography).toBe('English rock band');
      expect(artist.externalUrl).toBe('https://example.com');
      expect(artist.orderArtistName).toBe('radiohead');
      expect(artist.size).toBe(5000000000);
    });

    it('should handle null optional fields', () => {
      const artist = ArtistMapper.toDomain({
        ...mockDbArtist,
        mbzArtistId: null,
        biography: null,
        externalUrl: null,
        externalProfileUpdatedAt: null,
        orderArtistName: null,
      } as unknown as ArtistDb);

      expect(artist.mbzArtistId).toBeUndefined();
      expect(artist.biography).toBeUndefined();
      expect(artist.externalUrl).toBeUndefined();
      expect(artist.externalInfoUpdatedAt).toBeUndefined();
      expect(artist.orderArtistName).toBeUndefined();
    });

    it('should default counts to 0 when null', () => {
      const artist = ArtistMapper.toDomain({
        ...mockDbArtist,
        albumCount: null,
        songCount: null,
        size: null,
      } as unknown as ArtistDb);

      expect(artist.albumCount).toBe(0);
      expect(artist.songCount).toBe(0);
      expect(artist.size).toBe(0);
    });

    it('should map externalProfileUpdatedAt to externalInfoUpdatedAt', () => {
      const artist = ArtistMapper.toDomain(mockDbArtist as unknown as ArtistDb);
      expect(artist.externalInfoUpdatedAt).toEqual(mockDbArtist.externalProfileUpdatedAt);
    });
  });

  describe('toPersistence', () => {
    it('should convert domain artist to persistence format', () => {
      const artist = ArtistMapper.toDomain(mockDbArtist as unknown as ArtistDb);
      const persistence = ArtistMapper.toPersistence(artist);

      expect(persistence.id).toBe('artist-1');
      expect(persistence.name).toBe('Radiohead');
      expect(persistence.albumCount).toBe(9);
      expect(persistence.songCount).toBe(120);
      expect(persistence.mbzArtistId).toBe('mbz-123');
    });

    it('should map externalInfoUpdatedAt back to externalProfileUpdatedAt', () => {
      const artist = ArtistMapper.toDomain(mockDbArtist as unknown as ArtistDb);
      const persistence = ArtistMapper.toPersistence(artist);
      expect(persistence.externalProfileUpdatedAt).toEqual(mockDbArtist.externalProfileUpdatedAt);
    });

    it('should convert undefined to null', () => {
      const artist = ArtistMapper.toDomain({
        ...mockDbArtist,
        mbzArtistId: null,
        biography: null,
      } as unknown as ArtistDb);
      const persistence = ArtistMapper.toPersistence(artist);
      expect(persistence.mbzArtistId).toBeNull();
      expect(persistence.biography).toBeNull();
    });
  });

  describe('toDomainArray', () => {
    it('should convert array of DB artists', () => {
      const artists = ArtistMapper.toDomainArray([
        mockDbArtist,
        mockDbArtist,
      ] as unknown as ArtistDb[]);
      expect(artists).toHaveLength(2);
      expect(artists[0]).toBeInstanceOf(Artist);
    });

    it('should handle empty array', () => {
      expect(ArtistMapper.toDomainArray([])).toEqual([]);
    });
  });
});
