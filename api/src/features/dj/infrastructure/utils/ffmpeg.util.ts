import ffmpegStatic from 'ffmpeg-static';
import * as fs from 'fs';

/**
 * Get the path to the FFmpeg binary
 * Uses ffmpeg-static if available, otherwise falls back to system ffmpeg
 */
export function getFfmpegPath(): string {
  if (ffmpegStatic && typeof ffmpegStatic === 'string') {
    return ffmpegStatic;
  }
  return 'ffmpeg';
}

/**
 * Get the path to the FFprobe binary
 * Uses @ffprobe-installer/ffprobe if available, otherwise falls back to system ffprobe
 */
export function getFfprobePath(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
    if (ffprobeInstaller?.path && fs.existsSync(ffprobeInstaller.path)) {
      return ffprobeInstaller.path;
    }
  } catch {
    // Package not available, fall through
  }
  return 'ffprobe';
}
