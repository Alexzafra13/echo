import { useState } from 'react';
import { Download, CheckCircle, XCircle } from 'lucide-react';
import { useImportProgressSSE } from '@features/federation/hooks/useImportProgressSSE';
import styles from './FederationImportIndicator.module.css';

/**
 * FederationImportIndicator Component
 * Shows federation album import progress in the header
 * Only visible when there are active imports
 */
export function FederationImportIndicator() {
  const { activeImports, hasActiveImports } = useImportProgressSSE();
  const [imageError, setImageError] = useState(false);

  if (!hasActiveImports) {
    return null;
  }

  // Get the most recent/active import to display
  const currentImport = activeImports[0];
  if (!currentImport) return null;

  const { albumName, artistName, status, progress, currentTrack, totalTracks, coverUrl } =
    currentImport;

  // Determine icon based on status (fallback when no cover)
  const getIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={14} className={styles.iconCompleted} />;
      case 'failed':
        return <XCircle size={14} className={styles.iconFailed} />;
      default:
        return <Download size={14} className={styles.iconDownloading} />;
    }
  };

  // Truncate album name for display
  const displayName = albumName.length > 18 ? `${albumName.slice(0, 16)}...` : albumName;

  // Show cover or icon
  const hasCover = coverUrl && !imageError;

  return (
    <div
      className={`${styles.container} ${styles[`container--${status}`]}`}
      title={`${artistName} - ${albumName} (${currentTrack}/${totalTracks})`}
    >
      {/* Album cover or icon */}
      <div
        className={`${styles.coverWrapper} ${styles[`coverWrapper--${status}`]} ${hasCover ? styles['coverWrapper--hasCover'] : ''}`}
      >
        {hasCover ? (
          <img
            src={coverUrl}
            alt={albumName}
            className={styles.coverImage}
            onError={() => setImageError(true)}
          />
        ) : (
          getIcon()
        )}
        {/* Status overlay for cover */}
        {hasCover && status !== 'downloading' && (
          <div className={styles.statusOverlay}>
            {status === 'completed' ? (
              <CheckCircle size={12} className={styles.iconCompleted} />
            ) : (
              <XCircle size={12} className={styles.iconFailed} />
            )}
          </div>
        )}
      </div>

      {/* Desktop content */}
      <div className={styles.content}>
        <span className={styles.albumName}>{displayName}</span>
        <div className={styles.progressRow}>
          {status === 'downloading' && (
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          <span className={styles.status}>
            {status === 'completed'
              ? 'Listo'
              : status === 'failed'
                ? 'Error'
                : `${currentTrack}/${totalTracks}`}
          </span>
        </div>
      </div>

      {/* Mobile compact info */}
      <div className={styles.mobileInfo}>
        <span className={styles.mobileStatus}>
          {status === 'completed'
            ? '✓'
            : status === 'failed'
              ? '✗'
              : `${currentTrack}/${totalTracks}`}
        </span>
      </div>

      {activeImports.length > 1 && (
        <span className={styles.badge}>+{activeImports.length - 1}</span>
      )}
    </div>
  );
}
