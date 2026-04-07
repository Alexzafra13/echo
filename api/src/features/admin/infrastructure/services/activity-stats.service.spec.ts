import { ActivityStatsService } from './activity-stats.service';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { RedisService } from '@infrastructure/cache/redis.service';

describe('ActivityStatsService', () => {
  let service: ActivityStatsService;
  let mockDrizzle: { db: { select: jest.Mock; execute: jest.Mock } };
  let mockCache: { get: jest.Mock; set: jest.Mock };

  beforeEach(() => {
    mockDrizzle = {
      db: {
        select: jest.fn(),
        execute: jest.fn(),
      },
    };

    mockCache = {
      get: jest.fn().mockResolvedValue(null), // no cache by default
      set: jest.fn().mockResolvedValue(undefined),
    };

    service = new ActivityStatsService(
      mockDrizzle as unknown as DrizzleService,
      mockCache as unknown as RedisService
    );
  });

  describe('getStats', () => {
    it('should return cached stats if available', async () => {
      const cached = { totalUsers: 10, activeUsersLast24h: 3, activeUsersLast7d: 7 };
      mockCache.get.mockResolvedValue(cached);

      const result = await service.getStats();

      expect(result).toEqual(cached);
      expect(mockDrizzle.db.select).not.toHaveBeenCalled();
    });

    it('should query DB with single FILTER query when cache misses', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        where: jest
          .fn()
          .mockResolvedValue([{ totalUsers: 20, activeUsersLast24h: 5, activeUsersLast7d: 12 }]),
      });
      mockDrizzle.db.select.mockReturnValue({ from: mockFrom });

      const result = await service.getStats();

      expect(result).toEqual({
        totalUsers: 20,
        activeUsersLast24h: 5,
        activeUsersLast7d: 12,
      });
      // Verify only ONE select call (not 3 separate queries)
      expect(mockDrizzle.db.select).toHaveBeenCalledTimes(1);
      expect(mockCache.set).toHaveBeenCalledWith('dashboard:activity-stats', result, 120);
    });

    it('should return zeros when no users exist', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      });
      mockDrizzle.db.select.mockReturnValue({ from: mockFrom });

      const result = await service.getStats();

      expect(result.totalUsers).toBe(0);
      expect(result.activeUsersLast24h).toBe(0);
      expect(result.activeUsersLast7d).toBe(0);
    });
  });

  describe('getTimeline', () => {
    it('should return cached timeline if available', async () => {
      const cached = [{ date: '2024-01-01', scans: 1, enrichments: 2, errors: 0 }];
      mockCache.get.mockResolvedValue(cached);

      const result = await service.getTimeline();

      expect(result).toEqual(cached);
      expect(mockDrizzle.db.execute).not.toHaveBeenCalled();
    });

    it('should use only 2 queries (not 21) when cache misses', async () => {
      // Mock both GROUP BY DATE queries
      mockDrizzle.db.execute
        .mockResolvedValueOnce({ rows: [] }) // scans
        .mockResolvedValueOnce({ rows: [] }); // enrichments

      await service.getTimeline();

      // Must be exactly 2 queries (scans + enrichments), not 21
      expect(mockDrizzle.db.execute).toHaveBeenCalledTimes(2);
    });

    it('should always return exactly 7 days', async () => {
      mockDrizzle.db.execute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.getTimeline();

      expect(result).toHaveLength(7);
    });

    it('should fill days without activity with zeros', async () => {
      mockDrizzle.db.execute
        .mockResolvedValueOnce({ rows: [] }) // no scans
        .mockResolvedValueOnce({ rows: [] }); // no enrichments

      const result = await service.getTimeline();

      result.forEach((day) => {
        expect(day.scans).toBe(0);
        expect(day.enrichments).toBe(0);
        expect(day.errors).toBe(0);
      });
    });

    it('should map scan and enrichment data to correct days', async () => {
      const today = new Date().toISOString().split('T')[0];

      mockDrizzle.db.execute
        .mockResolvedValueOnce({ rows: [{ day: today, scans: 3 }] })
        .mockResolvedValueOnce({ rows: [{ day: today, enrichments: 10, errors: 2 }] });

      const result = await service.getTimeline();

      const todayEntry = result.find((d) => d.date === today);
      expect(todayEntry).toBeDefined();
      expect(todayEntry!.scans).toBe(3);
      expect(todayEntry!.enrichments).toBe(10);
      expect(todayEntry!.errors).toBe(2);
    });

    it('should order days chronologically (oldest first)', async () => {
      mockDrizzle.db.execute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.getTimeline();

      for (let i = 1; i < result.length; i++) {
        expect(result[i].date > result[i - 1].date).toBe(true);
      }
    });

    it('should cache the timeline result', async () => {
      mockDrizzle.db.execute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await service.getTimeline();

      expect(mockCache.set).toHaveBeenCalledWith(
        'dashboard:activity-timeline',
        expect.any(Array),
        120
      );
    });
  });
});
