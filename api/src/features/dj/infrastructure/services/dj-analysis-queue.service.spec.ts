import { DjAnalysisQueueService } from './dj-analysis-queue.service';

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const mockBullmq = {
  registerProcessor: jest.fn(),
  addJob: jest.fn().mockResolvedValue(undefined),
};

// Chain-able mock for Drizzle query builder
function createChainMock(returnValue: any = []) {
  const chain: any = {};
  const methods = ['select', 'from', 'where', 'innerJoin', 'set', 'limit', 'groupBy', 'insert', 'values', 'update'];
  for (const method of methods) {
    chain[method] = jest.fn().mockReturnValue(chain);
  }
  // Terminal: make select return a thenable that resolves to returnValue
  chain.then = (resolve: any) => resolve(returnValue);
  // Also make it directly awaitable
  chain[Symbol.toStringTag] = 'Promise';
  return chain;
}

const mockDrizzle = {
  db: {
    select: jest.fn().mockReturnValue(createChainMock()),
    update: jest.fn().mockReturnValue(createChainMock()),
    insert: jest.fn().mockReturnValue(createChainMock()),
    transaction: jest.fn(),
  },
};

const mockAnalyzer = {
  getPoolSize: jest.fn().mockReturnValue(2),
  getName: jest.fn().mockReturnValue('essentia'),
  analyze: jest.fn().mockResolvedValue({ bpm: 128, key: 'Am', energy: 0.75 }),
  isAvailable: jest.fn().mockResolvedValue(true),
};

const mockScannerGateway = {
  emitDjProgress: jest.fn(),
};

describe('DjAnalysisQueueService', () => {
  let service: DjAnalysisQueueService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    service = new (DjAnalysisQueueService as any)(
      mockLogger,
      mockBullmq,
      mockDrizzle,
      mockAnalyzer,
      mockScannerGateway,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ─── constructor ───────────────────────────────────────────────────

  describe('constructor', () => {
    it('should set concurrency from analyzer pool size', () => {
      expect(mockAnalyzer.getPoolSize).toHaveBeenCalled();
      expect((service as any).concurrency).toBe(2);
    });

    it('should log initialization', () => {
      expect(mockLogger.info).toHaveBeenCalledWith(
        { concurrency: 2 },
        'DJ Analysis queue initialized',
      );
    });
  });

  // ─── onModuleInit ──────────────────────────────────────────────────

  describe('onModuleInit', () => {
    it('should register BullMQ processor with correct concurrency', () => {
      service.onModuleInit();

      expect(mockBullmq.registerProcessor).toHaveBeenCalledWith(
        'dj-analysis-queue',
        expect.any(Function),
        { concurrency: 2 },
      );
    });

    it('should schedule resume of pending analyses after 5s', () => {
      const spy = jest.spyOn(service as any, 'resumePendingAnalyses').mockResolvedValue(undefined);

      service.onModuleInit();

      expect(spy).not.toHaveBeenCalled();
      jest.advanceTimersByTime(5000);
      expect(spy).toHaveBeenCalledTimes(1);

      spy.mockRestore();
    });
  });

  // ─── startAnalysisQueue ────────────────────────────────────────────

  describe('startAnalysisQueue', () => {
    it('should return no-op when no pending tracks', async () => {
      // Mock: no tracks need analysis (subquery returns all tracks as completed)
      const emptyChain = createChainMock([]);
      mockDrizzle.db.select.mockReturnValue(emptyChain);

      const result = await service.startAnalysisQueue();
      expect(result.started).toBe(false);
      expect(result.pending).toBe(0);
    });

    it('should return already-running when queue is active', async () => {
      // Manually set running state
      (service as any).isRunning = true;

      const tracksChain = createChainMock([
        { id: 't1', title: 'Track 1', path: '/music/t1.mp3' },
      ]);
      mockDrizzle.db.select.mockReturnValue(tracksChain);

      const result = await service.startAnalysisQueue();
      expect(result.started).toBe(false);
      expect(result.message).toContain('already running');
    });
  });

  // ─── startAnalysisQueueForTracks ───────────────────────────────────

  describe('startAnalysisQueueForTracks', () => {
    it('should do nothing for empty track list', async () => {
      await service.startAnalysisQueueForTracks([]);
      expect(mockBullmq.addJob).not.toHaveBeenCalled();
    });

    it('should enqueue each track', async () => {
      const tracks = [
        { id: 't1', title: 'Track 1', path: '/music/t1.mp3' },
        { id: 't2', title: 'Track 2', path: '/music/t2.mp3' },
      ];

      await service.startAnalysisQueueForTracks(tracks);

      expect(mockBullmq.addJob).toHaveBeenCalledTimes(2);
      expect(mockBullmq.addJob).toHaveBeenCalledWith(
        'dj-analysis-queue',
        'analyze-track',
        { trackId: 't1', trackTitle: 'Track 1', filePath: '/music/t1.mp3' },
      );
    });

    it('should set isRunning and emit progress', async () => {
      await service.startAnalysisQueueForTracks([
        { id: 't1', title: 'Track 1', path: '/music/t1.mp3' },
      ]);

      expect((service as any).isRunning).toBe(true);
      expect((service as any).totalToProcess).toBe(1);
      expect(mockScannerGateway.emitDjProgress).toHaveBeenCalled();
    });
  });

  // ─── enqueueTrack ──────────────────────────────────────────────────

  describe('enqueueTrack', () => {
    it('should add a single job to the queue', async () => {
      await service.enqueueTrack({ id: 't1', title: 'Track 1', path: '/music/t1.mp3' });

      expect(mockBullmq.addJob).toHaveBeenCalledWith(
        'dj-analysis-queue',
        'analyze-track',
        { trackId: 't1', trackTitle: 'Track 1', filePath: '/music/t1.mp3' },
      );
    });
  });

  // ─── stopQueue ─────────────────────────────────────────────────────

  describe('stopQueue', () => {
    it('should set isRunning to false', async () => {
      (service as any).isRunning = true;
      await service.stopQueue();
      expect((service as any).isRunning).toBe(false);
    });

    it('should emit progress update', async () => {
      await service.stopQueue();
      expect(mockScannerGateway.emitDjProgress).toHaveBeenCalled();
    });

    it('should log stop message', async () => {
      await service.stopQueue();
      expect(mockLogger.info).toHaveBeenCalledWith('DJ analysis queue stopped');
    });
  });

  // ─── getQueueStats ─────────────────────────────────────────────────

  describe('getQueueStats', () => {
    it('should return stats with analyzer backend name', async () => {
      const statsChain = createChainMock([]);
      mockDrizzle.db.select.mockReturnValue(statsChain);

      const stats = await service.getQueueStats();

      expect(stats.analyzerBackend).toBe('essentia');
      expect(stats.concurrency).toBe(2);
      expect(typeof stats.isRunning).toBe('boolean');
      expect(typeof stats.pendingTracks).toBe('number');
    });
  });

  // ─── retryFailedAnalyses ───────────────────────────────────────────

  describe('retryFailedAnalyses', () => {
    it('should return 0 when no failed analyses', async () => {
      const emptyChain = createChainMock([]);
      mockDrizzle.db.select.mockReturnValue(emptyChain);

      const result = await service.retryFailedAnalyses();
      expect(result.retried).toBe(0);
      expect(result.message).toContain('No failed');
    });
  });

  // ─── formatDuration (private) ──────────────────────────────────────

  describe('formatDuration', () => {
    it('should format seconds', () => {
      expect((service as any).formatDuration(5000)).toBe('5s');
      expect((service as any).formatDuration(45000)).toBe('45s');
    });

    it('should format minutes and seconds', () => {
      expect((service as any).formatDuration(90000)).toBe('1m 30s');
      expect((service as any).formatDuration(300000)).toBe('5m 0s');
    });

    it('should format hours and minutes', () => {
      expect((service as any).formatDuration(3600000)).toBe('1h 0m');
      expect((service as any).formatDuration(5400000)).toBe('1h 30m');
    });
  });

  // ─── updateAverageProcessingTime (private) ─────────────────────────

  describe('updateAverageProcessingTime', () => {
    it('should compute rolling average', () => {
      (service as any).updateAverageProcessingTime(1000);
      expect((service as any).averageProcessingTime).toBe(1000);

      (service as any).updateAverageProcessingTime(3000);
      expect((service as any).averageProcessingTime).toBe(2000);
    });

    it('should keep only last 20 measurements', () => {
      for (let i = 0; i < 25; i++) {
        (service as any).updateAverageProcessingTime(100);
      }
      expect((service as any).processingTimes).toHaveLength(20);
    });
  });
});
