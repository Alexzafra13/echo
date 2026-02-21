/**
 * History Tab Utilities
 *
 * Utility functions for enrichment history display
 */

import { CheckCircle, AlertCircle, XCircle, Music, Disc } from 'lucide-react';
import { formatDateCompact } from '@shared/utils/date.utils';
import styles from './HistoryTab.module.css';

// Re-export formatDate using the compact format for backward compatibility
export const formatDate = formatDateCompact;

/**
 * Get status badge with icon
 */
export function getStatusBadge(status: string) {
  const classes = {
    success: styles.badgeSuccess,
    partial: styles.badgePartial,
    error: styles.badgeError,
  };
  const icons = {
    success: <CheckCircle size={14} />,
    partial: <AlertCircle size={14} />,
    error: <XCircle size={14} />,
  };
  const labels = {
    success: 'Éxito',
    partial: 'Parcial',
    error: 'Error',
  };

  return (
    <span className={`${styles.badge} ${classes[status as keyof typeof classes]}`}>
      {icons[status as keyof typeof icons]}
      {labels[status as keyof typeof labels]}
    </span>
  );
}

/**
 * Get entity icon
 */
export function getEntityIcon(type: string) {
  return type === 'artist' ? <Music size={16} /> : <Disc size={16} />;
}

/**
 * Build complete image URL for preview
 */
export function buildImageUrl(log: {
  previewUrl?: string;
  entityType?: string;
  entityId?: string;
  id?: string;
}): string | null {
  const value = log.previewUrl;
  if (!value) return null;

  // Already a complete URL (http/https)
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  // API path (new format) - just use it directly, the proxy will handle it
  if (value.startsWith('/api/')) {
    return value;
  }

  // Old format: file path - construct API URL using entityId
  // Examples: "uploads\music\..." or "/uploads/music/..."
  if (value.includes('uploads') || value.includes('\\')) {
    if (log.entityType === 'album') {
      return `/api/images/albums/${log.entityId || log.id}/cover`;
    } else if (log.entityType === 'artist') {
      return `/api/images/artists/${log.entityId || log.id}/profile`;
    }
  }

  // Default: treat as relative API path
  return `/api${value.startsWith('/') ? value : '/' + value}`;
}
