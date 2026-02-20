import { DateUtil } from './date.util';

describe('DateUtil', () => {
  describe('now', () => {
    it('should return a Date instance', () => {
      expect(DateUtil.now()).toBeInstanceOf(Date);
    });

    it('should return approximately the current time', () => {
      const before = Date.now();
      const result = DateUtil.now().getTime();
      const after = Date.now();
      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });
  });

  describe('fromTimestamp', () => {
    it('should create date from Unix timestamp', () => {
      const timestamp = 1704067200000; // 2024-01-01T00:00:00.000Z
      const date = DateUtil.fromTimestamp(timestamp);
      expect(date.getTime()).toBe(timestamp);
    });
  });

  describe('fromISOString', () => {
    it('should create date from ISO string', () => {
      const iso = '2024-06-15T12:30:00.000Z';
      const date = DateUtil.fromISOString(iso);
      expect(date.toISOString()).toBe(iso);
    });
  });

  describe('isSameDay', () => {
    it('should return true for same day', () => {
      const d1 = new Date(2024, 5, 15, 10, 0);
      const d2 = new Date(2024, 5, 15, 22, 30);
      expect(DateUtil.isSameDay(d1, d2)).toBe(true);
    });

    it('should return false for different days', () => {
      const d1 = new Date(2024, 5, 15);
      const d2 = new Date(2024, 5, 16);
      expect(DateUtil.isSameDay(d1, d2)).toBe(false);
    });

    it('should return false for different months', () => {
      const d1 = new Date(2024, 5, 15);
      const d2 = new Date(2024, 6, 15);
      expect(DateUtil.isSameDay(d1, d2)).toBe(false);
    });

    it('should return false for different years', () => {
      const d1 = new Date(2024, 5, 15);
      const d2 = new Date(2025, 5, 15);
      expect(DateUtil.isSameDay(d1, d2)).toBe(false);
    });
  });

  describe('addDays', () => {
    it('should add days correctly', () => {
      const date = new Date(2024, 0, 1);
      const result = DateUtil.addDays(date, 10);
      expect(result.getDate()).toBe(11);
    });

    it('should handle month overflow', () => {
      const date = new Date(2024, 0, 30);
      const result = DateUtil.addDays(date, 5);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(4);
    });

    it('should handle negative days', () => {
      const date = new Date(2024, 0, 15);
      const result = DateUtil.addDays(date, -5);
      expect(result.getDate()).toBe(10);
    });

    it('should not mutate original date', () => {
      const date = new Date(2024, 0, 1);
      DateUtil.addDays(date, 10);
      expect(date.getDate()).toBe(1);
    });
  });

  describe('addHours', () => {
    it('should add hours correctly', () => {
      const date = new Date(2024, 0, 1, 10, 0);
      const result = DateUtil.addHours(date, 5);
      expect(result.getHours()).toBe(15);
    });

    it('should handle day overflow', () => {
      const date = new Date(2024, 0, 1, 23, 0);
      const result = DateUtil.addHours(date, 3);
      expect(result.getDate()).toBe(2);
      expect(result.getHours()).toBe(2);
    });

    it('should not mutate original date', () => {
      const date = new Date(2024, 0, 1, 10, 0);
      DateUtil.addHours(date, 5);
      expect(date.getHours()).toBe(10);
    });
  });

  describe('isPast', () => {
    it('should return true for past dates', () => {
      const pastDate = new Date(2020, 0, 1);
      expect(DateUtil.isPast(pastDate)).toBe(true);
    });

    it('should return false for future dates', () => {
      const futureDate = new Date(2099, 0, 1);
      expect(DateUtil.isPast(futureDate)).toBe(false);
    });
  });

  describe('isFuture', () => {
    it('should return true for future dates', () => {
      const futureDate = new Date(2099, 0, 1);
      expect(DateUtil.isFuture(futureDate)).toBe(true);
    });

    it('should return false for past dates', () => {
      const pastDate = new Date(2020, 0, 1);
      expect(DateUtil.isFuture(pastDate)).toBe(false);
    });
  });

  describe('diffInDays', () => {
    it('should return 1 for adjacent days', () => {
      const d1 = new Date(2024, 0, 1);
      const d2 = new Date(2024, 0, 2);
      expect(DateUtil.diffInDays(d1, d2)).toBe(1);
    });

    it('should return absolute difference regardless of order', () => {
      const d1 = new Date(2024, 0, 10);
      const d2 = new Date(2024, 0, 1);
      expect(DateUtil.diffInDays(d1, d2)).toBe(9);
    });

    it('should handle large differences', () => {
      const d1 = new Date(2024, 0, 1);
      const d2 = new Date(2025, 0, 1);
      expect(DateUtil.diffInDays(d1, d2)).toBe(366); // 2024 is leap year
    });
  });
});
