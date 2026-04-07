import { parsePaginationParams, validatePagination } from './pagination.util';

describe('Pagination Utils', () => {
  describe('parsePaginationParams', () => {
    it('should return defaults for empty params', () => {
      const result = parsePaginationParams();
      expect(result).toEqual({ skip: 0, take: 10 });
    });

    it('should parse string skip and take', () => {
      const result = parsePaginationParams('20', '50');
      expect(result).toEqual({ skip: 20, take: 50 });
    });

    it('should clamp negative skip to 0', () => {
      const result = parsePaginationParams('-5', '10');
      expect(result.skip).toBe(0);
    });

    it('should clamp take to max 100 by default', () => {
      const result = parsePaginationParams('0', '500');
      expect(result.take).toBe(100);
    });

    it('should clamp take to min 1', () => {
      const result = parsePaginationParams('0', '0');
      expect(result.take).toBe(10); // 0 parses to NaN fallback to defaultTake
    });

    it('should use custom maxTake', () => {
      const result = parsePaginationParams('0', '50', { maxTake: 25 });
      expect(result.take).toBe(25);
    });

    it('should use custom defaultTake', () => {
      const result = parsePaginationParams('0', undefined, { defaultTake: 20 });
      expect(result.take).toBe(20);
    });

    it('should handle non-numeric strings', () => {
      const result = parsePaginationParams('abc', 'xyz');
      expect(result.skip).toBe(0);
      expect(result.take).toBe(10);
    });
  });

  describe('validatePagination', () => {
    it('should return defaults for undefined params', () => {
      const result = validatePagination();
      expect(result).toEqual({ skip: 0, take: 10 });
    });

    it('should pass through valid numbers', () => {
      const result = validatePagination(20, 50);
      expect(result).toEqual({ skip: 20, take: 50 });
    });

    it('should clamp negative skip to 0', () => {
      const result = validatePagination(-5, 10);
      expect(result.skip).toBe(0);
    });

    it('should clamp take to max 100', () => {
      const result = validatePagination(0, 500);
      expect(result.take).toBe(100);
    });

    it('should clamp take to min 1', () => {
      const result = validatePagination(0, -5);
      expect(result.take).toBe(1);
    });

    it('should accept number as options (legacy maxTake)', () => {
      const result = validatePagination(0, 50, 25);
      expect(result.take).toBe(25);
    });

    it('should accept options object', () => {
      const result = validatePagination(0, undefined, { maxTake: 50, defaultTake: 20 });
      expect(result.take).toBe(20);
    });
  });
});
