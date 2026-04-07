import { mapPlaylistTrack } from './playlist-track-mapper';
import type { TrackWithPlaylistOrder } from '../ports';

describe('mapPlaylistTrack', () => {
  const createTrack = (overrides = {}): TrackWithPlaylistOrder =>
    ({
      id: 'track-1',
      title: 'Test Song',
      trackNumber: 3,
      discNumber: 1,
      year: 2024,
      duration: 240,
      size: 5242880,
      path: '/music/test.mp3',
      albumId: 'album-1',
      artistId: 'artist-1',
      bitRate: 320000,
      suffix: 'mp3',
      artistName: 'Test Artist',
      albumName: 'Test Album',
      playlistOrder: 1,
      rgTrackGain: -6.5,
      rgTrackPeak: 0.95,
      rgAlbumGain: -7.2,
      rgAlbumPeak: 0.98,
      outroStart: 230,
      bpm: 120,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-06-01'),
      ...overrides,
    }) as unknown as TrackWithPlaylistOrder;

  it('should map all fields correctly', () => {
    const track = createTrack();
    const result = mapPlaylistTrack(track);

    expect(result.id).toBe('track-1');
    expect(result.title).toBe('Test Song');
    expect(result.trackNumber).toBe(3);
    expect(result.duration).toBe(240);
    expect(result.artistName).toBe('Test Artist');
    expect(result.albumName).toBe('Test Album');
    expect(result.playlistOrder).toBe(1);
    expect(result.rgTrackGain).toBe(-6.5);
    expect(result.outroStart).toBe(230);
    expect(result.bpm).toBe(120);
  });

  it('should use bpmOverride when provided', () => {
    const track = createTrack({ bpm: 120 });
    const result = mapPlaylistTrack(track, 128);

    expect(result.bpm).toBe(128);
  });

  it('should fall back to track.bpm when bpmOverride is null', () => {
    const track = createTrack({ bpm: 120 });
    const result = mapPlaylistTrack(track, null);

    expect(result.bpm).toBe(120);
  });

  it('should fall back to track.bpm when bpmOverride is undefined', () => {
    const track = createTrack({ bpm: 120 });
    const result = mapPlaylistTrack(track);

    expect(result.bpm).toBe(120);
  });

  it('should preserve size value when present', () => {
    const track = createTrack({ size: 10485760 });
    const result = mapPlaylistTrack(track);

    expect(result.size).toBe(10485760);
  });

  it('should handle null size without error', () => {
    const track = createTrack({ size: null });
    const result = mapPlaylistTrack(track);

    expect(result.size).toBe(0);
  });

  it('should handle undefined size without error', () => {
    const track = createTrack({ size: undefined });
    const result = mapPlaylistTrack(track);

    expect(result.size).toBe(0);
  });

  it('should default duration to 0 when null', () => {
    const track = createTrack({ duration: null });
    const result = mapPlaylistTrack(track);

    expect(result.duration).toBe(0);
  });
});
