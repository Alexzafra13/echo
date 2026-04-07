import { PlayTrackingMapper } from './play-tracking.mapper';
import { PlayHistory } from '@infrastructure/database/schema/play-stats';

describe('PlayTrackingMapper', () => {
  const mockDbPlayHistory = {
    id: 'play-1',
    userId: 'user-1',
    trackId: 'track-1',
    playedAt: new Date('2024-06-15T10:00:00Z'),
    client: 'web',
    playContext: 'playlist',
    completionRate: 0.85,
    skipped: false,
    sourceId: 'pl-1',
    sourceType: 'playlist',
    createdAt: new Date('2024-06-15T10:00:00Z'),
  };

  describe('toPlayEventDomain', () => {
    it('should convert DB play history to domain PlayEvent', () => {
      const event = PlayTrackingMapper.toPlayEventDomain(
        mockDbPlayHistory as unknown as PlayHistory
      );

      expect(event.id).toBe('play-1');
      expect(event.userId).toBe('user-1');
      expect(event.trackId).toBe('track-1');
      expect(event.playedAt).toEqual(new Date('2024-06-15T10:00:00Z'));
      expect(event.client).toBe('web');
      expect(event.playContext).toBe('playlist');
      expect(event.completionRate).toBe(0.85);
      expect(event.skipped).toBe(false);
      expect(event.sourceId).toBe('pl-1');
      expect(event.sourceType).toBe('playlist');
    });

    it('should handle null optional fields', () => {
      const event = PlayTrackingMapper.toPlayEventDomain({
        ...mockDbPlayHistory,
        client: null,
        completionRate: null,
        sourceId: null,
        sourceType: null,
      } as unknown as PlayHistory);

      expect(event.client).toBeUndefined();
      expect(event.completionRate).toBeUndefined();
      expect(event.sourceId).toBeUndefined();
      // sourceType uses `as` cast, so null stays null
      expect(event.sourceType).toBeFalsy();
    });
  });

  describe('toPlayEventDomainArray', () => {
    it('should convert array of play histories', () => {
      const events = PlayTrackingMapper.toPlayEventDomainArray([
        mockDbPlayHistory,
        mockDbPlayHistory,
      ] as unknown as PlayHistory[]);

      expect(events).toHaveLength(2);
      expect(events[0].id).toBe('play-1');
    });

    it('should handle empty array', () => {
      expect(PlayTrackingMapper.toPlayEventDomainArray([])).toEqual([]);
    });
  });
});
