/**
 * FFmpeg Utility
 *
 * Provides the correct FFmpeg path for both development and production:
 * - Development: Uses ffmpeg-static (bundled binary via npm)
 * - Production/Docker: Uses system ffmpeg (installed via apk/apt)
 */

import { existsSync } from 'fs';

let ffmpegPath: string | null = null;
let ffprobePath: string | null = null;

/**
 * Get the path to the ffmpeg binary
 * Prefers ffmpeg-static in development, falls back to system ffmpeg
 */
export function getFfmpegPath(): string {
  if (ffmpegPath) return ffmpegPath;

  try {
    // Try to use ffmpeg-static first (development)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffmpegStatic = require('ffmpeg-static') as string | undefined;
    if (ffmpegStatic && existsSync(ffmpegStatic)) {
      ffmpegPath = ffmpegStatic;
      return ffmpegStatic;
    }
  } catch {
    // ffmpeg-static not available
  }

  // Fall back to system ffmpeg (production/Docker)
  ffmpegPath = 'ffmpeg';
  return 'ffmpeg';
}

/**
 * Get the path to the ffprobe binary
 * Uses @ffprobe-installer/ffprobe in development, system ffprobe in production
 */
export function getFfprobePath(): string {
  if (ffprobePath) return ffprobePath;

  try {
    // Try @ffprobe-installer/ffprobe first (development)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffprobeInstaller = require('@ffprobe-installer/ffprobe') as { path?: string } | undefined;
    if (ffprobeInstaller?.path && existsSync(ffprobeInstaller.path)) {
      ffprobePath = ffprobeInstaller.path;
      return ffprobeInstaller.path;
    }
  } catch {
    // @ffprobe-installer/ffprobe not available
  }

  // Fall back to system ffprobe
  ffprobePath = 'ffprobe';
  return 'ffprobe';
}

/**
 * Check if FFmpeg is available
 */
export async function isFfmpegAvailable(): Promise<boolean> {
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const execFileAsync = promisify(execFile);

  try {
    await execFileAsync(getFfmpegPath(), ['-version']);
    return true;
  } catch {
    return false;
  }
}

export interface RunFfmpegOptions {
  /** Timeout in milliseconds (default: 5 minutes) */
  timeout?: number;
  /** Description for error messages */
  description?: string;
}

/**
 * Run FFmpeg with proper timeout and cleanup
 *
 * Features:
 * - Configurable timeout (default 5 min)
 * - Kills process on timeout/error
 * - Captures stderr for error messages
 *
 * @example
 * await runFfmpeg(['-i', input, '-af', 'atempo=1.1', output]);
 */
export async function runFfmpeg(
  args: string[],
  options: RunFfmpegOptions = {},
): Promise<void> {
  const { spawn } = await import('child_process');
  const { timeout = 5 * 60 * 1000, description = 'FFmpeg process' } = options;

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(getFfmpegPath(), args);
    let settled = false;
    let stderr = '';

    const cleanup = () => {
      if (!ffmpeg.killed) {
        ffmpeg.kill('SIGKILL');
      }
    };

    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error(`${description} timeout after ${timeout / 1000}s`));
      }
    }, timeout);

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      clearTimeout(timeoutId);
      if (settled) return;
      settled = true;

      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${description} exited with code ${code}: ${stderr.slice(-500)}`));
      }
    });

    ffmpeg.on('error', (err) => {
      clearTimeout(timeoutId);
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(`${description} spawn error: ${err.message}`));
    });
  });
}

/**
 * Run FFmpeg and return stdout as Buffer (for piped output)
 */
export async function runFfmpegWithOutput(
  args: string[],
  options: RunFfmpegOptions & { maxBuffer?: number } = {},
): Promise<Buffer> {
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const execFileAsync = promisify(execFile);
  const { timeout = 5 * 60 * 1000, maxBuffer = 100 * 1024 * 1024 } = options;

  const { stdout } = await execFileAsync(getFfmpegPath(), args, {
    encoding: 'buffer',
    maxBuffer,
    timeout,
  });

  return stdout;
}

/**
 * Get audio duration in seconds using FFprobe
 */
export async function getAudioDuration(inputPath: string): Promise<number> {
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const execFileAsync = promisify(execFile);

  const { stdout } = await execFileAsync(getFfprobePath(), [
    '-v', 'quiet',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    inputPath,
  ]);

  return parseFloat(stdout.trim()) || 0;
}
