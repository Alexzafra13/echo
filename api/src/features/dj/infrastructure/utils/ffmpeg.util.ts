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
