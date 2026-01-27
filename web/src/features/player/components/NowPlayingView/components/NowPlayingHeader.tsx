import { ChevronDown } from 'lucide-react';
import styles from '../NowPlayingView.module.css';

interface NowPlayingHeaderProps {
  albumName: string | undefined;
  onClose: () => void;
}

/**
 * NowPlayingHeader - Header with close button and album name
 */
export function NowPlayingHeader({ albumName, onClose }: NowPlayingHeaderProps) {
  return (
    <div className={styles.nowPlaying__header}>
      <button className={styles.nowPlaying__closeBtn} onClick={onClose} title="Cerrar">
        <ChevronDown size={28} />
      </button>
      <div className={styles.nowPlaying__headerTitle}>
        {albumName || 'Reproduciendo'}
      </div>
      <div className={styles.nowPlaying__headerSpacer} />
    </div>
  );
}
