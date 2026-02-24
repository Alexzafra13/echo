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
 * Get the path to the FFmpeg binary.
 * In production (Docker), uses the system ffmpeg installed via apk.
 * In development, tries ffmpeg-static npm package as fallback.
 */
export function getFfmpegPath(): string {
  // Try optional npm package (useful for local dev without system ffmpeg)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const ffmpegStatic = require('ffmpeg-static');
    if (ffmpegStatic && typeof ffmpegStatic === 'string' && fs.existsSync(ffmpegStatic)) {
      if (ensureExecutable(ffmpegStatic)) return ffmpegStatic;
    }
  } catch {
    // Package not installed (production Docker image), fall through to system binary
  }
  return 'ffmpeg';
}

/**
 * Get the path to the FFprobe binary.
 * In production (Docker), uses the system ffprobe installed via apk.
 * In development, tries @ffprobe-installer/ffprobe npm package as fallback.
 */
export function getFfprobePath(): string {
  // Try optional npm package (useful for local dev without system ffprobe)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
    if (ffprobeInstaller?.path && fs.existsSync(ffprobeInstaller.path)) {
      if (ensureExecutable(ffprobeInstaller.path)) return ffprobeInstaller.path;
    }
  } catch {
    // Package not installed (production Docker image), fall through to system binary
  }
  return 'ffprobe';
}
