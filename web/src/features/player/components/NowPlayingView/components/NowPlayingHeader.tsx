import { ChevronDown, ListMusic } from 'lucide-react';
import styles from '../NowPlayingView.module.css';

interface NowPlayingHeaderProps {
  albumName: string | undefined;
  onClose: () => void;
  // Mobile queue button props
  showQueueButton?: boolean;
  queueLength?: number;
  isQueueOpen?: boolean;
  onToggleQueue?: () => void;
}

/**
 * NowPlayingHeader - Header with close button and album name
 * On mobile, also shows the queue button on the right side
 */
export function NowPlayingHeader({
  albumName,
  onClose,
  showQueueButton = false,
  queueLength = 0,
  isQueueOpen = false,
  onToggleQueue,
}: NowPlayingHeaderProps) {
  return (
    <div className={styles.nowPlaying__header}>
      <button className={styles.nowPlaying__closeBtn} onClick={onClose} title="Cerrar">
        <ChevronDown size={28} />
      </button>
      <div className={styles.nowPlaying__headerTitle}>
        {albumName || 'Reproduciendo'}
      </div>
      {showQueueButton && onToggleQueue ? (
        <button
          className={`${styles.nowPlaying__headerQueueBtn} ${isQueueOpen ? styles['nowPlaying__headerQueueBtn--active'] : ''}`}
          onClick={onToggleQueue}
          title="Cola de reproducción"
        >
          <ListMusic size={22} />
          {queueLength > 0 && (
            <span className={styles.nowPlaying__headerQueueBadge}>{queueLength}</span>
          )}
        </button>
      ) : (
        <div className={styles.nowPlaying__headerSpacer} />
      )}
    </div>
  );
}
