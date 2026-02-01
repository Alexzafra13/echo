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
  private pendingRequests: Map<
    string,
    { resolve: (result: AudioAnalysisResult) => void; reject: (error: Error) => void }
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

  private async spawnWorker(): Promise<void> {
    if (this.worker && this.workerReady) return;

    return new Promise((resolve, reject) => {
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
      let nullFd: number;
      try {
        nullFd = fs.openSync('/dev/null', 'w');
      } catch {
        // Windows fallback - use 'ignore'
        this.logger.debug('Using ignore for stdio (Windows or no /dev/null)');
        nullFd = -1;
      }

      const stdioConfig: ('ipc' | 'ignore' | number)[] =
        nullFd >= 0
          ? ['ignore', nullFd, nullFd, 'ipc']
          : ['ignore', 'ignore', 'ignore', 'ipc'];

      this.worker = fork(workerPath, [], {
        stdio: stdioConfig,
        env: { ...process.env, NODE_ENV: process.env.NODE_ENV },
      });

      const timeout = setTimeout(() => {
        reject(new Error('Worker startup timeout'));
        this.terminateWorker();
      }, 30000);

      this.worker.on('message', (message: { type: string; success?: boolean; data?: AudioAnalysisResult; error?: string }) => {
        if (message.type === 'ready') {
          this.workerReady = true;
          clearTimeout(timeout);
          this.logger.info('Essentia worker ready');
          resolve();
        } else if (message.type === 'result') {
          // Find pending request and resolve it
          const entries = Array.from(this.pendingRequests.entries());
          if (entries.length > 0) {
            const [requestId, { resolve: res, reject: rej }] = entries[0];
            this.pendingRequests.delete(requestId);

            if (message.success && message.data) {
              res(message.data);
            } else {
              rej(new Error(message.error || 'Analysis failed'));
            }
          }
        }
      });

      this.worker.on('error', (error) => {
        this.logger.error({ error }, 'Essentia worker error');
        clearTimeout(timeout);
        this.workerReady = false;
        reject(error);
      });

      this.worker.on('exit', (code) => {
        if (nullFd >= 0) {
          try {
            fs.closeSync(nullFd);
          } catch {
            // Ignore close errors
          }
        }
        this.workerReady = false;
        this.worker = null;
        if (code !== 0) {
          this.logger.warn({ code }, 'Essentia worker exited with non-zero code');
        }
      });
    });
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
      this.logger.debug({ error, filePath }, 'Essentia analysis failed, falling back to FFmpeg');
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
      const requestId = `${Date.now()}-${Math.random()}`;
      this.pendingRequests.set(requestId, { resolve, reject });

      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Analysis timeout'));
      }, 120000); // 2 minute timeout for long files

      this.worker!.send({ type: 'analyze', filePath });

      // Clear timeout when resolved
      const originalResolve = resolve;
      const originalReject = reject;

      this.pendingRequests.set(requestId, {
        resolve: (result) => {
          clearTimeout(timeout);
          originalResolve(result);
        },
        reject: (error) => {
          clearTimeout(timeout);
          originalReject(error);
        },
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
        beatgrid: undefined,
      };
    } catch (error) {
      this.logger.error({ error, filePath }, 'FFmpeg analysis failed');
      throw error;
    }
  }
}
