/**
 * History Tab Utilities
 *
 * Utility functions for enrichment history display
 */

import { CheckCircle, AlertCircle, XCircle, Music, Disc, Radio } from 'lucide-react';
import { formatDateCompact } from '@shared/utils/date.utils';
import { getProviderBranding } from '../../constants/providerBranding';
import styles from './HistoryTab.module.css';

/** Map raw provider names to branding keys */
const PROVIDER_KEY_MAP: Record<string, string> = {
  'last.fm': 'lastfm',
  'lastfm': 'lastfm',
  'fanart.tv': 'fanart',
  'fanart': 'fanart',
  'musicbrainz': 'musicbrainz',
  'cover art archive': 'coverartarchive',
  'coverartarchive': 'coverartarchive',
  'coverart': 'coverartarchive',
  'wikipedia': 'wikipedia',
  'google-favicon': 'google-favicon',
  'google favicon': 'google-favicon',
  'apple-touch-icon': 'apple-touch-icon',
  'apple touch icon': 'apple-touch-icon',
};

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
  if (type === 'artist') return <Music size={16} />;
  if (type === 'radio') return <Radio size={16} />;
  return <Disc size={16} />;
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
    } else if (log.entityType === 'radio') {
      return `/api/images/radio/${log.entityId || log.id}/favicon`;
    }
  }

  // Default: treat as relative API path
  return `/api${value.startsWith('/') ? value : '/' + value}`;
}

/**
 * Get provider display with logo and name
 */
export function getProviderDisplay(provider: string) {
  const key = PROVIDER_KEY_MAP[provider.toLowerCase()] || provider.toLowerCase();
  const branding = getProviderBranding(key);

  if (branding) {
    return (
      <span className={styles.providerBadge}>
        <img
          src={branding.logoPath}
          alt={branding.name}
          className={styles.providerBadgeLogo}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = '';
          }}
        />
        <span style={{ display: 'none' }}>{branding.name}</span>
      </span>
    );
  }

  return <span className={styles.providerBadge}>{provider}</span>;
}
