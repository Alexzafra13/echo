import { Track } from './track.entity';

describe('Track Entity', () => {
  const baseProps = {
    title: 'My Song',
    albumId: 'album-1',
    artistId: 'artist-1',
    trackNumber: 1,
    discNumber: 1,
    year: 2024,
    duration: 240,
    path: '/music/song.flac',
    bitRate: 320,
    size: 10485760,
    suffix: 'flac',
    compilation: false,
  };

  describe('create', () => {
    it('should create a track with generated id and timestamps', () => {
      const track = Track.create(baseProps);

      expect(track.id).toBeDefined();
      expect(track.title).toBe('My Song');
      expect(track.albumId).toBe('album-1');
      expect(track.artistId).toBe('artist-1');
      expect(track.trackNumber).toBe(1);
      expect(track.discNumber).toBe(1);
      expect(track.year).toBe(2024);
      expect(track.duration).toBe(240);
      expect(track.path).toBe('/music/song.flac');
      expect(track.bitRate).toBe(320);
      expect(track.suffix).toBe('flac');
      expect(track.compilation).toBe(false);
      expect(track.createdAt).toBeInstanceOf(Date);
      expect(track.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate unique ids', () => {
      const t1 = Track.create(baseProps);
      const t2 = Track.create(baseProps);
      expect(t1.id).not.toBe(t2.id);
    });

    it('should handle optional fields', () => {
      const track = Track.create({
        title: 'Minimal',
        discNumber: 1,
        path: '/music/minimal.mp3',
        compilation: false,
      });

      expect(track.albumId).toBeUndefined();
      expect(track.artistId).toBeUndefined();
      expect(track.trackNumber).toBeUndefined();
      expect(track.lyrics).toBeUndefined();
      expect(track.bpm).toBeUndefined();
      expect(track.rgTrackGain).toBeUndefined();
    });
  });

  describe('reconstruct', () => {
    it('should reconstruct from full props', () => {
      const now = new Date();
      const track = Track.reconstruct({
        id: 'track-123',
        ...baseProps,
        createdAt: now,
        updatedAt: now,
      });

      expect(track.id).toBe('track-123');
      expect(track.title).toBe('My Song');
    });
  });

  describe('isMissing', () => {
    it('should return false when missingAt is undefined', () => {
      const track = Track.create(baseProps);
      expect(track.isMissing).toBe(false);
    });

    it('should return true when missingAt is set', () => {
      const track = Track.reconstruct({
        id: 'track-1',
        ...baseProps,
        missingAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      expect(track.isMissing).toBe(true);
    });
  });

  describe('toPrimitives', () => {
    it('should return all properties', () => {
      const track = Track.create(baseProps);
      const primitives = track.toPrimitives();

      expect(primitives.id).toBe(track.id);
      expect(primitives.title).toBe('My Song');
      expect(primitives.path).toBe('/music/song.flac');
    });

    it('should convert BigInt size to number', () => {
      const track = Track.reconstruct({
        id: 'track-1',
        ...baseProps,
        size: BigInt(10485760) as unknown as number,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const primitives = track.toPrimitives();
      expect(typeof primitives.size).toBe('number');
      expect(primitives.size).toBe(10485760);
    });

    it('should handle undefined size', () => {
      const track = Track.create({
        title: 'No Size',
        discNumber: 1,
        path: '/music/nosize.mp3',
        compilation: false,
      });
      const primitives = track.toPrimitives();
      expect(primitives.size).toBeUndefined();
    });
  });

  describe('ReplayGain fields', () => {
    it('should store and retrieve ReplayGain data', () => {
      const track = Track.reconstruct({
        id: 'track-rg',
        ...baseProps,
        rgTrackGain: -6.5,
        rgTrackPeak: 0.95,
        rgAlbumGain: -7.0,
        rgAlbumPeak: 0.98,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(track.rgTrackGain).toBe(-6.5);
      expect(track.rgTrackPeak).toBe(0.95);
      expect(track.rgAlbumGain).toBe(-7.0);
      expect(track.rgAlbumPeak).toBe(0.98);
    });
  });

  describe('DJ fields', () => {
    it('should store outroStart and bpm', () => {
      const track = Track.reconstruct({
        id: 'track-dj',
        ...baseProps,
        outroStart: 220.5,
        bpm: 128,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(track.outroStart).toBe(220.5);
      expect(track.bpm).toBe(128);
    });
  });
});
