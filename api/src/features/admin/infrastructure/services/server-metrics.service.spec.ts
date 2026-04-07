import { ServerMetricsService } from './server-metrics.service';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { BullmqService } from '@infrastructure/queue/bullmq.service';
import { ActiveStreamsTracker } from '@features/streaming/infrastructure/services/active-streams.tracker';
import { SettingsService } from '@infrastructure/settings';
import { PinoLogger } from 'nestjs-pino';

describe('ServerMetricsService', () => {
  let service: ServerMetricsService;
  let mockDrizzle: {
    db: { select: jest.Mock };
    client: {
      totalCount: number;
      idleCount: number;
      waitingCount: number;
      options: { max: number };
    };
  };
  let mockBullmq: { getQueueMetrics: jest.Mock };
  let mockTracker: { activeCount: number; totalServed: number };
  let mockSettings: { get: jest.Mock };

  beforeEach(() => {
    mockDrizzle = {
      db: {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 3 }]),
          }),
        }),
      },
      client: {
        totalCount: 5,
        idleCount: 3,
        waitingCount: 0,
        options: { max: 20 },
      },
    };

    mockBullmq = {
      getQueueMetrics: jest
        .fn()
        .mockResolvedValue([
          { name: 'test-queue', waiting: 0, active: 1, completed: 50, failed: 2, delayed: 0 },
        ]),
    };

    mockTracker = {
      activeCount: 2,
      totalServed: 100,
    };

    mockSettings = {
      get: jest.fn().mockResolvedValue(null),
    };

    const mockLogger = { debug: jest.fn(), info: jest.fn(), error: jest.fn() };

    service = new ServerMetricsService(
      mockLogger as unknown as PinoLogger,
      mockDrizzle as unknown as DrizzleService,
      mockBullmq as unknown as BullmqService,
      mockTracker as unknown as ActiveStreamsTracker,
      mockSettings as unknown as SettingsService
    );
  });

  describe('collect', () => {
    it('should return all metric categories', async () => {
      const result = await service.collect();

      expect(result).toHaveProperty('process');
      expect(result).toHaveProperty('system');
      expect(result).toHaveProperty('streaming');
      expect(result).toHaveProperty('queues');
      expect(result).toHaveProperty('database');
    });

    it('should include process metrics from Node.js', async () => {
      const result = await service.collect();

      expect(result.process.pid).toBe(process.pid);
      expect(result.process.nodeVersion).toBe(process.version);
      expect(result.process.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(result.process.memoryUsage.heapUsedMB).toBeGreaterThan(0);
      expect(result.process.memoryUsage.rssMB).toBeGreaterThan(0);
      expect(result.process.memoryUsage.heapUsagePercent).toBeGreaterThan(0);
      expect(result.process.memoryUsage.heapUsagePercent).toBeLessThanOrEqual(100);
    });

    it('should include system metrics from OS', async () => {
      const result = await service.collect();

      expect(result.system.hostname).toBeTruthy();
      expect(result.system.platform).toBeTruthy();
      expect(result.system.arch).toBeTruthy();
      expect(result.system.cpuCores).toBeGreaterThan(0);
      expect(result.system.totalMemoryMB).toBeGreaterThan(0);
      expect(result.system.memoryUsagePercent).toBeGreaterThan(0);
      expect(result.system.loadAverage).toHaveLength(3);
    });

    it('should read active streams from tracker', async () => {
      const result = await service.collect();

      expect(result.streaming.activeStreams).toBe(2);
      expect(result.streaming.totalStreamsServed).toBe(100);
    });

    it('should read queue metrics from BullMQ', async () => {
      const result = await service.collect();

      expect(result.queues).toHaveLength(1);
      expect(result.queues[0].name).toBe('test-queue');
      expect(result.queues[0].active).toBe(1);
      expect(result.queues[0].completed).toBe(50);
    });

    it('should read pool stats from Drizzle', async () => {
      const result = await service.collect();

      expect(result.database.pool.totalConnections).toBe(5);
      expect(result.database.pool.idleConnections).toBe(3);
      expect(result.database.pool.waitingRequests).toBe(0);
      expect(result.database.pool.maxConnections).toBe(20);
    });

    it('should return null storage when library path not configured', async () => {
      mockSettings.get.mockResolvedValue(null);

      const result = await service.collect();

      expect(result.system.storage).toBeNull();
    });

    it('should handle BullMQ errors gracefully', async () => {
      mockBullmq.getQueueMetrics.mockRejectedValue(new Error('Redis down'));

      const result = await service.collect();

      expect(result.queues).toEqual([]);
    });

    it('should handle stream token count errors gracefully', async () => {
      mockDrizzle.db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(new Error('DB error')),
        }),
      });

      const result = await service.collect();

      expect(result.streaming.activeStreamTokens).toBe(0);
    });
  });
});
