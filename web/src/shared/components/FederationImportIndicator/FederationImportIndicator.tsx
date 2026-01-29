import { Download, CheckCircle, XCircle } from 'lucide-react';
import { useAlbumImportWebSocket } from '@features/federation/hooks/useAlbumImportWebSocket';
import styles from './FederationImportIndicator.module.css';

/**
 * FederationImportIndicator Component
 * Shows federation album import progress in the header
 * Only visible when there are active imports
 */
export function FederationImportIndicator() {
  const { activeImports, hasActiveImports } = useAlbumImportWebSocket();

  if (!hasActiveImports) {
    return null;
  }

  // Get the most recent/active import to display
  const currentImport = activeImports[0];
  if (!currentImport) return null;

  const { albumName, artistName, status, progress, currentTrack, totalTracks } = currentImport;

  // Determine icon and color based on status
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={14} className={styles.iconCompleted} />;
      case 'failed':
        return <XCircle size={14} className={styles.iconFailed} />;
      default:
        return <Download size={14} className={styles.iconDownloading} />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'failed':
        return 'Error';
      default:
        return `${currentTrack}/${totalTracks}`;
    }
  };

  // Truncate album name for display
  const displayName = albumName.length > 20 ? `${albumName.slice(0, 18)}...` : albumName;

  return (
    <div className={`${styles.container} ${styles[`container--${status}`]}`} title={`${artistName} - ${albumName}`}>
      {getStatusIcon()}
      <span className={styles.text}>
        <span className={styles.albumName}>{displayName}</span>
        <span className={styles.status}>{getStatusText()}</span>
      </span>
      {status === 'downloading' && (
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {activeImports.length > 1 && (
        <span className={styles.badge}>+{activeImports.length - 1}</span>
      )}
    </div>
  );
}
