import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import * as path from 'path';
import * as fs from 'fs';
import { fork, ChildProcess } from 'child_process';
import {
  IAudioAnalyzer,
  AudioAnalysisResult,
} from '../../domain/ports/audio-analyzer.port';
import { getFfmpegPath, getFfprobePath } from '../utils/ffmpeg.util';
import { DJ_CONFIG } from '../../config/dj.config';

/**
 * EssentiaAnalyzerService - Audio analysis using Essentia.js
 *
 * Essentia.js runs in a child process with stdout/stderr redirected to /dev/null
 * to suppress WASM debug output. Falls back to FFmpeg if Essentia fails.
 */
@Injectable()
export class EssentiaAnalyzerService implements IAudioAnalyzer, OnModuleDestroy {
  private worker: ChildProcess | null = null;
  private workerReady = false;
  private nullFd: number = -1; // Track FD for cleanup
  private spawningPromise: Promise<void> | null = null; // Prevent race condition
  private pendingRequests: Map<
    string,
    {
      resolve: (result: AudioAnalysisResult) => void;
      reject: (error: Error) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  > = new Map();

  constructor(
    @InjectPinoLogger(EssentiaAnalyzerService.name)
    private readonly logger: PinoLogger,
  ) {
    this.logger.info('DJ Analysis service initialized (Essentia.js + FFmpeg backend)');
  }

  async onModuleDestroy() {
    await this.terminateWorker();
  }

  private closeFd(): void {
    if (this.nullFd >= 0) {
      try {
        fs.closeSync(this.nullFd);
      } catch {
        // Ignore close errors
      }
      this.nullFd = -1;
    }
  }

  private async spawnWorker(): Promise<void> {
    // Already ready
    if (this.worker && this.workerReady) return;

    // Already spawning - wait for existing promise (prevents race condition)
    if (this.spawningPromise) {
      return this.spawningPromise;
    }

    this.spawningPromise = new Promise<void>((resolve, reject) => {
      // Worker is in dist/features/... but compiled TS is in dist/src/...
      // Use process.cwd() to get the api root, then find the worker
      const workerPath = path.join(
        process.cwd(),
        'dist',
        'features',
        'dj',
        'infrastructure',
        'workers',
        'essentia-worker.js',
      );

      // Check if worker file exists
      if (!fs.existsSync(workerPath)) {
        this.logger.warn({ workerPath }, 'Essentia worker not found, using FFmpeg only');
        reject(new Error('Worker not found'));
        return;
      }

      // Open /dev/null for stdout/stderr suppression
      try {
        this.nullFd = fs.openSync('/dev/null', 'w');
      } catch {
        // Windows fallback - use 'ignore'
        this.logger.debug('Using ignore for stdio (Windows or no /dev/null)');
        this.nullFd = -1;
      }

      const stdioConfig: ('ipc' | 'ignore' | number)[] =
        this.nullFd >= 0
          ? ['ignore', this.nullFd, this.nullFd, 'ipc']
          : ['ignore', 'ignore', 'ignore', 'ipc'];

      try {
        this.worker = fork(workerPath, [], {
          stdio: stdioConfig,
          env: { ...process.env, NODE_ENV: process.env.NODE_ENV },
        });
      } catch (error) {
        this.closeFd(); // Clean up FD on fork failure
        reject(error);
        return;
      }

      const timeout = setTimeout(() => {
        this.closeFd(); // Clean up FD on timeout
        reject(new Error('Worker startup timeout'));
        this.terminateWorker();
      }, DJ_CONFIG.analysis.workerStartupTimeout);

      this.worker.on('message', (message: { type: string; requestId?: string; success?: boolean; data?: AudioAnalysisResult; error?: string; stack?: string; step?: string; [key: string]: unknown }) => {
        if (message.type === 'ready') {
          this.workerReady = true;
          this.spawningPromise = null;
          clearTimeout(timeout);
          this.logger.info('Essentia worker ready');
          resolve();
        } else if (message.type === 'debug') {
          // Log debug messages from worker
          this.logger.debug({ workerDebug: message }, `Worker step: ${message.step}`);
        } else if (message.type === 'result') {
          // Match response to request using requestId
          const requestId = message.requestId;
          if (requestId && this.pendingRequests.has(requestId)) {
            const { resolve: res, reject: rej } = this.pendingRequests.get(requestId)!;
            this.pendingRequests.delete(requestId);

            if (message.success && message.data) {
              res(message.data);
            } else {
              this.logger.debug({ workerError: message.error, workerStack: message.stack }, 'Worker returned error');
              rej(new Error(message.error || 'Analysis failed'));
            }
          } else {
            this.logger.warn({ requestId }, 'Received result for unknown requestId');
          }
        }
      });

      this.worker.on('error', (error) => {
        this.logger.error({ error }, 'Essentia worker error');
        clearTimeout(timeout);
        this.closeFd(); // Clean up FD on error
        this.workerReady = false;
        this.spawningPromise = null;
        reject(error);
      });

      this.worker.on('exit', (code) => {
        this.closeFd(); // Clean up FD on exit
        this.workerReady = false;
        this.spawningPromise = null;
        this.worker = null;
        // Reject all pending requests and clear their timeouts (prevents memory leak)
        for (const [requestId, { reject: rej, timeout: reqTimeout }] of this.pendingRequests) {
          clearTimeout(reqTimeout);
          rej(new Error('Worker exited unexpectedly'));
        }
        this.pendingRequests.clear();
        if (code !== 0) {
          this.logger.warn({ code }, 'Essentia worker exited with non-zero code');
        }
      });
    });

    return this.spawningPromise;
  }

  private async terminateWorker(): Promise<void> {
    if (this.worker) {
      try {
        this.worker.send({ type: 'exit' });
        await new Promise<void>((resolve) => setTimeout(resolve, 100));
        this.worker.kill();
      } catch {
        // Ignore termination errors
      }
      this.worker = null;
      this.workerReady = false;
    }
    this.closeFd();
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.spawnWorker();
      return this.workerReady;
    } catch {
      return false;
    }
  }

  getName(): string {
    return 'essentia';
  }

  async analyze(filePath: string): Promise<AudioAnalysisResult> {
    // Try Essentia.js first
    try {
      const result = await this.analyzeWithEssentia(filePath);
      if (result.bpm > 0 || result.key !== 'Unknown') {
        return result;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.debug({ error: errorMessage, filePath }, 'Essentia analysis failed, falling back to FFmpeg');
    }

    // Fallback to FFmpeg for energy only
    return this.analyzeWithFfmpeg(filePath);
  }

  private async analyzeWithEssentia(filePath: string): Promise<AudioAnalysisResult> {
    await this.spawnWorker();

    if (!this.worker || !this.workerReady) {
      throw new Error('Essentia worker not available');
    }

    return new Promise((resolve, reject) => {
      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Analysis timeout'));
      }, DJ_CONFIG.analysis.timeout);

      // Store request with timeout reference (for cleanup on worker exit)
      this.pendingRequests.set(requestId, {
        resolve: (result) => {
          clearTimeout(timeout);
          this.pendingRequests.delete(requestId);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeout);
          this.pendingRequests.delete(requestId);
          reject(error);
        },
        timeout,
      });

      // Send message with requestId and ffmpegPath for correlation
      this.worker!.send({
        type: 'analyze',
        requestId,
        filePath,
        ffmpegPath: getFfmpegPath(),
      });
    });
  }

  private async analyzeWithFfmpeg(filePath: string): Promise<AudioAnalysisResult> {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);

    this.logger.debug({ filePath }, 'Analyzing audio with FFmpeg');

    try {
      // Get audio info with FFprobe
      const { stdout } = await execFileAsync(getFfprobePath(), [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_streams',
        '-show_format',
        filePath,
      ]);

      const info = JSON.parse(stdout);
      const _duration = parseFloat(info.format?.duration || '0');

      // Basic energy analysis using loudness
      const { stderr: loudnessOutput } = await execFileAsync(
        getFfmpegPath(),
        ['-i', filePath, '-af', 'volumedetect', '-f', 'null', '-'],
        { timeout: 60000 },
      );

      // Parse mean volume for energy estimate
      const meanVolumeMatch = loudnessOutput.match(/mean_volume:\s*(-?\d+\.?\d*)/);
      const meanVolume = meanVolumeMatch ? parseFloat(meanVolumeMatch[1]) : -20;

      // Convert dB to 0-1 scale (roughly: -60dB = 0, 0dB = 1)
      const energy = Math.min(1, Math.max(0, (meanVolume + 60) / 60));

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
