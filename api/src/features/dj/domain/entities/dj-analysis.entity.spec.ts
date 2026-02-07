import { DjAnalysis, DjAnalysisProps } from './dj-analysis.entity';

describe('DjAnalysis Entity', () => {
  const basePendingProps = {
    trackId: 'track-123',
    status: 'pending' as const,
  };

  const baseCompletedProps = {
    trackId: 'track-123',
    status: 'completed' as const,
    bpm: 128,
    key: 'Am',
    camelotKey: '8A',
    energy: 0.75,
    danceability: 0.65,
    analyzedAt: new Date(),
  };

  // ─── create ────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a pending analysis with generated id and timestamps', () => {
      const analysis = DjAnalysis.create(basePendingProps);

      expect(analysis.id).toBeDefined();
      expect(analysis.id.length).toBeGreaterThan(0);
      expect(analysis.trackId).toBe('track-123');
      expect(analysis.status).toBe('pending');
      expect(analysis.createdAt).toBeInstanceOf(Date);
      expect(analysis.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a completed analysis with all fields', () => {
      const analysis = DjAnalysis.create(baseCompletedProps);

      expect(analysis.bpm).toBe(128);
      expect(analysis.key).toBe('Am');
      expect(analysis.camelotKey).toBe('8A');
      expect(analysis.energy).toBe(0.75);
      expect(analysis.danceability).toBe(0.65);
      expect(analysis.status).toBe('completed');
    });

    it('should generate unique IDs', () => {
      const a1 = DjAnalysis.create(basePendingProps);
      const a2 = DjAnalysis.create(basePendingProps);
      expect(a1.id).not.toBe(a2.id);
    });

    it('should throw for invalid BPM (below 30)', () => {
      expect(() => DjAnalysis.create({ ...basePendingProps, bpm: 20 })).toThrow('Invalid BPM');
    });

    it('should throw for invalid BPM (above 300)', () => {
      expect(() => DjAnalysis.create({ ...basePendingProps, bpm: 350 })).toThrow('Invalid BPM');
    });

    it('should throw for invalid energy (below 0)', () => {
      expect(() => DjAnalysis.create({ ...basePendingProps, energy: -0.1 })).toThrow('Invalid energy');
    });

    it('should throw for invalid energy (above 1)', () => {
      expect(() => DjAnalysis.create({ ...basePendingProps, energy: 1.5 })).toThrow('Invalid energy');
    });

    it('should accept boundary BPM values', () => {
      expect(() => DjAnalysis.create({ ...basePendingProps, bpm: 30 })).not.toThrow();
      expect(() => DjAnalysis.create({ ...basePendingProps, bpm: 300 })).not.toThrow();
    });

    it('should accept boundary energy values', () => {
      expect(() => DjAnalysis.create({ ...basePendingProps, energy: 0 })).not.toThrow();
      expect(() => DjAnalysis.create({ ...basePendingProps, energy: 1 })).not.toThrow();
    });

    it('should allow undefined BPM and energy (pending analysis)', () => {
      const analysis = DjAnalysis.create(basePendingProps);
      expect(analysis.bpm).toBeUndefined();
      expect(analysis.energy).toBeUndefined();
    });
  });

  // ─── validate ──────────────────────────────────────────────────────

  describe('validate', () => {
    it('should return empty array for valid data', () => {
      const errors = DjAnalysis.validate({ bpm: 128, energy: 0.7, danceability: 0.5 });
      expect(errors).toEqual([]);
    });

    it('should return error for invalid BPM', () => {
      const errors = DjAnalysis.validate({ bpm: 10 });
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('bpm');
    });

    it('should return error for invalid energy', () => {
      const errors = DjAnalysis.validate({ energy: 2 });
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('energy');
    });

    it('should return error for invalid danceability', () => {
      const errors = DjAnalysis.validate({ danceability: -1 });
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('danceability');
    });

    it('should return multiple errors for multiple invalid fields', () => {
      const errors = DjAnalysis.validate({ bpm: 0, energy: 5, danceability: -1 });
      expect(errors).toHaveLength(3);
    });

    it('should skip validation for undefined fields', () => {
      const errors = DjAnalysis.validate({});
      expect(errors).toEqual([]);
    });
  });

  // ─── fromPrimitives ────────────────────────────────────────────────

  describe('fromPrimitives', () => {
    it('should reconstruct an entity from raw props', () => {
      const now = new Date();
      const props: DjAnalysisProps = {
        id: 'test-id',
        trackId: 'track-123',
        bpm: 140,
        key: 'Cm',
        camelotKey: '5A',
        energy: 0.9,
        danceability: 0.8,
        status: 'completed',
        analyzedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      const analysis = DjAnalysis.fromPrimitives(props);
      expect(analysis.id).toBe('test-id');
      expect(analysis.bpm).toBe(140);
      expect(analysis.camelotKey).toBe('5A');
    });
  });

  // ─── Status helpers ────────────────────────────────────────────────

  describe('status helpers', () => {
    it('should identify pending status', () => {
      const analysis = DjAnalysis.create({ ...basePendingProps, status: 'pending' });
      expect(analysis.isPending()).toBe(true);
      expect(analysis.isAnalyzing()).toBe(false);
      expect(analysis.isAnalyzed()).toBe(false);
      expect(analysis.isFailed()).toBe(false);
    });

    it('should identify analyzing status', () => {
      const analysis = DjAnalysis.create({ ...basePendingProps, status: 'analyzing' });
      expect(analysis.isPending()).toBe(false);
      expect(analysis.isAnalyzing()).toBe(true);
      expect(analysis.isAnalyzed()).toBe(false);
      expect(analysis.isFailed()).toBe(false);
    });

    it('should identify completed status', () => {
      const analysis = DjAnalysis.create(baseCompletedProps);
      expect(analysis.isPending()).toBe(false);
      expect(analysis.isAnalyzing()).toBe(false);
      expect(analysis.isAnalyzed()).toBe(true);
      expect(analysis.isFailed()).toBe(false);
    });

    it('should identify failed status', () => {
      const analysis = DjAnalysis.create({ ...basePendingProps, status: 'failed', analysisError: 'timeout' });
      expect(analysis.isPending()).toBe(false);
      expect(analysis.isAnalyzing()).toBe(false);
      expect(analysis.isAnalyzed()).toBe(false);
      expect(analysis.isFailed()).toBe(true);
    });
  });

  // ─── Business logic ────────────────────────────────────────────────

  describe('isHarmonicallyCompatibleWith', () => {
    it('should return true for compatible Camelot keys', () => {
      const a1 = DjAnalysis.create({ ...baseCompletedProps, camelotKey: '8A' });
      const a2 = DjAnalysis.create({ ...baseCompletedProps, trackId: 'track-2', camelotKey: '9A' });
      expect(a1.isHarmonicallyCompatibleWith(a2)).toBe(true);
    });

    it('should return true for relative major/minor', () => {
      const a1 = DjAnalysis.create({ ...baseCompletedProps, camelotKey: '8A' });
      const a2 = DjAnalysis.create({ ...baseCompletedProps, trackId: 'track-2', camelotKey: '8B' });
      expect(a1.isHarmonicallyCompatibleWith(a2)).toBe(true);
    });

    it('should return false for incompatible keys', () => {
      const a1 = DjAnalysis.create({ ...baseCompletedProps, camelotKey: '8A' });
      const a2 = DjAnalysis.create({ ...baseCompletedProps, trackId: 'track-2', camelotKey: '3A' });
      expect(a1.isHarmonicallyCompatibleWith(a2)).toBe(false);
    });

    it('should return false when camelotKey is missing', () => {
      const a1 = DjAnalysis.create({ ...basePendingProps });
      const a2 = DjAnalysis.create({ ...baseCompletedProps, trackId: 'track-2' });
      expect(a1.isHarmonicallyCompatibleWith(a2)).toBe(false);
    });
  });

  describe('isBpmCompatibleWith', () => {
    it('should return true for BPMs within tolerance (6% default)', () => {
      const a1 = DjAnalysis.create({ ...baseCompletedProps, bpm: 128 });
      const a2 = DjAnalysis.create({ ...baseCompletedProps, trackId: 'track-2', bpm: 134 }); // ~4.7%
      expect(a1.isBpmCompatibleWith(a2)).toBe(true);
    });

    it('should return false for BPMs beyond tolerance', () => {
      const a1 = DjAnalysis.create({ ...baseCompletedProps, bpm: 128 });
      const a2 = DjAnalysis.create({ ...baseCompletedProps, trackId: 'track-2', bpm: 150 }); // ~17%
      expect(a1.isBpmCompatibleWith(a2)).toBe(false);
    });

    it('should accept custom tolerance', () => {
      const a1 = DjAnalysis.create({ ...baseCompletedProps, bpm: 128 });
      const a2 = DjAnalysis.create({ ...baseCompletedProps, trackId: 'track-2', bpm: 140 }); // ~9.4%
      expect(a1.isBpmCompatibleWith(a2, 10)).toBe(true);
      expect(a1.isBpmCompatibleWith(a2, 5)).toBe(false);
    });

    it('should return false when BPM is missing', () => {
      const a1 = DjAnalysis.create(basePendingProps);
      const a2 = DjAnalysis.create({ ...baseCompletedProps, trackId: 'track-2' });
      expect(a1.isBpmCompatibleWith(a2)).toBe(false);
    });
  });

  describe('getBpmAdjustmentTo', () => {
    it('should calculate percentage adjustment needed', () => {
      const analysis = DjAnalysis.create({ ...baseCompletedProps, bpm: 100 });
      expect(analysis.getBpmAdjustmentTo(110)).toBeCloseTo(10, 1); // +10%
      expect(analysis.getBpmAdjustmentTo(90)).toBeCloseTo(-10, 1); // -10%
    });

    it('should return 0 for same BPM', () => {
      const analysis = DjAnalysis.create({ ...baseCompletedProps, bpm: 128 });
      expect(analysis.getBpmAdjustmentTo(128)).toBe(0);
    });

    it('should return 0 when BPM is missing', () => {
      const analysis = DjAnalysis.create(basePendingProps);
      expect(analysis.getBpmAdjustmentTo(128)).toBe(0);
    });
  });

  describe('getHarmonicScore', () => {
    it('should return 100 for same key', () => {
      const a1 = DjAnalysis.create({ ...baseCompletedProps, camelotKey: '8A' });
      const a2 = DjAnalysis.create({ ...baseCompletedProps, trackId: 'track-2', camelotKey: '8A' });
      expect(a1.getHarmonicScore(a2)).toBe(100);
    });

    it('should return 0 when either key is missing', () => {
      const a1 = DjAnalysis.create(basePendingProps);
      const a2 = DjAnalysis.create({ ...baseCompletedProps, trackId: 'track-2' });
      expect(a1.getHarmonicScore(a2)).toBe(0);
    });
  });

  // ─── keyToCamelot (static) ─────────────────────────────────────────

  describe('keyToCamelot (static)', () => {
    it('should convert musical key to Camelot notation', () => {
      expect(DjAnalysis.keyToCamelot('Am')).toBe('8A');
      expect(DjAnalysis.keyToCamelot('C')).toBe('8B');
    });

    it('should return undefined for invalid key', () => {
      expect(DjAnalysis.keyToCamelot('Unknown')).toBeUndefined();
      expect(DjAnalysis.keyToCamelot('invalid')).toBeUndefined();
    });
  });

  // ─── toPrimitives ──────────────────────────────────────────────────

  describe('toPrimitives', () => {
    it('should serialize all fields', () => {
      const analysis = DjAnalysis.create(baseCompletedProps);
      const primitives = analysis.toPrimitives();

      expect(primitives.id).toBe(analysis.id);
      expect(primitives.trackId).toBe(analysis.trackId);
      expect(primitives.bpm).toBe(128);
      expect(primitives.key).toBe('Am');
      expect(primitives.camelotKey).toBe('8A');
      expect(primitives.energy).toBe(0.75);
      expect(primitives.danceability).toBe(0.65);
      expect(primitives.status).toBe('completed');
      expect(primitives.createdAt).toBeInstanceOf(Date);
      expect(primitives.updatedAt).toBeInstanceOf(Date);
    });

    it('should serialize undefined fields as undefined', () => {
      const analysis = DjAnalysis.create(basePendingProps);
      const primitives = analysis.toPrimitives();

      expect(primitives.bpm).toBeUndefined();
      expect(primitives.key).toBeUndefined();
      expect(primitives.energy).toBeUndefined();
      expect(primitives.analysisError).toBeUndefined();
    });
  });
});
