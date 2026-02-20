import {
  CONTEXT_WEIGHTS,
  PlayContext,
} from './play-event.entity';

describe('PlayEvent Entity', () => {
  describe('CONTEXT_WEIGHTS', () => {
    const allContexts: PlayContext[] = [
      'direct',
      'search',
      'artist',
      'playlist',
      'album',
      'queue',
      'recommendation',
      'radio',
      'shuffle',
    ];

    it('should have a weight for every PlayContext value', () => {
      for (const context of allContexts) {
        expect(CONTEXT_WEIGHTS[context]).toBeDefined();
      }
    });

    it('should not have extra keys beyond the known PlayContext values', () => {
      const keys = Object.keys(CONTEXT_WEIGHTS);
      expect(keys).toHaveLength(allContexts.length);
      for (const key of keys) {
        expect(allContexts).toContain(key);
      }
    });

    it('should have all weights between 0 and 1 (inclusive)', () => {
      for (const [context, weight] of Object.entries(CONTEXT_WEIGHTS)) {
        expect(weight).toBeGreaterThanOrEqual(0);
        expect(weight).toBeLessThanOrEqual(1);
      }
    });

    it('should assign the highest weight to "direct"', () => {
      const maxWeight = Math.max(...Object.values(CONTEXT_WEIGHTS));
      expect(CONTEXT_WEIGHTS.direct).toBe(maxWeight);
      expect(CONTEXT_WEIGHTS.direct).toBe(1.0);
    });

    it('should assign the lowest weight to "shuffle"', () => {
      const minWeight = Math.min(...Object.values(CONTEXT_WEIGHTS));
      expect(CONTEXT_WEIGHTS.shuffle).toBe(minWeight);
      expect(CONTEXT_WEIGHTS.shuffle).toBe(0.2);
    });

    it('should have expected specific weight values', () => {
      expect(CONTEXT_WEIGHTS.direct).toBe(1.0);
      expect(CONTEXT_WEIGHTS.search).toBe(0.9);
      expect(CONTEXT_WEIGHTS.playlist).toBe(0.8);
      expect(CONTEXT_WEIGHTS.artist).toBe(0.75);
      expect(CONTEXT_WEIGHTS.queue).toBe(0.7);
      expect(CONTEXT_WEIGHTS.recommendation).toBe(0.7);
      expect(CONTEXT_WEIGHTS.album).toBe(0.6);
      expect(CONTEXT_WEIGHTS.radio).toBe(0.4);
      expect(CONTEXT_WEIGHTS.shuffle).toBe(0.2);
    });
  });
});
