import ffmpegStatic from 'ffmpeg-static';
import * as path from 'path';

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
 * Assumes ffprobe is in the same directory as ffmpeg
 */
export function getFfprobePath(): string {
  const ffmpegPath = getFfmpegPath();
  if (ffmpegPath === 'ffmpeg') {
    return 'ffprobe';
  }
  const dir = path.dirname(ffmpegPath);
  const ext = process.platform === 'win32' ? '.exe' : '';
  return path.join(dir, `ffprobe${ext}`);
}
