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
 * Format bytes to human readable size (KB, MB, GB, etc.)
 * @param bytes - Size in bytes
 * @returns Formatted size string
 */
export function formatFileSize(bytes?: number | string): string {
  if (!bytes) return 'Desconocido';

  // If already formatted as string, return it
  if (typeof bytes === 'string') return bytes;

  if (!isFinite(bytes)) return 'Desconocido';

  const kb = bytes / 1024;
  const mb = kb / 1024;
  const gb = mb / 1024;

  if (gb >= 1) {
    return `${gb.toFixed(2)} GB`;
  }
  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`;
  }
  if (kb >= 1) {
    return `${kb.toFixed(2)} KB`;
  }
  return `${bytes} bytes`;
}

/**
 * Format bytes using 1024-based units (B, KB, MB, GB, TB)
 * Similar to formatFileSize but with more units and different formatting
 * @param bytes - Size in bytes
 * @returns Formatted size string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
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

/**
 * Format date to localized Spanish string
 * @param date - Date string, Date object, or undefined
 * @returns Formatted date string
 */
export function formatDate(date?: Date | string): string {
  if (!date) return 'Desconocida';
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format date to short format (DD/MM/YYYY HH:mm)
 * @param dateString - Date string
 * @returns Formatted date string
 */
export function formatDateShort(dateString?: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format date with time including seconds (DD/MM/YYYY HH:mm:ss)
 * @param dateString - Date string
 * @returns Formatted date string
 */
export function formatDateWithTime(dateString?: string): string {
  if (!dateString) return 'N/A';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(dateString));
}

/**
 * Format date with abbreviated month and time (e.g., "15 ene 2024, 14:30")
 * @param dateString - Date string
 * @returns Formatted date string
 */
export function formatDateCompact(dateString?: string): string {
  if (!dateString) return 'Nunca';
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format date to relative time (e.g., "hace 5 minutos", "hace 2 horas")
 * @param date - Date object
 * @returns Formatted relative time string
 */
export function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) {
    return 'hace unos segundos';
  }
  if (diffMins < 60) {
    return `hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
  }
  if (diffHours < 24) {
    return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  }
  if (diffDays < 7) {
    return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
  }
  if (diffWeeks < 4) {
    return `hace ${diffWeeks} ${diffWeeks === 1 ? 'semana' : 'semanas'}`;
  }
  return `hace ${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'}`;
}
