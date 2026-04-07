import { describe, it, expect } from 'vitest';
import { formatDuration } from './format';

describe('formatDuration', () => {
  describe('normal cases', () => {
    it('should format seconds only (< 1 minute)', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(5)).toBe('0:05');
      expect(formatDuration(30)).toBe('0:30');
      expect(formatDuration(59)).toBe('0:59');
    });

    it('should format minutes and seconds (< 1 hour)', () => {
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(65)).toBe('1:05');
      expect(formatDuration(125)).toBe('2:05');
      expect(formatDuration(599)).toBe('9:59');
      expect(formatDuration(3599)).toBe('59:59');
    });

    it('should format hours, minutes and seconds', () => {
      expect(formatDuration(3600)).toBe('1:00:00');
      expect(formatDuration(3665)).toBe('1:01:05');
      expect(formatDuration(7325)).toBe('2:02:05');
      expect(formatDuration(36000)).toBe('10:00:00');
    });

    it('should pad minutes and seconds with leading zeros when hours present', () => {
      expect(formatDuration(3605)).toBe('1:00:05');
      expect(formatDuration(3660)).toBe('1:01:00');
      expect(formatDuration(3725)).toBe('1:02:05');
    });

    it('should pad seconds with leading zero when needed', () => {
      expect(formatDuration(61)).toBe('1:01');
      expect(formatDuration(120)).toBe('2:00');
      expect(formatDuration(305)).toBe('5:05');
    });
  });

  describe('edge cases', () => {
    it('should handle zero', () => {
      expect(formatDuration(0)).toBe('0:00');
    });

    it('should handle NaN', () => {
      expect(formatDuration(NaN)).toBe('0:00');
    });

    it('should handle negative numbers', () => {
      expect(formatDuration(-1)).toBe('0:00');
      expect(formatDuration(-100)).toBe('0:00');
    });

    it('should handle decimal numbers by flooring them', () => {
      expect(formatDuration(65.7)).toBe('1:05');
      expect(formatDuration(90.9)).toBe('1:30');
    });

    it('should handle very large numbers', () => {
      expect(formatDuration(360000)).toBe('100:00:00');
      expect(formatDuration(86400)).toBe('24:00:00'); // 1 day
    });
  });
});
