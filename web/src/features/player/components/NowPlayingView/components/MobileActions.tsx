import { ListMusic } from 'lucide-react';
import styles from '../NowPlayingView.module.css';

interface MobileActionsProps {
  queueLength: number;
  isQueueOpen: boolean;
  onToggleQueue: () => void;
}

/**
 * MobileActions - Queue button for mobile view
 */
export function MobileActions({
  queueLength,
  isQueueOpen,
  onToggleQueue,
}: MobileActionsProps) {
  return (
    <div className={styles.nowPlaying__actions}>
      <button
        className={`${styles.nowPlaying__actionBtn} ${isQueueOpen ? styles['nowPlaying__actionBtn--active'] : ''}`}
        onClick={onToggleQueue}
        title="Cola de reproducción"
      >
        <ListMusic size={24} />
        {queueLength > 0 && (
          <span className={styles.nowPlaying__actionCount}>{queueLength}</span>
        )}
      </button>
    </div>
  );
}
