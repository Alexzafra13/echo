import {
  calculateBpmScore,
  calculateKeyScore,
  calculateEnergyScore,
  calculateDanceabilityScore,
  calculateCompatibility,
  getCamelotColor,
  getCompatibleCamelotKeys,
  keyToCamelot,
  TrackDjData,
  DjCompatibilityService,
} from './dj-compatibility.service';

describe('DjCompatibilityService', () => {
  // ─── calculateBpmScore ─────────────────────────────────────────────

  describe('calculateBpmScore', () => {
    it('should return 100 for identical BPMs', () => {
      const result = calculateBpmScore(128, 128);
      expect(result.score).toBe(100);
      expect(result.canBeatmatch).toBe(true);
    });

    it('should return ~100 for near-identical BPMs (<0.5%)', () => {
      const result = calculateBpmScore(128, 128.5);
      expect(result.score).toBeGreaterThanOrEqual(95);
      expect(result.canBeatmatch).toBe(true);
    });

    it('should return 90-95 for small BPM difference (0.5-3%)', () => {
      // 3% of 128 = 3.84 → 128 ± 3.84
      const result = calculateBpmScore(128, 131);
      expect(result.score).toBeGreaterThanOrEqual(89);
      expect(result.score).toBeLessThanOrEqual(96);
      expect(result.canBeatmatch).toBe(true);
    });

    it('should return 70-90 for moderate BPM difference (3-6%)', () => {
      // 5% of 128 = 6.4 → 128 + 6.4 = 134.4
      const result = calculateBpmScore(128, 134);
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.score).toBeLessThanOrEqual(90);
      expect(result.canBeatmatch).toBe(true);
    });

    it('should return 40-70 for large BPM difference (6-10%)', () => {
      // 8% of 128 = 10.24 → 128 + 10 = 138
      const result = calculateBpmScore(128, 138);
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.score).toBeLessThanOrEqual(70);
    });

    it('should disable beatmatch beyond 8% difference', () => {
      // 9% of 128 = 11.52
      const result = calculateBpmScore(128, 140);
      expect(result.canBeatmatch).toBe(false);
    });

    it('should return 0-40 for very large BPM difference (>10%)', () => {
      const result = calculateBpmScore(128, 160);
      expect(result.score).toBeLessThanOrEqual(40);
      expect(result.canBeatmatch).toBe(false);
    });

    it('should consider double-time compatibility (128 ≈ 64)', () => {
      const result = calculateBpmScore(128, 64);
      expect(result.score).toBeGreaterThanOrEqual(95);
      expect(result.canBeatmatch).toBe(true);
    });

    it('should consider half-time compatibility (70 ≈ 140)', () => {
      const result = calculateBpmScore(70, 140);
      expect(result.score).toBeGreaterThanOrEqual(95);
      expect(result.canBeatmatch).toBe(true);
    });

    it('should return neutral score (50) when either BPM is null', () => {
      expect(calculateBpmScore(null, 128)).toEqual({ score: 50, diff: 0, canBeatmatch: false });
      expect(calculateBpmScore(128, null)).toEqual({ score: 50, diff: 0, canBeatmatch: false });
      expect(calculateBpmScore(null, null)).toEqual({ score: 50, diff: 0, canBeatmatch: false });
    });

    it('should return neutral score when either BPM is 0', () => {
      expect(calculateBpmScore(0, 128)).toEqual({ score: 50, diff: 0, canBeatmatch: false });
      expect(calculateBpmScore(128, 0)).toEqual({ score: 50, diff: 0, canBeatmatch: false });
    });

    it('should return the percentage difference', () => {
      const result = calculateBpmScore(100, 110);
      expect(result.diff).toBeCloseTo(10, 0); // 10% difference
    });
  });

  // ─── calculateKeyScore ─────────────────────────────────────────────

  describe('calculateKeyScore', () => {
    it('should return 100/perfect for same key', () => {
      const result = calculateKeyScore('8A', '8A');
      expect(result.score).toBe(100);
      expect(result.compatibility).toBe('perfect');
    });

    it('should return 90/energy_boost for adjacent same-letter', () => {
      const result = calculateKeyScore('8A', '9A');
      expect(result.score).toBe(90);
      expect(result.compatibility).toBe('energy_boost');
    });

    it('should return 85/compatible for relative major/minor', () => {
      const result = calculateKeyScore('8A', '8B');
      expect(result.score).toBe(85);
      expect(result.compatibility).toBe('compatible');
    });

    it('should delegate to calculateHarmonicScore', () => {
      // This just verifies delegation works, detailed tests are in camelot.util.spec.ts
      const result = calculateKeyScore(null, '8A');
      expect(result.score).toBe(50);
      expect(result.compatibility).toBe('compatible');
    });
  });

  // ─── calculateEnergyScore ──────────────────────────────────────────

  describe('calculateEnergyScore', () => {
    it('should return 100/smooth for identical energy', () => {
      const result = calculateEnergyScore(0.7, 0.7);
      expect(result.score).toBe(100);
      expect(result.transition).toBe('smooth');
    });

    it('should return 100/smooth for small difference (<=0.1)', () => {
      const result = calculateEnergyScore(0.5, 0.6);
      expect(result.score).toBe(100);
      expect(result.transition).toBe('smooth');
    });

    it('should return smooth transition for diff <= 0.15', () => {
      // Use 0.5 + 0.14 = 0.64 to avoid floating point edge case at exactly 0.15
      const result = calculateEnergyScore(0.5, 0.64);
      expect(result.transition).toBe('smooth');
    });

    it('should return energy_up for positive energy increase > 0.15', () => {
      const result = calculateEnergyScore(0.3, 0.6);
      expect(result.transition).toBe('energy_up');
    });

    it('should return energy_down for energy decrease > 0.15', () => {
      const result = calculateEnergyScore(0.8, 0.5);
      expect(result.transition).toBe('energy_down');
    });

    it('should score 80-90 for moderate difference (0.1-0.2)', () => {
      const result = calculateEnergyScore(0.5, 0.68);
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.score).toBeLessThanOrEqual(90);
    });

    it('should score 70-80 for notable difference (0.2-0.3)', () => {
      const result = calculateEnergyScore(0.3, 0.55);
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.score).toBeLessThanOrEqual(80);
    });

    it('should score >= 30 for extreme differences', () => {
      const result = calculateEnergyScore(0.0, 1.0);
      expect(result.score).toBeGreaterThanOrEqual(30);
    });

    it('should return neutral score (70) when either energy is null', () => {
      expect(calculateEnergyScore(null, 0.5)).toEqual({ score: 70, diff: 0, transition: 'smooth' });
      expect(calculateEnergyScore(0.5, null)).toEqual({ score: 70, diff: 0, transition: 'smooth' });
    });

    it('should return signed diff (positive = energy up)', () => {
      const up = calculateEnergyScore(0.3, 0.8);
      expect(up.diff).toBeGreaterThan(0);

      const down = calculateEnergyScore(0.8, 0.3);
      expect(down.diff).toBeLessThan(0);
    });
  });

  // ─── calculateDanceabilityScore ────────────────────────────────────

  describe('calculateDanceabilityScore', () => {
    it('should return null when either danceability is null/undefined', () => {
      expect(calculateDanceabilityScore(null, 0.5)).toBeNull();
      expect(calculateDanceabilityScore(0.5, null)).toBeNull();
      expect(calculateDanceabilityScore(undefined, 0.5)).toBeNull();
      expect(calculateDanceabilityScore(0.5, undefined)).toBeNull();
      expect(calculateDanceabilityScore(null, null)).toBeNull();
    });

    it('should return 100 for identical danceability', () => {
      const result = calculateDanceabilityScore(0.7, 0.7);
      expect(result!.score).toBe(100);
    });

    it('should return 100 for small difference (<=0.1)', () => {
      const result = calculateDanceabilityScore(0.5, 0.59);
      expect(result!.score).toBe(100);
    });

    it('should score >= 30 for extreme differences', () => {
      const result = calculateDanceabilityScore(0.0, 1.0);
      expect(result!.score).toBeGreaterThanOrEqual(30);
    });

    it('should return signed diff', () => {
      const result = calculateDanceabilityScore(0.3, 0.8);
      expect(result!.diff).toBeCloseTo(0.5, 2);
    });
  });

  // ─── calculateCompatibility (overall) ──────────────────────────────

  describe('calculateCompatibility', () => {
    const makeTrack = (overrides: Partial<TrackDjData> = {}): TrackDjData => ({
      trackId: 'track-1',
      bpm: 128,
      key: 'Am',
      camelotKey: '8A',
      energy: 0.7,
      ...overrides,
    });

    it('should return high overall score for identical tracks', () => {
      const track1 = makeTrack();
      const track2 = makeTrack({ trackId: 'track-2' });
      const result = calculateCompatibility(track1, track2);

      expect(result.overall).toBeGreaterThanOrEqual(90);
      expect(result.bpmScore).toBe(100);
      expect(result.keyScore).toBe(100);
      expect(result.energyScore).toBe(100);
      expect(result.canBeatmatch).toBe(true);
      expect(result.suggestedTransition).toBe('smooth');
    });

    it('should weight scores according to DJ_CONFIG', () => {
      // Config: key=0.45, tempo=0.35, energy=0.20
      const track1 = makeTrack({ bpm: 128, camelotKey: '8A', energy: 0.5 });
      const track2 = makeTrack({ trackId: 'track-2', bpm: 128, camelotKey: '8A', energy: 0.5 });
      const result = calculateCompatibility(track1, track2);

      // All scores should be 100, so overall = 100 * (0.45 + 0.35 + 0.20) = 100
      expect(result.overall).toBe(100);
    });

    it('should include danceability when available', () => {
      const track1 = makeTrack({ danceability: 0.8 });
      const track2 = makeTrack({ trackId: 'track-2', danceability: 0.8 });
      const result = calculateCompatibility(track1, track2);

      expect(result.danceabilityScore).toBe(100);
      expect(result.danceabilityDiff).toBe(0);
    });

    it('should set danceabilityScore to null when not available', () => {
      const track1 = makeTrack();
      const track2 = makeTrack({ trackId: 'track-2' });
      const result = calculateCompatibility(track1, track2);

      expect(result.danceabilityScore).toBeNull();
      expect(result.danceabilityDiff).toBeNull();
    });

    it('should suggest key_change for incompatible keys', () => {
      const track1 = makeTrack({ camelotKey: '8A' });
      const track2 = makeTrack({ trackId: 'track-2', camelotKey: '3A' });
      const result = calculateCompatibility(track1, track2);

      expect(result.keyCompatibility).toBe('incompatible');
      expect(result.suggestedTransition).toBe('key_change');
    });

    it('should suggest energy_up when energy increases significantly', () => {
      const track1 = makeTrack({ energy: 0.3 });
      const track2 = makeTrack({ trackId: 'track-2', energy: 0.8 });
      const result = calculateCompatibility(track1, track2);

      expect(result.suggestedTransition).toBe('energy_up');
    });

    it('should suggest energy_down when energy drops significantly', () => {
      const track1 = makeTrack({ energy: 0.9 });
      const track2 = makeTrack({ trackId: 'track-2', energy: 0.3 });
      const result = calculateCompatibility(track1, track2);

      expect(result.suggestedTransition).toBe('energy_down');
    });

    it('should round bpmDiff to 1 decimal', () => {
      const track1 = makeTrack({ bpm: 128 });
      const track2 = makeTrack({ trackId: 'track-2', bpm: 135 });
      const result = calculateCompatibility(track1, track2);

      expect(result.bpmDiff).toBe(Math.round(result.bpmDiff * 10) / 10);
    });

    it('should round energyDiff to 2 decimals', () => {
      const track1 = makeTrack({ energy: 0.333 });
      const track2 = makeTrack({ trackId: 'track-2', energy: 0.777 });
      const result = calculateCompatibility(track1, track2);

      expect(result.energyDiff).toBe(Math.round(result.energyDiff * 100) / 100);
    });

    it('should produce a valid overall score between 0 and 100', () => {
      // Worst case scenario
      const track1 = makeTrack({ bpm: 60, camelotKey: '1A', energy: 0.0 });
      const track2 = makeTrack({ trackId: 'track-2', bpm: 200, camelotKey: '7B', energy: 1.0 });
      const result = calculateCompatibility(track1, track2);

      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
    });
  });

  // ─── getCamelotColor ───────────────────────────────────────────────

  describe('getCamelotColor', () => {
    it('should return color info for valid Camelot keys', () => {
      const color = getCamelotColor('8A');
      expect(color).not.toBeNull();
      expect(color!.bg).toBeDefined();
      expect(color!.text).toBeDefined();
      expect(color!.name).toBeDefined();
    });

    it('should return null for null key', () => {
      expect(getCamelotColor(null)).toBeNull();
    });

    it('should return null for invalid key', () => {
      expect(getCamelotColor('invalid')).toBeNull();
    });

    it('should have different colors for different positions', () => {
      const color8A = getCamelotColor('8A');
      const color1B = getCamelotColor('1B');
      expect(color8A!.bg).not.toBe(color1B!.bg);
    });
  });

  // ─── getCompatibleCamelotKeys (delegation) ─────────────────────────

  describe('getCompatibleCamelotKeys', () => {
    it('should delegate to camelot util', () => {
      const result = getCompatibleCamelotKeys('8A');
      expect(result).toHaveLength(4);
      expect(result).toContain('8A');
    });
  });

  // ─── keyToCamelot (delegation) ─────────────────────────────────────

  describe('keyToCamelot', () => {
    it('should delegate to camelot util', () => {
      expect(keyToCamelot('Am')).toBe('8A');
      expect(keyToCamelot(null)).toBeNull();
    });
  });

  // ─── DjCompatibilityService (injectable wrapper) ───────────────────

  describe('DjCompatibilityService class', () => {
    let service: DjCompatibilityService;

    beforeEach(() => {
      service = new DjCompatibilityService();
    });

    it('should wrap calculateCompatibility', () => {
      const track1: TrackDjData = { trackId: '1', bpm: 128, key: 'Am', camelotKey: '8A', energy: 0.7 };
      const track2: TrackDjData = { trackId: '2', bpm: 128, key: 'Am', camelotKey: '8A', energy: 0.7 };
      const result = service.calculateCompatibility(track1, track2);
      expect(result.overall).toBeGreaterThanOrEqual(90);
    });

    it('should wrap calculateBpmScore', () => {
      const result = service.calculateBpmScore(128, 128);
      expect(result.score).toBe(100);
    });

    it('should wrap calculateKeyScore', () => {
      const result = service.calculateKeyScore('8A', '8A');
      expect(result.score).toBe(100);
    });

    it('should wrap calculateEnergyScore', () => {
      const result = service.calculateEnergyScore(0.5, 0.5);
      expect(result.score).toBe(100);
    });

    it('should wrap calculateDanceabilityScore', () => {
      const result = service.calculateDanceabilityScore(0.5, 0.5);
      expect(result!.score).toBe(100);
    });

    it('should wrap keyToCamelot', () => {
      expect(service.keyToCamelot('Am')).toBe('8A');
    });

    it('should wrap getCamelotColor', () => {
      expect(service.getCamelotColor('8A')).not.toBeNull();
    });

    it('should wrap getCompatibleCamelotKeys', () => {
      expect(service.getCompatibleCamelotKeys('8A')).toHaveLength(4);
    });
  });
});
