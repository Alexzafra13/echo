import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { fork, ChildProcess } from 'child_process';
import {
  IAudioAnalyzer,
  AudioAnalysisResult,
} from '../../domain/ports/audio-analyzer.port';
import { getFfmpegPath, getFfprobePath } from '../utils/ffmpeg.util';
import { DJ_CONFIG } from '../../config/dj.config';

/**
 * Tracks state of a single Essentia WASM child process.
 * Each worker loads its own WASM instance and processes one track at a time.
 */
interface WorkerInstance {
  id: number;
  process: ChildProcess;
  ready: boolean;
  busy: boolean;
  analysisCount: number;
}

interface PendingRequest {
  resolve: (result: AudioAnalysisResult) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  workerId: number;
}

/**
 * EssentiaAnalyzerService - Audio analysis using an Essentia.js worker pool
 *
 * Runs N parallel child processes (N = CPU cores / 2, capped at 12).
 * Each worker loads Essentia WASM independently and processes one track at a time.
 * BullMQ concurrency is matched to pool size so each concurrent job gets its own worker.
 *
 * Worker lifecycle:
 * - Lazy init: pool spawns on first analyze() call
 * - Auto-recycle: each worker restarts after 500 analyses to prevent WASM memory bloat
 * - Auto-replace: crashed workers are replaced immediately
 * - Timeout-safe: timed-out requests don't mark the worker idle (WASM is still running)
 *
 * Falls back to FFmpeg for energy-only analysis if Essentia is unavailable.
 */
@Injectable()
export class EssentiaAnalyzerService implements IAudioAnalyzer, OnModuleDestroy {
  private readonly poolSize: number;
  private readonly workers: Map<number, WorkerInstance> = new Map();
  private readonly pendingRequests: Map<string, PendingRequest> = new Map();
  private readonly waitingCallers: Array<{
    resolve: (worker: WorkerInstance) => void;
    reject: (error: Error) => void;
  }> = [];
  private nextWorkerId = 0;
  private readonly workerPath: string;
  private poolInitPromise: Promise<void> | null = null;
  private poolReady = false;
  private shuttingDown = false;

  private static readonly RESTART_THRESHOLD = 500;
  private static readonly MAX_STDERR_BUFFER = 64 * 1024;

  constructor(
    @InjectPinoLogger(EssentiaAnalyzerService.name)
    private readonly logger: PinoLogger,
  ) {
    this.poolSize = this.calculatePoolSize();
    this.workerPath = path.join(
      process.cwd(),
      'dist',
      'features',
      'dj',
      'infrastructure',
      'workers',
      'essentia-worker.js',
    );
    this.logger.info(
      { poolSize: this.poolSize },
      'DJ Analysis service initialized (Essentia.js worker pool + FFmpeg backend)',
    );
  }

  /**
   * Calculate pool size: CPU cores / 2, capped at 12, overridable via env.
   * Matches the logic used by BullMQ concurrency in the queue service.
   */
  private calculatePoolSize(): number {
    const envConcurrency = parseInt(process.env.DJ_ANALYSIS_CONCURRENCY || '', 10);
    if (envConcurrency > 0) return envConcurrency;

    const cpuCores = os.cpus().length;
    const totalMemoryGB = os.totalmem() / (1024 * 1024 * 1024);
    const byCpu = Math.max(1, Math.floor(cpuCores / 2));
    const byMemory = Math.max(1, Math.floor((totalMemoryGB - 2) / 0.08));
    return Math.min(byCpu, byMemory, 12);
  }

  /** Expose pool size so the queue service can match BullMQ concurrency */
  getPoolSize(): number {
    return this.poolSize;
  }

  async onModuleDestroy() {
    this.shuttingDown = true;
    await this.terminateAll();
  }

  // ─── Pool management ───────────────────────────────────────────────

  /**
   * Lazy-init: spawn the full worker pool on first use.
   * Subsequent calls return immediately.
   */
  private async initPool(): Promise<void> {
    if (this.poolReady) return;
    if (this.poolInitPromise) return this.poolInitPromise;

    this.poolInitPromise = (async () => {
      if (!fs.existsSync(this.workerPath)) {
        this.logger.warn({ workerPath: this.workerPath }, 'Essentia worker not found');
        this.poolInitPromise = null;
        throw new Error('Worker not found');
      }

      const results = await Promise.allSettled(
        Array.from({ length: this.poolSize }, () => this.spawnWorker()),
      );

      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      if (successCount === 0) {
        this.poolInitPromise = null;
        throw new Error('Failed to spawn any Essentia workers');
      }

      this.poolReady = true;
      this.logger.info(
        { ready: successCount, requested: this.poolSize },
        'Essentia worker pool ready',
      );
    })();

    return this.poolInitPromise;
  }

  /**
   * Fork a new child process running essentia-worker.js and add it to the pool.
   */
  private spawnWorker(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const workerId = this.nextWorkerId++;
      let childProcess: ChildProcess;

      try {
        childProcess = fork(this.workerPath, [], {
          stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
          env: { ...process.env, NODE_ENV: process.env.NODE_ENV },
        });
      } catch (error) {
        reject(error);
        return;
      }

      const worker: WorkerInstance = {
        id: workerId,
        process: childProcess,
        ready: false,
        busy: false,
        analysisCount: 0,
      };

      // Capture stderr (WASM noise / errors)
      if (childProcess.stderr) {
        let stderrBuffer = '';
        childProcess.stderr.on('data', (chunk: Buffer) => {
          stderrBuffer += chunk.toString();
          if (stderrBuffer.length > EssentiaAnalyzerService.MAX_STDERR_BUFFER) {
            stderrBuffer = stderrBuffer.slice(-EssentiaAnalyzerService.MAX_STDERR_BUFFER / 2);
          }
          const lines = stderrBuffer.split('\n');
          stderrBuffer = lines.pop() || '';
          for (const line of lines) {
            if (line.trim()) {
              this.logger.warn({ source: 'essentia-worker', workerId }, `Worker stderr: ${line.trim()}`);
            }
          }
        });
      }

      const startupTimeout = setTimeout(() => {
        reject(new Error(`Worker ${workerId} startup timeout`));
        this.killWorkerProcess(worker);
      }, DJ_CONFIG.analysis.workerStartupTimeout);

      childProcess.on(
        'message',
        (message: {
          type: string;
          requestId?: string;
          success?: boolean;
          data?: AudioAnalysisResult;
          error?: string;
          stack?: string;
          step?: string;
          [key: string]: unknown;
        }) => {
          if (message.type === 'ready') {
            worker.ready = true;
            this.workers.set(workerId, worker);
            clearTimeout(startupTimeout);
            this.logger.info({ workerId }, 'Essentia worker ready');
            resolve();
          } else if (message.type === 'init_error') {
            this.logger.warn({ error: message.error, workerId }, 'Essentia WASM initialization failed');
            clearTimeout(startupTimeout);
            reject(new Error(message.error || 'WASM init failed'));
          } else if (message.type === 'debug') {
            this.logger.debug({ workerDebug: message, workerId }, `Worker ${workerId} step: ${message.step}`);
          } else if (message.type === 'result') {
            this.handleWorkerResult(worker, message);
          }
        },
      );

      childProcess.on('error', (error) => {
        this.logger.error({ error, workerId }, 'Essentia worker error');
        clearTimeout(startupTimeout);
        reject(error);
      });

      childProcess.on('exit', (code) => {
        clearTimeout(startupTimeout);
        if (code !== 0 && !this.shuttingDown) {
          this.logger.warn({ code, workerId }, 'Essentia worker exited with non-zero code');
        }
        this.handleWorkerExit(worker);
      });
    });
  }

  // ─── Worker result / exit handling ─────────────────────────────────

  /**
   * Called when a worker sends back an analysis result.
   * Releases the worker and resolves/rejects the pending caller.
   */
  private handleWorkerResult(
    worker: WorkerInstance,
    message: { requestId?: string; success?: boolean; data?: AudioAnalysisResult; error?: string; stack?: string },
  ): void {
    const requestId = message.requestId;

    // Worker finished processing — release it regardless of whether the caller timed out
    worker.busy = false;
    worker.analysisCount++;
    this.serveNextCaller(worker);

    // Resolve or reject the pending request (if not already timed out)
    if (requestId && this.pendingRequests.has(requestId)) {
      const { resolve, reject, timeout } = this.pendingRequests.get(requestId)!;
      clearTimeout(timeout);
      this.pendingRequests.delete(requestId);

      if (message.success && message.data) {
        resolve(message.data);
      } else {
        this.logger.warn(
          { workerError: message.error, workerStack: message.stack, workerId: worker.id },
          'Worker returned error for analysis',
        );
        reject(new Error(message.error || 'Analysis failed'));
      }
    } else if (requestId) {
      // Request already timed out — worker released, nothing else to do
      this.logger.debug(
        { requestId, workerId: worker.id },
        'Late result for timed-out request (worker released)',
      );
    }
  }

  /**
   * Called when a worker process exits (crash, recycle, or shutdown).
   * Rejects pending requests for that worker and spawns a replacement if needed.
   */
  private handleWorkerExit(worker: WorkerInstance): void {
    const workerId = worker.id;
    worker.ready = false;
    worker.busy = false;
    this.workers.delete(workerId);

    // Reject all pending requests assigned to this worker
    for (const [requestId, pending] of this.pendingRequests) {
      if (pending.workerId === workerId) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(requestId);
        pending.reject(new Error('Worker exited unexpectedly'));
      }
    }

    // Auto-replace only after pool is initialized and not shutting down
    if (!this.shuttingDown && this.poolReady) {
      this.logger.info({ workerId }, 'Spawning replacement worker');
      this.spawnWorker().then(
        () => {
          // New worker is ready — serve any callers waiting in queue
          for (const [, w] of this.workers) {
            if (w.ready && !w.busy && this.waitingCallers.length > 0) {
              this.serveNextCaller(w);
              break;
            }
          }
        },
        (error) => {
          this.logger.error({ error, workerId }, 'Failed to spawn replacement worker');
          // If no workers remain, reject all waiting callers
          if (this.workers.size === 0) {
            this.drainWaitingCallers(new Error('No Essentia workers available'));
          }
        },
      );
    }
  }

  // ─── Worker acquisition / release ──────────────────────────────────

  /**
   * Acquire an idle worker. If all are busy, the caller waits in a FIFO queue
   * until one finishes its current analysis.
   */
  private acquireWorker(): Promise<WorkerInstance> {
    for (const [, worker] of this.workers) {
      if (worker.ready && !worker.busy) {
        // Recycle if past threshold
        if (worker.analysisCount >= EssentiaAnalyzerService.RESTART_THRESHOLD) {
          this.logger.info({ workerId: worker.id, count: worker.analysisCount }, 'Recycling worker for memory health');
          this.killWorkerProcess(worker);
          continue;
        }
        worker.busy = true;
        return Promise.resolve(worker);
      }
    }

    // All workers busy — wait in queue
    return new Promise<WorkerInstance>((resolve, reject) => {
      this.waitingCallers.push({ resolve, reject });
    });
  }

  /**
   * After a worker finishes, hand it to the next waiting caller (FIFO).
   * If the worker exceeded the restart threshold, recycle it instead.
   */
  private serveNextCaller(worker: WorkerInstance): void {
    if (worker.analysisCount >= EssentiaAnalyzerService.RESTART_THRESHOLD) {
      this.logger.info({ workerId: worker.id, count: worker.analysisCount }, 'Recycling worker for memory health');
      this.killWorkerProcess(worker);
      // handleWorkerExit → replacement spawn → serve waiters
      return;
    }

    if (this.waitingCallers.length > 0 && worker.ready && !worker.busy) {
      const caller = this.waitingCallers.shift()!;
      worker.busy = true;
      caller.resolve(worker);
    }
  }

  /**
   * Reject all callers currently waiting for a worker.
   */
  private drainWaitingCallers(error: Error): void {
    while (this.waitingCallers.length > 0) {
      const caller = this.waitingCallers.shift()!;
      caller.reject(error);
    }
  }

  // ─── Worker termination ────────────────────────────────────────────

  /**
   * Gracefully kill a single worker process.
   * Sends 'exit' IPC, then SIGTERM after 200ms.
   */
  private killWorkerProcess(worker: WorkerInstance): void {
    try {
      worker.process.send({ type: 'exit' });
      setTimeout(() => {
        try {
          worker.process.kill();
        } catch {
          /* already dead */
        }
      }, 200);
    } catch {
      try {
        worker.process.kill();
      } catch {
        /* already dead */
      }
    }
  }

  /**
   * Shut down the entire pool: reject all pending work, kill all workers.
   */
  private async terminateAll(): Promise<void> {
    this.drainWaitingCallers(new Error('Service shutting down'));

    for (const [requestId, { reject, timeout }] of this.pendingRequests) {
      clearTimeout(timeout);
      reject(new Error('Service shutting down'));
      this.pendingRequests.delete(requestId);
    }

    const killPromises = Array.from(this.workers.values()).map(
      (worker) =>
        new Promise<void>((resolve) => {
          const onExit = () => resolve();
          worker.process.once('exit', onExit);
          this.killWorkerProcess(worker);
          // Force-resolve after 1s so shutdown doesn't hang
          setTimeout(() => {
            worker.process.removeListener('exit', onExit);
            resolve();
          }, 1000);
        }),
    );

    await Promise.all(killPromises);
    this.workers.clear();
    this.poolReady = false;
    this.poolInitPromise = null;
  }

  // ─── IAudioAnalyzer interface ──────────────────────────────────────

  async isAvailable(): Promise<boolean> {
    try {
      await this.initPool();
      return this.workers.size > 0;
    } catch {
      return false;
    }
  }

  getName(): string {
    return 'essentia';
  }

  async analyze(filePath: string): Promise<AudioAnalysisResult> {
    // Try Essentia.js pool first
    try {
      await this.initPool();
      const result = await this.analyzeWithEssentia(filePath);
      if (result.bpm > 0 || result.key !== 'Unknown') {
        return result;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn({ error: errorMessage, filePath }, 'Essentia analysis failed, falling back to FFmpeg');
    }

    // Fallback to FFmpeg for energy only
    return this.analyzeWithFfmpeg(filePath);
  }

  // ─── Analysis implementations ──────────────────────────────────────

  private async analyzeWithEssentia(filePath: string): Promise<AudioAnalysisResult> {
    const worker = await this.acquireWorker();
    const requestId = crypto.randomUUID();

    return new Promise<AudioAnalysisResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        // Reject caller but do NOT release worker — WASM is still processing.
        // Worker will be released when the late result arrives in handleWorkerResult.
        this.pendingRequests.delete(requestId);
        reject(new Error('Analysis timeout'));
      }, DJ_CONFIG.analysis.timeout);

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout,
        workerId: worker.id,
      });

      try {
        worker.process.send({
          type: 'analyze',
          requestId,
          filePath,
          ffmpegPath: getFfmpegPath(),
        });
      } catch (error) {
        // Worker process died between acquire and send
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        worker.busy = false;
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private async analyzeWithFfmpeg(filePath: string): Promise<AudioAnalysisResult> {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);

    this.logger.debug({ filePath }, 'Analyzing audio with FFmpeg');

    try {
      // Get audio info with FFprobe
      const { stdout } = await execFileAsync(
        getFfprobePath(),
        ['-v', 'quiet', '-print_format', 'json', '-show_streams', '-show_format', filePath],
        { encoding: 'utf8' },
      );

      const info = JSON.parse(stdout);
      const _duration = parseFloat(info.format?.duration || '0');

      // Basic energy analysis using loudness
      // Note: volumedetect output goes to stderr, must specify encoding
      const { stderr: loudnessOutput } = await execFileAsync(
        getFfmpegPath(),
        ['-i', filePath, '-af', 'volumedetect', '-f', 'null', '/dev/null'],
        { timeout: 60000, encoding: 'utf8' },
      );

      // Parse mean volume for energy estimate
      const meanVolumeMatch = loudnessOutput.match(/mean_volume:\s*(-?\d+\.?\d*)/);
      const meanVolume = meanVolumeMatch ? parseFloat(meanVolumeMatch[1]) : -20;

      // Convert dB to 0-1 scale with music-calibrated range
      // Linear: -35dB (very quiet acoustic) → 0, -5dB (loud mastered) → 1
      const linearEnergy = Math.min(1, Math.max(0, (meanVolume + 35) / 30));
      // Sigmoid contrast to spread values across full 0-1 range
      // Center 0.50, steepness 6: maps -30dB→0.12, -20dB→0.50, -10dB→0.88
      const energy = 1 / (1 + Math.exp(-6 * (linearEnergy - 0.50)));

      return {
        bpm: 0,
        key: 'Unknown',
        energy,
        danceability: undefined,
      };
    } catch (error) {
      this.logger.error({ error, filePath }, 'FFmpeg analysis failed');
      throw error;
    }
  }
}
