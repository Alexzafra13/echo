import { EssentiaAnalyzerService } from './essentia-analyzer.service';
import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

// Mock child_process — include execFile for FFmpeg fallback path
jest.mock('child_process', () => ({
  fork: jest.fn(),
  execFile: jest.fn(),
}));

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
}));

// Mock os
jest.mock('os', () => ({
  cpus: jest.fn().mockReturnValue(new Array(4).fill({ model: 'test' })),
  totalmem: jest.fn().mockReturnValue(8 * 1024 * 1024 * 1024), // 8GB
}));

// Mock ffmpeg util
jest.mock('../utils/ffmpeg.util', () => ({
  getFfmpegPath: jest.fn().mockReturnValue('/usr/bin/ffmpeg'),
  getFfprobePath: jest.fn().mockReturnValue('/usr/bin/ffprobe'),
}));

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

/**
 * Create a mock child process that behaves like a forked worker
 */
function createMockWorker(): ChildProcess & EventEmitter {
  const emitter = new EventEmitter() as any;
  emitter.send = jest.fn();
  emitter.kill = jest.fn();
  emitter.pid = Math.floor(Math.random() * 10000);
  emitter.stderr = new EventEmitter();
  return emitter;
}

describe('EssentiaAnalyzerService', () => {
  let service: EssentiaAnalyzerService;
  let forkMock: jest.Mock;
  let mockWorkers: (ChildProcess & EventEmitter)[];

  beforeEach(() => {
    jest.clearAllMocks();
    mockWorkers = [];

    // Restore os mock defaults (other tests may have changed them)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const os = require('os');
    os.cpus.mockReturnValue(new Array(4).fill({ model: 'test' }));
    os.totalmem.mockReturnValue(8 * 1024 * 1024 * 1024);

    // Restore fs mock default
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    fs.existsSync.mockReturnValue(true);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    forkMock = require('child_process').fork;
    forkMock.mockImplementation(() => {
      const worker = createMockWorker();
      mockWorkers.push(worker);
      // Auto-emit 'ready' on next tick to simulate WASM init
      process.nextTick(() => worker.emit('message', { type: 'ready' }));
      return worker;
    });

    service = new (EssentiaAnalyzerService as any)(mockLogger);
  });

  afterEach(async () => {
    try {
      await (service as any).terminateAll();
    } catch {
      /* ignore */
    }
  });

  // ─── Pool size calculation ─────────────────────────────────────────

  describe('calculatePoolSize', () => {
    it('should return cores/2 for standard machines', () => {
      // 4 cores → 2 workers
      expect(service.getPoolSize()).toBe(2);
    });

    it('should cap at 12 workers', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const os = require('os');
      os.cpus.mockReturnValue(new Array(32).fill({ model: 'test' }));
      os.totalmem.mockReturnValue(64 * 1024 * 1024 * 1024);
      const largeService = new (EssentiaAnalyzerService as any)(mockLogger);
      expect(largeService.getPoolSize()).toBe(12);
    });

    it('should return minimum of 1 worker', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const os = require('os');
      os.cpus.mockReturnValue([{ model: 'test' }]); // 1 core
      os.totalmem.mockReturnValue(4 * 1024 * 1024 * 1024);
      const smallService = new (EssentiaAnalyzerService as any)(mockLogger);
      expect(smallService.getPoolSize()).toBeGreaterThanOrEqual(1);
    });

    it('should respect DJ_ANALYSIS_CONCURRENCY env var', () => {
      process.env.DJ_ANALYSIS_CONCURRENCY = '6';
      const envService = new (EssentiaAnalyzerService as any)(mockLogger);
      expect(envService.getPoolSize()).toBe(6);
      delete process.env.DJ_ANALYSIS_CONCURRENCY;
    });
  });

  // ─── getName ───────────────────────────────────────────────────────

  describe('getName', () => {
    it('should return essentia', () => {
      expect(service.getName()).toBe('essentia');
    });
  });

  // ─── getPoolSize ───────────────────────────────────────────────────

  describe('getPoolSize', () => {
    it('should expose the pool size', () => {
      expect(typeof service.getPoolSize()).toBe('number');
      expect(service.getPoolSize()).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── isAvailable ───────────────────────────────────────────────────

  describe('isAvailable', () => {
    it('should return true when workers can be spawned', async () => {
      const available = await service.isAvailable();
      expect(available).toBe(true);
      expect(mockWorkers.length).toBe(service.getPoolSize());
    });

    it('should return false when worker file does not exist', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      fs.existsSync.mockReturnValue(false);

      const badService = new (EssentiaAnalyzerService as any)(mockLogger);
      const available = await badService.isAvailable();
      expect(available).toBe(false);

      fs.existsSync.mockReturnValue(true);
    });
  });

  // ─── Pool initialization ───────────────────────────────────────────

  describe('pool initialization', () => {
    it('should spawn N workers matching pool size', async () => {
      await service.isAvailable(); // triggers initPool
      expect(forkMock).toHaveBeenCalledTimes(service.getPoolSize());
    });

    it('should lazy-init only once', async () => {
      await service.isAvailable();
      await service.isAvailable();
      // Should NOT double-spawn
      expect(forkMock).toHaveBeenCalledTimes(service.getPoolSize());
    });

    it('should succeed even if some workers fail to start', async () => {
      // Reset state for a clean test
      mockWorkers = [];
      let callCount = 0;
      forkMock.mockImplementation(() => {
        callCount++;
        const worker = createMockWorker();
        mockWorkers.push(worker);
        if (callCount === 1) {
          // First worker fails on next tick
          process.nextTick(() =>
            worker.emit('message', { type: 'init_error', error: 'WASM failed' })
          );
        } else {
          // Other workers succeed
          process.nextTick(() => worker.emit('message', { type: 'ready' }));
        }
        return worker;
      });

      // Create a fresh service so it picks up the new fork mock
      const freshService = new (EssentiaAnalyzerService as any)(mockLogger);
      const available = await freshService.isAvailable();
      expect(available).toBe(true);
      // Should have at least 1 worker in the pool (poolSize - 1 failed)
      expect((freshService as any).workers.size).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── analyze ───────────────────────────────────────────────────────

  describe('analyze', () => {
    it('should send analysis request to a worker and return result', async () => {
      // Initialize pool
      await service.isAvailable();

      // Mock the first worker to respond with a result
      const worker = mockWorkers[0];
      (worker.send as jest.Mock).mockImplementation((msg: any) => {
        if (msg.type === 'analyze') {
          process.nextTick(() => {
            worker.emit('message', {
              type: 'result',
              requestId: msg.requestId,
              success: true,
              data: { bpm: 128, key: 'Am', energy: 0.75 },
            });
          });
        }
      });

      const result = await service.analyze('/path/to/track.mp3');
      expect(result.bpm).toBe(128);
      expect(result.key).toBe('Am');
      expect(result.energy).toBe(0.75);
    });

    it('should fall back to FFmpeg when Essentia returns no useful data', async () => {
      await service.isAvailable();

      const worker = mockWorkers[0];
      (worker.send as jest.Mock).mockImplementation((msg: any) => {
        if (msg.type === 'analyze') {
          process.nextTick(() => {
            worker.emit('message', {
              type: 'result',
              requestId: msg.requestId,
              success: true,
              data: { bpm: 0, key: 'Unknown', energy: 0.5 },
            });
          });
        }
      });

      // Mock execFile for FFmpeg fallback (ffprobe returns audio info, ffmpeg returns volume)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { execFile } = require('child_process');
      execFile.mockImplementation(
        (cmd: string, args: string[], opts: any, cb: (...args: unknown[]) => unknown) => {
          if (cmd.includes('ffprobe')) {
            cb(null, { stdout: JSON.stringify({ format: { duration: '180' }, streams: [] }) });
          } else {
            cb(null, { stdout: '', stderr: 'mean_volume: -14.0 dB' });
          }
        }
      );

      const result = await service.analyze('/path/to/track.mp3');
      // Should have used FFmpeg fallback values
      expect(result.bpm).toBe(0);
      expect(result.key).toBe('Unknown');
      expect(result.energy).toBeGreaterThan(0);
    });

    it('should distribute work across multiple workers', async () => {
      await service.isAvailable();
      const poolSize = service.getPoolSize();

      // Track which workers get messages
      const workerCalls: number[] = [];
      mockWorkers.forEach((w, i) => {
        (w.send as jest.Mock).mockImplementation((msg: any) => {
          if (msg.type === 'analyze') {
            workerCalls.push(i);
            // Respond after a short delay to simulate processing
            setTimeout(() => {
              w.emit('message', {
                type: 'result',
                requestId: msg.requestId,
                success: true,
                data: { bpm: 120 + i, key: 'Am', energy: 0.5 },
              });
            }, 10);
          }
        });
      });

      // Send multiple concurrent analyses
      const promises = Array.from({ length: poolSize }, (_, i) =>
        service.analyze(`/path/track-${i}.mp3`)
      );
      const results = await Promise.all(promises);

      expect(results).toHaveLength(poolSize);
      // All workers should have been used (each exactly once)
      expect(new Set(workerCalls).size).toBe(poolSize);
    });
  });

  // ─── Worker crash handling ─────────────────────────────────────────

  describe('worker crash handling', () => {
    it('should reject pending request when worker exits', async () => {
      await service.isAvailable();
      const worker = mockWorkers[0];

      // Don't respond to analyze, simulate crash
      (worker.send as jest.Mock).mockImplementation(() => {});

      // Call analyzeWithEssentia directly to avoid FFmpeg fallback
      const analyzePromise = (service as any).analyzeWithEssentia('/path/to/track.mp3');

      // Simulate worker crash after sending
      await new Promise((r) => setTimeout(r, 10));
      worker.emit('exit', 1);

      await expect(analyzePromise).rejects.toThrow('Worker exited unexpectedly');
    });

    it('should spawn replacement worker after crash', async () => {
      await service.isAvailable();
      const initialWorkerCount = mockWorkers.length;
      const worker = mockWorkers[0];

      // Crash the worker
      worker.emit('exit', 1);

      // Wait for replacement to spawn
      await new Promise((r) => setTimeout(r, 50));

      // A new worker should have been spawned
      expect(mockWorkers.length).toBe(initialWorkerCount + 1);
    });
  });

  // ─── onModuleDestroy ───────────────────────────────────────────────

  describe('onModuleDestroy', () => {
    it('should kill all workers on shutdown', async () => {
      await service.isAvailable();
      const workers = [...mockWorkers];

      await service.onModuleDestroy();

      // All workers should have been sent 'exit'
      for (const worker of workers) {
        expect(worker.send).toHaveBeenCalledWith({ type: 'exit' });
      }
    });
  });
});
