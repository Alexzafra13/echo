import { generateAlbumPid, generateArtistPid } from './pid.util';

describe('pid.util', () => {
  describe('generateAlbumPid', () => {
    it('should return mbzAlbumId directly when provided', () => {
      const mbzAlbumId = 'mbz-12345';
      const result = generateAlbumPid(mbzAlbumId, 'artist-1', 'Album Name', 2020);
      expect(result).toBe(mbzAlbumId);
    });

    it('should generate pid-hash when mbzAlbumId is null', () => {
      const result = generateAlbumPid(null, 'artist-1', 'Album Name', 2020);
      expect(result).toMatch(/^pid-[a-f0-9]{32}$/);
    });

    it('should generate pid-hash when mbzAlbumId is undefined', () => {
      const result = generateAlbumPid(undefined, 'artist-1', 'Album Name', 2020);
      expect(result).toMatch(/^pid-[a-f0-9]{32}$/);
    });

    it('should produce same hash for same inputs (deterministic)', () => {
      const result1 = generateAlbumPid(undefined, 'artist-1', 'Album Name', 2020);
      const result2 = generateAlbumPid(undefined, 'artist-1', 'Album Name', 2020);
      expect(result1).toBe(result2);
    });

    it('should produce different hashes for different artist IDs', () => {
      const result1 = generateAlbumPid(undefined, 'artist-1', 'Album Name', 2020);
      const result2 = generateAlbumPid(undefined, 'artist-2', 'Album Name', 2020);
      expect(result1).not.toBe(result2);
    });

    it('should produce different hashes for different album names', () => {
      const result1 = generateAlbumPid(undefined, 'artist-1', 'Album Name', 2020);
      const result2 = generateAlbumPid(undefined, 'artist-1', 'Different Album', 2020);
      expect(result1).not.toBe(result2);
    });

    it('should produce different hashes when year is included vs excluded', () => {
      const result1 = generateAlbumPid(undefined, 'artist-1', 'Album Name', 2020);
      const result2 = generateAlbumPid(undefined, 'artist-1', 'Album Name');
      expect(result1).not.toBe(result2);
    });

    it('should produce different hashes for different years', () => {
      const result1 = generateAlbumPid(undefined, 'artist-1', 'Album Name', 2020);
      const result2 = generateAlbumPid(undefined, 'artist-1', 'Album Name', 2021);
      expect(result1).not.toBe(result2);
    });

    it('should treat null year same as undefined year', () => {
      const result1 = generateAlbumPid(undefined, 'artist-1', 'Album Name', null);
      const result2 = generateAlbumPid(undefined, 'artist-1', 'Album Name', undefined);
      expect(result1).toBe(result2);
    });

    it('should have hash format of pid- followed by 32 hex characters', () => {
      const result = generateAlbumPid(undefined, 'artist-1', 'Album Name', 2020);
      expect(result).toMatch(/^pid-[a-f0-9]{32}$/);
      expect(result.length).toBe(36); // 'pid-' (4) + 32 hex chars
    });
  });

  describe('generateArtistPid', () => {
    it('should return mbzArtistId directly when provided', () => {
      const mbzArtistId = 'mbz-artist-123';
      const result = generateArtistPid(mbzArtistId, 'Artist Name');
      expect(result).toBe(mbzArtistId);
    });

    it('should generate pid-hash when mbzArtistId is null', () => {
      const result = generateArtistPid(null, 'Artist Name');
      expect(result).toMatch(/^pid-[a-f0-9]{32}$/);
    });

    it('should generate pid-hash when mbzArtistId is undefined', () => {
      const result = generateArtistPid(undefined, 'Artist Name');
      expect(result).toMatch(/^pid-[a-f0-9]{32}$/);
    });

    it('should produce same hash for same inputs (deterministic)', () => {
      const result1 = generateArtistPid(undefined, 'Artist Name');
      const result2 = generateArtistPid(undefined, 'Artist Name');
      expect(result1).toBe(result2);
    });

    it('should produce different hashes for different artist names', () => {
      const result1 = generateArtistPid(undefined, 'Artist Name');
      const result2 = generateArtistPid(undefined, 'Different Artist');
      expect(result1).not.toBe(result2);
    });

    it('should have hash format of pid- followed by 32 hex characters', () => {
      const result = generateArtistPid(undefined, 'Artist Name');
      expect(result).toMatch(/^pid-[a-f0-9]{32}$/);
      expect(result.length).toBe(36); // 'pid-' (4) + 32 hex chars
    });
  });
});
