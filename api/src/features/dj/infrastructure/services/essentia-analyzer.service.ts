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
 * Essentia.js runs in a child process. Stdout is suppressed (WASM noise),
 * stderr is piped to capture errors. Falls back to FFmpeg if Essentia fails.
 */
@Injectable()
export class EssentiaAnalyzerService implements IAudioAnalyzer, OnModuleDestroy {
  private worker: ChildProcess | null = null;
  private workerReady = false;
  private spawningPromise: Promise<void> | null = null; // Prevent race condition
  private pendingRequests: Map<
    string,
    {
      resolve: (result: AudioAnalysisResult) => void;
      reject: (error: Error) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  > = new Map();
  private analysisCount = 0;
  private static readonly RESTART_THRESHOLD = 500;

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

      // stdin: ignore, stdout: ignore (suppress WASM noise), stderr: pipe (capture errors), ipc
      try {
        this.worker = fork(workerPath, [], {
          stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
          env: { ...process.env, NODE_ENV: process.env.NODE_ENV },
        });
      } catch (error) {
        reject(error);
        return;
      }

      // Capture stderr from worker for error visibility
      if (this.worker.stderr) {
        let stderrBuffer = '';
        const MAX_STDERR_BUFFER = 64 * 1024; // 64KB max to prevent unbounded growth
        this.worker.stderr.on('data', (chunk: Buffer) => {
          stderrBuffer += chunk.toString();
          // Prevent unbounded growth from incomplete lines
          if (stderrBuffer.length > MAX_STDERR_BUFFER) {
            stderrBuffer = stderrBuffer.slice(-MAX_STDERR_BUFFER / 2);
          }
          // Flush complete lines
          const lines = stderrBuffer.split('\n');
          stderrBuffer = lines.pop() || '';
          for (const line of lines) {
            if (line.trim()) {
              this.logger.warn({ source: 'essentia-worker' }, `Worker stderr: ${line.trim()}`);
            }
          }
        });
      }

      const timeout = setTimeout(() => {
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
        } else if (message.type === 'init_error') {
          // WASM initialization failed - worker will exit
          this.logger.warn({ error: message.error }, 'Essentia WASM initialization failed');
          clearTimeout(timeout);
          this.spawningPromise = null;
          reject(new Error(message.error || 'WASM init failed'));
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
              this.logger.warn({ workerError: message.error, workerStack: message.stack }, 'Worker returned error for analysis');
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
        this.workerReady = false;
        this.spawningPromise = null;
        reject(error);
      });

      this.worker.on('exit', (code) => {
        this.workerReady = false;
        this.spawningPromise = null;
        this.worker = null;
        // Reject all pending requests and clear their timeouts (prevents memory leak)
        for (const [, { reject: rej, timeout: reqTimeout }] of this.pendingRequests) {
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
    // Periodically recycle worker to prevent WASM memory accumulation
    if (this.analysisCount >= EssentiaAnalyzerService.RESTART_THRESHOLD && this.pendingRequests.size === 0) {
      this.logger.info({ count: this.analysisCount }, 'Recycling Essentia worker for memory health');
      this.analysisCount = 0;
      await this.terminateWorker();
    }
    this.analysisCount++;

    // Try Essentia.js first
    try {
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

  private async analyzeWithEssentia(filePath: string): Promise<AudioAnalysisResult> {
    await this.spawnWorker();

    if (!this.worker || !this.workerReady) {
      throw new Error('Essentia worker not available');
    }

    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();

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
      ], { encoding: 'utf8' });

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
