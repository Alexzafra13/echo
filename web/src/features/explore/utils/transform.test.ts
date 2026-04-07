import { describe, it, expect } from 'vitest';
import { toAlbum } from './transform';
import type { ExploreAlbum } from '../services/explore.service';

describe('toAlbum', () => {
  it('should transform ExploreAlbum to Album format', () => {
    const input: ExploreAlbum = {
      id: 'abc-123',
      name: 'Test Album',
      artistId: 'art-1',
      artistName: 'Test Artist',
      coverArtPath: '/covers/abc.jpg',
      year: 2023,
      songCount: 12,
      duration: 3600,
    };

    const result = toAlbum(input);

    expect(result.id).toBe('abc-123');
    expect(result.title).toBe('Test Album');
    expect(result.artist).toBe('Test Artist');
    expect(result.artistId).toBe('art-1');
    expect(result.coverImage).toBe('/api/images/albums/abc-123/cover');
    expect(result.year).toBe(2023);
    expect(result.totalTracks).toBe(12);
    expect(result.duration).toBe(3600);
  });

  it('should use fallback for null artistName', () => {
    const input: ExploreAlbum = {
      id: '1',
      name: 'Album',
      artistId: null,
      artistName: null,
      coverArtPath: null,
      year: null,
      songCount: 5,
      duration: 1200,
    };

    const result = toAlbum(input);

    expect(result.artist).toBe('Artista desconocido');
    expect(result.artistId).toBe('');
    expect(result.year).toBe(0);
  });
});
