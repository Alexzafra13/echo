import {
  keyToCamelot,
  camelotToKey,
  parseCamelot,
  formatCamelot,
  getCompatibleCamelotKeys,
  areKeysCompatible,
  getCamelotDistance,
  calculateHarmonicScore,
  getSimpleHarmonicScore,
  isValidBpm,
  isValidEnergy,
  isValidCamelotKey,
  CamelotParsed,
} from './camelot.util';

describe('CamelotUtil', () => {
  // ─── keyToCamelot ──────────────────────────────────────────────────

  describe('keyToCamelot', () => {
    it('should convert minor keys to A column', () => {
      expect(keyToCamelot('Am')).toBe('8A');
      expect(keyToCamelot('Cm')).toBe('5A');
      expect(keyToCamelot('Dm')).toBe('7A');
      expect(keyToCamelot('Em')).toBe('9A');
      expect(keyToCamelot('Fm')).toBe('4A');
      expect(keyToCamelot('Gm')).toBe('6A');
      expect(keyToCamelot('Bm')).toBe('10A');
    });

    it('should convert major keys to B column', () => {
      expect(keyToCamelot('C')).toBe('8B');
      expect(keyToCamelot('D')).toBe('10B');
      expect(keyToCamelot('E')).toBe('12B');
      expect(keyToCamelot('F')).toBe('7B');
      expect(keyToCamelot('G')).toBe('9B');
      expect(keyToCamelot('A')).toBe('11B');
      expect(keyToCamelot('B')).toBe('1B');
    });

    it('should handle enharmonic equivalents (sharps)', () => {
      expect(keyToCamelot('G#m')).toBe('1A');
      expect(keyToCamelot('D#m')).toBe('2A');
      expect(keyToCamelot('A#m')).toBe('3A');
      expect(keyToCamelot('F#m')).toBe('11A');
      expect(keyToCamelot('C#m')).toBe('12A');
      expect(keyToCamelot('F#')).toBe('2B');
      expect(keyToCamelot('C#')).toBe('3B');
      expect(keyToCamelot('G#')).toBe('4B');
      expect(keyToCamelot('D#')).toBe('5B');
      expect(keyToCamelot('A#')).toBe('6B');
    });

    it('should handle enharmonic equivalents (flats)', () => {
      expect(keyToCamelot('Abm')).toBe('1A');
      expect(keyToCamelot('Ebm')).toBe('2A');
      expect(keyToCamelot('Bbm')).toBe('3A');
      expect(keyToCamelot('Gbm')).toBe('11A');
      expect(keyToCamelot('Dbm')).toBe('12A');
      expect(keyToCamelot('Gb')).toBe('2B');
      expect(keyToCamelot('Db')).toBe('3B');
      expect(keyToCamelot('Ab')).toBe('4B');
      expect(keyToCamelot('Eb')).toBe('5B');
      expect(keyToCamelot('Bb')).toBe('6B');
      expect(keyToCamelot('Cb')).toBe('1B');
    });

    it('should return null for null/undefined/Unknown', () => {
      expect(keyToCamelot(null)).toBeNull();
      expect(keyToCamelot(undefined)).toBeNull();
      expect(keyToCamelot('Unknown')).toBeNull();
    });

    it('should return null for invalid keys', () => {
      expect(keyToCamelot('')).toBeNull();
      expect(keyToCamelot('X')).toBeNull();
      expect(keyToCamelot('Hm')).toBeNull();
      expect(keyToCamelot('Z#')).toBeNull();
    });

    it('should ensure enharmonic equivalents map to the same Camelot key', () => {
      expect(keyToCamelot('G#m')).toBe(keyToCamelot('Abm'));
      expect(keyToCamelot('D#m')).toBe(keyToCamelot('Ebm'));
      expect(keyToCamelot('F#')).toBe(keyToCamelot('Gb'));
      expect(keyToCamelot('C#')).toBe(keyToCamelot('Db'));
    });
  });

  // ─── camelotToKey ──────────────────────────────────────────────────

  describe('camelotToKey', () => {
    it('should convert all A column (minor) positions', () => {
      expect(camelotToKey('1A')).toBe('Abm');
      expect(camelotToKey('2A')).toBe('Ebm');
      expect(camelotToKey('3A')).toBe('Bbm');
      expect(camelotToKey('4A')).toBe('Fm');
      expect(camelotToKey('5A')).toBe('Cm');
      expect(camelotToKey('6A')).toBe('Gm');
      expect(camelotToKey('7A')).toBe('Dm');
      expect(camelotToKey('8A')).toBe('Am');
      expect(camelotToKey('9A')).toBe('Em');
      expect(camelotToKey('10A')).toBe('Bm');
      expect(camelotToKey('11A')).toBe('F#m');
      expect(camelotToKey('12A')).toBe('C#m');
    });

    it('should convert all B column (major) positions', () => {
      expect(camelotToKey('1B')).toBe('B');
      expect(camelotToKey('2B')).toBe('Gb');
      expect(camelotToKey('3B')).toBe('Db');
      expect(camelotToKey('4B')).toBe('Ab');
      expect(camelotToKey('5B')).toBe('Eb');
      expect(camelotToKey('6B')).toBe('Bb');
      expect(camelotToKey('7B')).toBe('F');
      expect(camelotToKey('8B')).toBe('C');
      expect(camelotToKey('9B')).toBe('G');
      expect(camelotToKey('10B')).toBe('D');
      expect(camelotToKey('11B')).toBe('A');
      expect(camelotToKey('12B')).toBe('E');
    });

    it('should return null for null/undefined', () => {
      expect(camelotToKey(null)).toBeNull();
      expect(camelotToKey(undefined)).toBeNull();
    });

    it('should return null for invalid Camelot keys', () => {
      expect(camelotToKey('0A')).toBeNull();
      expect(camelotToKey('13A')).toBeNull();
      expect(camelotToKey('8C')).toBeNull();
      expect(camelotToKey('foo')).toBeNull();
    });

    it('should be the inverse of keyToCamelot for canonical keys', () => {
      const canonicalKeys = ['Am', 'C', 'Dm', 'F', 'G', 'Em', 'Bm', 'E'];
      for (const key of canonicalKeys) {
        const camelot = keyToCamelot(key);
        expect(camelot).not.toBeNull();
        const backToKey = camelotToKey(camelot!);
        // Convert back through camelot to verify round-trip
        expect(keyToCamelot(backToKey!)).toBe(camelot);
      }
    });
  });

  // ─── parseCamelot ──────────────────────────────────────────────────

  describe('parseCamelot', () => {
    it('should parse valid single-digit Camelot keys', () => {
      expect(parseCamelot('1A')).toEqual({ number: 1, letter: 'A' });
      expect(parseCamelot('9B')).toEqual({ number: 9, letter: 'B' });
    });

    it('should parse valid double-digit Camelot keys', () => {
      expect(parseCamelot('10A')).toEqual({ number: 10, letter: 'A' });
      expect(parseCamelot('11B')).toEqual({ number: 11, letter: 'B' });
      expect(parseCamelot('12A')).toEqual({ number: 12, letter: 'A' });
    });

    it('should return null for out-of-range numbers', () => {
      expect(parseCamelot('0A')).toBeNull();
      expect(parseCamelot('13A')).toBeNull();
      expect(parseCamelot('99B')).toBeNull();
    });

    it('should return null for invalid letters', () => {
      expect(parseCamelot('8C')).toBeNull();
      expect(parseCamelot('8a')).toBeNull(); // lowercase
      expect(parseCamelot('8b')).toBeNull();
    });

    it('should return null for invalid formats', () => {
      expect(parseCamelot('')).toBeNull();
      expect(parseCamelot('A8')).toBeNull();
      expect(parseCamelot('abc')).toBeNull();
      expect(parseCamelot('8')).toBeNull();
      expect(parseCamelot('A')).toBeNull();
    });
  });

  // ─── formatCamelot ─────────────────────────────────────────────────

  describe('formatCamelot', () => {
    it('should format parsed Camelot back to string', () => {
      expect(formatCamelot({ number: 8, letter: 'A' })).toBe('8A');
      expect(formatCamelot({ number: 12, letter: 'B' })).toBe('12B');
      expect(formatCamelot({ number: 1, letter: 'A' })).toBe('1A');
    });

    it('should be the inverse of parseCamelot', () => {
      for (let n = 1; n <= 12; n++) {
        for (const l of ['A', 'B'] as const) {
          const key = `${n}${l}`;
          const parsed = parseCamelot(key)!;
          expect(formatCamelot(parsed)).toBe(key);
        }
      }
    });
  });

  // ─── getCompatibleCamelotKeys ──────────────────────────────────────

  describe('getCompatibleCamelotKeys', () => {
    it('should return 4 compatible keys (self, relative, +1, -1)', () => {
      const result = getCompatibleCamelotKeys('8A');
      expect(result).toHaveLength(4);
      expect(result).toContain('8A'); // same key
      expect(result).toContain('8B'); // relative major
      expect(result).toContain('9A'); // +1 on wheel
      expect(result).toContain('7A'); // -1 on wheel
    });

    it('should wrap around from 12 to 1', () => {
      const result = getCompatibleCamelotKeys('12B');
      expect(result).toContain('12B');
      expect(result).toContain('12A');
      expect(result).toContain('1B');  // 12+1 wraps to 1
      expect(result).toContain('11B'); // 12-1
    });

    it('should wrap around from 1 to 12', () => {
      const result = getCompatibleCamelotKeys('1A');
      expect(result).toContain('1A');
      expect(result).toContain('1B');
      expect(result).toContain('2A');  // 1+1
      expect(result).toContain('12A'); // 1-1 wraps to 12
    });

    it('should return empty array for invalid key', () => {
      expect(getCompatibleCamelotKeys('invalid')).toEqual([]);
      expect(getCompatibleCamelotKeys('0A')).toEqual([]);
      expect(getCompatibleCamelotKeys('13B')).toEqual([]);
    });
  });

  // ─── areKeysCompatible ─────────────────────────────────────────────

  describe('areKeysCompatible', () => {
    it('should return true for same key', () => {
      expect(areKeysCompatible('8A', '8A')).toBe(true);
      expect(areKeysCompatible('12B', '12B')).toBe(true);
    });

    it('should return true for relative major/minor (same number, different letter)', () => {
      expect(areKeysCompatible('8A', '8B')).toBe(true);
      expect(areKeysCompatible('5B', '5A')).toBe(true);
    });

    it('should return true for adjacent numbers on wheel (same letter)', () => {
      expect(areKeysCompatible('8A', '9A')).toBe(true);
      expect(areKeysCompatible('8A', '7A')).toBe(true);
      expect(areKeysCompatible('5B', '6B')).toBe(true);
    });

    it('should return true for wrap-around adjacency (1 and 12)', () => {
      expect(areKeysCompatible('1A', '12A')).toBe(true);
      expect(areKeysCompatible('12B', '1B')).toBe(true);
    });

    it('should return false for adjacent numbers with different letters', () => {
      expect(areKeysCompatible('8A', '9B')).toBe(false);
      expect(areKeysCompatible('5B', '6A')).toBe(false);
    });

    it('should return false for non-adjacent numbers', () => {
      expect(areKeysCompatible('8A', '10A')).toBe(false);
      expect(areKeysCompatible('3B', '6B')).toBe(false);
    });

    it('should return false when either key is null/undefined', () => {
      expect(areKeysCompatible(null, '8A')).toBe(false);
      expect(areKeysCompatible('8A', null)).toBe(false);
      expect(areKeysCompatible(undefined, undefined)).toBe(false);
    });

    it('should return false for invalid keys', () => {
      expect(areKeysCompatible('invalid', '8A')).toBe(false);
      expect(areKeysCompatible('8A', '13B')).toBe(false);
    });
  });

  // ─── getCamelotDistance ────────────────────────────────────────────

  describe('getCamelotDistance', () => {
    it('should return 0 for same number', () => {
      expect(getCamelotDistance(8, 8)).toBe(0);
    });

    it('should return direct distance for close numbers', () => {
      expect(getCamelotDistance(8, 9)).toBe(1);
      expect(getCamelotDistance(3, 5)).toBe(2);
      expect(getCamelotDistance(1, 6)).toBe(5);
    });

    it('should return shortest circular distance', () => {
      // Going around the wheel is shorter
      expect(getCamelotDistance(1, 12)).toBe(1); // not 11
      expect(getCamelotDistance(2, 11)).toBe(3); // not 9
      expect(getCamelotDistance(1, 7)).toBe(6);  // max distance
    });

    it('should be commutative', () => {
      expect(getCamelotDistance(3, 10)).toBe(getCamelotDistance(10, 3));
      expect(getCamelotDistance(1, 12)).toBe(getCamelotDistance(12, 1));
    });

    it('should have max distance of 6', () => {
      for (let a = 1; a <= 12; a++) {
        for (let b = 1; b <= 12; b++) {
          expect(getCamelotDistance(a, b)).toBeLessThanOrEqual(6);
        }
      }
    });
  });

  // ─── calculateHarmonicScore ────────────────────────────────────────

  describe('calculateHarmonicScore', () => {
    it('should return 100/perfect for same key', () => {
      const result = calculateHarmonicScore('8A', '8A');
      expect(result.score).toBe(100);
      expect(result.compatibility).toBe('perfect');
    });

    it('should return 90/energy_boost for adjacent same-letter keys', () => {
      const result = calculateHarmonicScore('8A', '9A');
      expect(result.score).toBe(90);
      expect(result.compatibility).toBe('energy_boost');
    });

    it('should return 85/compatible for relative major/minor', () => {
      const result = calculateHarmonicScore('8A', '8B');
      expect(result.score).toBe(85);
      expect(result.compatibility).toBe('compatible');
    });

    it('should return 75/compatible for adjacent different-letter keys', () => {
      const result = calculateHarmonicScore('8A', '9B');
      expect(result.score).toBe(75);
      expect(result.compatibility).toBe('compatible');
    });

    it('should return 55/compatible for distance 2', () => {
      const result = calculateHarmonicScore('8A', '10A');
      expect(result.score).toBe(55);
      expect(result.compatibility).toBe('compatible');
    });

    it('should return incompatible for distance >= 3', () => {
      const result = calculateHarmonicScore('8A', '11A');
      expect(result.compatibility).toBe('incompatible');
      expect(result.score).toBeLessThan(55);
    });

    it('should return score >= 20 for any distance', () => {
      const result = calculateHarmonicScore('1A', '7A'); // max distance = 6
      expect(result.score).toBeGreaterThanOrEqual(20);
    });

    it('should return 50/compatible when either key is null', () => {
      expect(calculateHarmonicScore(null, '8A')).toEqual({ score: 50, compatibility: 'compatible' });
      expect(calculateHarmonicScore('8A', null)).toEqual({ score: 50, compatibility: 'compatible' });
      expect(calculateHarmonicScore(null, null)).toEqual({ score: 50, compatibility: 'compatible' });
    });

    it('should return 50/compatible for invalid keys', () => {
      expect(calculateHarmonicScore('invalid', '8A')).toEqual({ score: 50, compatibility: 'compatible' });
    });

    it('should handle wrap-around correctly', () => {
      // 12A → 1A is distance 1 (adjacent)
      const result = calculateHarmonicScore('12A', '1A');
      expect(result.score).toBe(90);
      expect(result.compatibility).toBe('energy_boost');
    });
  });

  // ─── getSimpleHarmonicScore ────────────────────────────────────────

  describe('getSimpleHarmonicScore', () => {
    it('should return only the numeric score', () => {
      expect(getSimpleHarmonicScore('8A', '8A')).toBe(100);
      expect(getSimpleHarmonicScore('8A', '9A')).toBe(90);
      expect(getSimpleHarmonicScore(null, null)).toBe(50);
    });
  });

  // ─── Validators ────────────────────────────────────────────────────

  describe('isValidBpm', () => {
    it('should accept valid BPM range (30-300)', () => {
      expect(isValidBpm(30)).toBe(true);
      expect(isValidBpm(120)).toBe(true);
      expect(isValidBpm(300)).toBe(true);
      expect(isValidBpm(128.5)).toBe(true);
    });

    it('should reject out-of-range BPM', () => {
      expect(isValidBpm(29)).toBe(false);
      expect(isValidBpm(301)).toBe(false);
      expect(isValidBpm(0)).toBe(false);
      expect(isValidBpm(-10)).toBe(false);
    });

    it('should reject null/undefined', () => {
      expect(isValidBpm(null)).toBe(false);
      expect(isValidBpm(undefined)).toBe(false);
    });
  });

  describe('isValidEnergy', () => {
    it('should accept valid energy range (0-1)', () => {
      expect(isValidEnergy(0)).toBe(true);
      expect(isValidEnergy(0.5)).toBe(true);
      expect(isValidEnergy(1)).toBe(true);
    });

    it('should reject out-of-range energy', () => {
      expect(isValidEnergy(-0.01)).toBe(false);
      expect(isValidEnergy(1.01)).toBe(false);
      expect(isValidEnergy(2)).toBe(false);
    });

    it('should reject null/undefined', () => {
      expect(isValidEnergy(null)).toBe(false);
      expect(isValidEnergy(undefined)).toBe(false);
    });
  });

  describe('isValidCamelotKey', () => {
    it('should accept all valid Camelot keys', () => {
      for (let n = 1; n <= 12; n++) {
        expect(isValidCamelotKey(`${n}A`)).toBe(true);
        expect(isValidCamelotKey(`${n}B`)).toBe(true);
      }
    });

    it('should reject invalid Camelot keys', () => {
      expect(isValidCamelotKey('0A')).toBe(false);
      expect(isValidCamelotKey('13A')).toBe(false);
      expect(isValidCamelotKey('8C')).toBe(false);
      expect(isValidCamelotKey('foo')).toBe(false);
      expect(isValidCamelotKey(null)).toBe(false);
      expect(isValidCamelotKey(undefined)).toBe(false);
    });
  });
});
