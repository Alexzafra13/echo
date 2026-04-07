import { ListMusic, Film } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from '../NowPlayingView.module.css';

interface MobileActionsProps {
  queueLength: number;
  isQueueOpen: boolean;
  onToggleQueue: () => void;
  hasVideo?: boolean;
  onPlayVideo?: () => void;
}

/**
 * MobileActions - Queue button and video button for mobile view
 */
export function MobileActions({
  queueLength,
  isQueueOpen,
  onToggleQueue,
  hasVideo,
  onPlayVideo,
}: MobileActionsProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.nowPlaying__actions}>
      {hasVideo && onPlayVideo && (
        <button
          className={styles.nowPlaying__actionBtn}
          onClick={onPlayVideo}
          title={t('player.watchVideo')}
        >
          <Film size={24} />
        </button>
      )}
      <button
        className={`${styles.nowPlaying__actionBtn} ${isQueueOpen ? styles['nowPlaying__actionBtn--active'] : ''}`}
        onClick={onToggleQueue}
        title={t('player.queue')}
      >
        <ListMusic size={24} />
        {queueLength > 0 && <span className={styles.nowPlaying__actionCount}>{queueLength}</span>}
      </button>
    </div>
  );
}
