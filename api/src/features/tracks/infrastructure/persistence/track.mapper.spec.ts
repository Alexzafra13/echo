import { TrackMapper } from './track.mapper';
import { Track } from '../../domain/entities/track.entity';

describe('TrackMapper', () => {
  const mockDbTrack = {
    id: 'track-1',
    title: 'Paranoid Android',
    albumId: 'album-1',
    artistId: 'artist-1',
    albumArtistId: 'artist-1',
    trackNumber: 2,
    discNumber: 1,
    year: 1997,
    duration: 383,
    path: '/music/paranoid.flac',
    bitRate: 320,
    size: BigInt(15000000),
    suffix: 'flac',
    lyrics: 'Please could you stop the noise',
    comment: null,
    albumName: 'OK Computer',
    artistName: 'Radiohead',
    albumArtistName: 'Radiohead',
    compilation: false,
    rgTrackGain: -6.5,
    rgTrackPeak: 0.95,
    rgAlbumGain: -7.0,
    rgAlbumPeak: 0.98,
    outroStart: 370.0,
    bpm: 82,
    missingAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-15'),
  };

  describe('toDomain', () => {
    it('should convert DB track to domain Track', () => {
      const track = TrackMapper.toDomain(mockDbTrack as any);

      expect(track).toBeInstanceOf(Track);
      expect(track.id).toBe('track-1');
      expect(track.title).toBe('Paranoid Android');
      expect(track.albumId).toBe('album-1');
      expect(track.artistId).toBe('artist-1');
      expect(track.trackNumber).toBe(2);
      expect(track.discNumber).toBe(1);
      expect(track.duration).toBe(383);
      expect(track.path).toBe('/music/paranoid.flac');
      expect(track.suffix).toBe('flac');
      expect(track.compilation).toBe(false);
    });

    it('should convert BigInt size to number', () => {
      const track = TrackMapper.toDomain(mockDbTrack as any);
      expect(track.size).toBe(15000000);
    });

    it('should handle null optional fields', () => {
      const track = TrackMapper.toDomain({
        ...mockDbTrack,
        albumId: null,
        artistId: null,
        trackNumber: null,
        year: null,
        duration: null,
        bitRate: null,
        size: null,
        suffix: null,
        lyrics: null,
        albumName: null,
        artistName: null,
        rgTrackGain: null,
        rgTrackPeak: null,
        outroStart: null,
        bpm: null,
      } as any);

      expect(track.albumId).toBeUndefined();
      expect(track.artistId).toBeUndefined();
      expect(track.trackNumber).toBeUndefined();
      expect(track.year).toBeUndefined();
      expect(track.duration).toBeUndefined();
      expect(track.size).toBeUndefined();
      expect(track.lyrics).toBeUndefined();
      expect(track.rgTrackGain).toBeUndefined();
      expect(track.bpm).toBeUndefined();
    });

    it('should map ReplayGain fields', () => {
      const track = TrackMapper.toDomain(mockDbTrack as any);
      expect(track.rgTrackGain).toBe(-6.5);
      expect(track.rgTrackPeak).toBe(0.95);
      expect(track.rgAlbumGain).toBe(-7.0);
      expect(track.rgAlbumPeak).toBe(0.98);
    });

    it('should map DJ fields', () => {
      const track = TrackMapper.toDomain(mockDbTrack as any);
      expect(track.outroStart).toBe(370.0);
      expect(track.bpm).toBe(82);
    });

    it('should default discNumber to 1 when null', () => {
      const track = TrackMapper.toDomain({
        ...mockDbTrack,
        discNumber: null,
      } as any);
      expect(track.discNumber).toBe(1);
    });

    it('should default compilation to false when null', () => {
      const track = TrackMapper.toDomain({
        ...mockDbTrack,
        compilation: null,
      } as any);
      expect(track.compilation).toBe(false);
    });
  });

  describe('toPersistence', () => {
    it('should convert domain track to persistence', () => {
      const track = TrackMapper.toDomain(mockDbTrack as any);
      const persistence = TrackMapper.toPersistence(track);

      expect(persistence.id).toBe('track-1');
      expect(persistence.title).toBe('Paranoid Android');
      expect(persistence.path).toBe('/music/paranoid.flac');
      expect(persistence.discNumber).toBe(1);
      expect(persistence.compilation).toBe(false);
    });

    it('should convert undefined to null', () => {
      const track = TrackMapper.toDomain({
        ...mockDbTrack,
        albumId: null,
        artistId: null,
        lyrics: null,
      } as any);
      const persistence = TrackMapper.toPersistence(track);

      expect(persistence.albumId).toBeNull();
      expect(persistence.artistId).toBeNull();
      expect(persistence.lyrics).toBeNull();
    });
  });

  describe('toDomainArray', () => {
    it('should convert array of DB tracks', () => {
      const tracks = TrackMapper.toDomainArray([mockDbTrack, mockDbTrack] as any);
      expect(tracks).toHaveLength(2);
      expect(tracks[0]).toBeInstanceOf(Track);
    });

    it('should handle empty array', () => {
      expect(TrackMapper.toDomainArray([])).toEqual([]);
    });
  });
});
