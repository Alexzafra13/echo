/**
 * Format seconds to MM:SS or HH:MM:SS format
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
export function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined || isNaN(seconds) || seconds < 0) {
    return '0:00';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format bytes using 1024-based units (B, KB, MB, GB, TB)
 * @param bytes - Size in bytes
 * @returns Formatted size string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (!isFinite(bytes)) return 'Desconocido';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format bytes to human readable size
 * Wrapper around formatBytes with additional input handling
 * @param bytes - Size in bytes (number or string)
 * @returns Formatted size string
 */
export function formatFileSize(bytes?: number | string): string {
  if (!bytes) return 'Desconocido';
  if (typeof bytes === 'string') return bytes;
  return formatBytes(bytes);
}

/**
 * Format bitrate to kbps string
 * @param bitrate - Bitrate in kbps
 * @returns Formatted bitrate string
 */
export function formatBitrate(bitrate?: number): string {
  if (!bitrate) return 'Desconocido';
  return `${bitrate} kbps`;
}

// Re-export date formatting functions from the canonical source
// This maintains backward compatibility for existing imports
export {
  formatDate,
  formatDateShort,
  formatDateWithTime,
  formatDateCompact,
  formatDistanceToNow,
} from './date.utils';
