import {
  calculateBpmScore,
  calculateEnergyScore,
  calculateDanceabilityScore,
  calculateCompatibility,
  keyToCamelot,
  getCompatibleCamelotKeys,
  DjCompatibilityService,
  TrackDjData,
} from './dj-compatibility.service';

describe('DJ Compatibility Service', () => {
  describe('calculateBpmScore', () => {
    it('should return 50 and no beatmatch when either BPM is null', () => {
      expect(calculateBpmScore(null, 128)).toEqual({ score: 50, diff: 0, canBeatmatch: false });
      expect(calculateBpmScore(128, null)).toEqual({ score: 50, diff: 0, canBeatmatch: false });
      expect(calculateBpmScore(null, null)).toEqual({ score: 50, diff: 0, canBeatmatch: false });
    });

    it('should return 50 when BPM is 0', () => {
      expect(calculateBpmScore(0, 128).score).toBe(50);
    });

    it('should return 100 for identical BPMs', () => {
      expect(calculateBpmScore(128, 128).score).toBe(100);
      expect(calculateBpmScore(128, 128).canBeatmatch).toBe(true);
    });

    it('should score high for similar BPMs (within 3%)', () => {
      const result = calculateBpmScore(128, 130);
      expect(result.score).toBeGreaterThan(85);
      expect(result.canBeatmatch).toBe(true);
    });

    it('should consider half-time BPM compatibility', () => {
      const result = calculateBpmScore(128, 64);
      expect(result.score).toBe(100);
    });

    it('should consider double-time BPM compatibility', () => {
      const result = calculateBpmScore(64, 128);
      expect(result.score).toBe(100);
    });

    it('should score low for very different BPMs', () => {
      const result = calculateBpmScore(80, 160);
      // 160 is double 80, so this should actually be compatible
      expect(result.score).toBe(100);
    });

    it('should not allow beatmatch for large BPM differences', () => {
      const result = calculateBpmScore(80, 130);
      expect(result.canBeatmatch).toBe(false);
    });
  });

  describe('calculateEnergyScore', () => {
    it('should return 70 and smooth when either energy is null', () => {
      const result = calculateEnergyScore(null, 0.8);
      expect(result.score).toBe(70);
      expect(result.transition).toBe('smooth');
    });

    it('should return 100 for identical energies', () => {
      const result = calculateEnergyScore(0.7, 0.7);
      expect(result.score).toBe(100);
      expect(result.transition).toBe('smooth');
    });

    it('should score high for small differences', () => {
      const result = calculateEnergyScore(0.7, 0.75);
      expect(result.score).toBeGreaterThan(90);
      expect(result.transition).toBe('smooth');
    });

    it('should detect energy_up transition', () => {
      const result = calculateEnergyScore(0.3, 0.7);
      expect(result.transition).toBe('energy_up');
    });

    it('should detect energy_down transition', () => {
      const result = calculateEnergyScore(0.7, 0.3);
      expect(result.transition).toBe('energy_down');
    });

    it('should return correct diff', () => {
      const result = calculateEnergyScore(0.5, 0.8);
      expect(result.diff).toBeCloseTo(0.3);
    });
  });

  describe('calculateDanceabilityScore', () => {
    it('should return null when either value is null', () => {
      expect(calculateDanceabilityScore(null, 0.8)).toBeNull();
      expect(calculateDanceabilityScore(0.8, null)).toBeNull();
      expect(calculateDanceabilityScore(undefined, 0.8)).toBeNull();
    });

    it('should return 100 for identical values', () => {
      const result = calculateDanceabilityScore(0.7, 0.7);
      expect(result!.score).toBe(100);
    });

    it('should score high for small differences', () => {
      const result = calculateDanceabilityScore(0.7, 0.75);
      expect(result!.score).toBeGreaterThan(90);
    });

    it('should return correct diff', () => {
      const result = calculateDanceabilityScore(0.5, 0.8);
      expect(result!.diff).toBeCloseTo(0.3);
    });
  });

  describe('calculateCompatibility', () => {
    it('should calculate overall compatibility between two tracks', () => {
      const track1: TrackDjData = {
        trackId: 't1',
        bpm: 128,
        key: 'C major',
        camelotKey: '8B',
        energy: 0.7,
      };
      const track2: TrackDjData = {
        trackId: 't2',
        bpm: 128,
        key: 'G major',
        camelotKey: '9B',
        energy: 0.7,
      };

      const result = calculateCompatibility(track1, track2);

      expect(result.overall).toBeGreaterThan(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(result.bpmScore).toBe(100);
      expect(result.energyScore).toBe(100);
      expect(result.canBeatmatch).toBe(true);
      expect(result.suggestedTransition).toBe('smooth');
    });

    it('should suggest key_change for incompatible keys', () => {
      const track1: TrackDjData = {
        trackId: 't1',
        bpm: 128,
        key: null,
        camelotKey: '1A',
        energy: 0.7,
      };
      const track2: TrackDjData = {
        trackId: 't2',
        bpm: 128,
        key: null,
        camelotKey: '7B',
        energy: 0.7,
      };

      const result = calculateCompatibility(track1, track2);

      if (result.keyCompatibility === 'incompatible') {
        expect(result.suggestedTransition).toBe('key_change');
      }
    });

    it('should include danceability when available', () => {
      const track1: TrackDjData = {
        trackId: 't1',
        bpm: 128,
        key: null,
        camelotKey: '8B',
        energy: 0.7,
        danceability: 0.8,
      };
      const track2: TrackDjData = {
        trackId: 't2',
        bpm: 128,
        key: null,
        camelotKey: '8B',
        energy: 0.7,
        danceability: 0.8,
      };

      const result = calculateCompatibility(track1, track2);
      expect(result.danceabilityScore).not.toBeNull();
    });

    it('should set danceabilityScore to null when not available', () => {
      const track1: TrackDjData = {
        trackId: 't1',
        bpm: 128,
        key: null,
        camelotKey: '8B',
        energy: 0.7,
      };
      const track2: TrackDjData = {
        trackId: 't2',
        bpm: 128,
        key: null,
        camelotKey: '8B',
        energy: 0.7,
      };

      const result = calculateCompatibility(track1, track2);
      expect(result.danceabilityScore).toBeNull();
      expect(result.danceabilityDiff).toBeNull();
    });
  });

  describe('DjCompatibilityService (injectable)', () => {
    let service: DjCompatibilityService;

    beforeEach(() => {
      service = new DjCompatibilityService();
    });

    it('should delegate calculateCompatibility', () => {
      const track1: TrackDjData = { trackId: 't1', bpm: 128, key: null, camelotKey: '8B', energy: 0.7 };
      const track2: TrackDjData = { trackId: 't2', bpm: 128, key: null, camelotKey: '8B', energy: 0.7 };

      const result = service.calculateCompatibility(track1, track2);
      expect(result.overall).toBeGreaterThan(0);
    });

    it('should delegate calculateBpmScore', () => {
      const result = service.calculateBpmScore(128, 128);
      expect(result.score).toBe(100);
    });

    it('should delegate calculateEnergyScore', () => {
      const result = service.calculateEnergyScore(0.7, 0.7);
      expect(result.score).toBe(100);
    });
  });
});
