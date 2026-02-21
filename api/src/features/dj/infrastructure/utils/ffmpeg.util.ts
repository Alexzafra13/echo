import ffmpegStatic from 'ffmpeg-static';
import * as fs from 'fs';

/**
 * Ensure a binary file has execute permission.
 * Tries chmod if not already executable. Returns false if it can't be fixed.
 */
function ensureExecutable(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    try {
      fs.chmodSync(filePath, 0o755);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Get the path to the FFmpeg binary
 * Uses ffmpeg-static if available and executable, otherwise falls back to system ffmpeg
 */
export function getFfmpegPath(): string {
  if (ffmpegStatic && typeof ffmpegStatic === 'string' && fs.existsSync(ffmpegStatic)) {
    if (ensureExecutable(ffmpegStatic)) return ffmpegStatic;
  }
  return 'ffmpeg';
}

/**
 * Get the path to the FFprobe binary
 * Uses @ffprobe-installer/ffprobe if available and executable, otherwise falls back to system ffprobe
 */
export function getFfprobePath(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
    if (ffprobeInstaller?.path && fs.existsSync(ffprobeInstaller.path)) {
      if (ensureExecutable(ffprobeInstaller.path)) return ffprobeInstaller.path;
    }
  } catch {
    // Package not available, fall through
  }
  return 'ffprobe';
}
