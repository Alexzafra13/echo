import { PlaylistTrack } from './playlist-track.entity';

describe('PlaylistTrack Entity', () => {
  describe('create', () => {
    it('should create a playlist track with generated id', () => {
      const track = PlaylistTrack.create({
        playlistId: 'pl-1',
        trackId: 'track-1',
        trackOrder: 0,
      });

      expect(track.id).toBeDefined();
      expect(track.playlistId).toBe('pl-1');
      expect(track.trackId).toBe('track-1');
      expect(track.trackOrder).toBe(0);
      expect(track.createdAt).toBeInstanceOf(Date);
    });

    it('should generate unique ids', () => {
      const t1 = PlaylistTrack.create({ playlistId: 'pl-1', trackId: 'track-1', trackOrder: 0 });
      const t2 = PlaylistTrack.create({ playlistId: 'pl-1', trackId: 'track-2', trackOrder: 1 });
      expect(t1.id).not.toBe(t2.id);
    });
  });

  describe('fromPrimitives', () => {
    it('should reconstruct from primitives', () => {
      const now = new Date();
      const track = PlaylistTrack.fromPrimitives({
        id: 'pt-1',
        playlistId: 'pl-1',
        trackId: 'track-1',
        trackOrder: 5,
        createdAt: now,
      });

      expect(track.id).toBe('pt-1');
      expect(track.trackOrder).toBe(5);
    });
  });

  describe('updateOrder', () => {
    it('should change the track order', () => {
      const track = PlaylistTrack.create({
        playlistId: 'pl-1',
        trackId: 'track-1',
        trackOrder: 0,
      });

      track.updateOrder(3);
      expect(track.trackOrder).toBe(3);
    });
  });

  describe('toPrimitives', () => {
    it('should return all properties', () => {
      const track = PlaylistTrack.create({
        playlistId: 'pl-1',
        trackId: 'track-1',
        trackOrder: 0,
      });
      const primitives = track.toPrimitives();

      expect(primitives.id).toBe(track.id);
      expect(primitives.playlistId).toBe('pl-1');
      expect(primitives.trackId).toBe('track-1');
      expect(primitives.trackOrder).toBe(0);
    });
  });
});
