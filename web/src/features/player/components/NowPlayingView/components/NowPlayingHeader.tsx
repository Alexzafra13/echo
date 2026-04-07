import { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from '../NowPlayingView.module.css';

interface NowPlayingHeaderProps {
  albumName: string | undefined;
  onClose: () => void;
  dominantColor?: string;
}

/**
 * NowPlayingHeader - Header with close button and album name
 */
export function NowPlayingHeader({ albumName, onClose, dominantColor }: NowPlayingHeaderProps) {
  const { t } = useTranslation();

  const isLightColor = useMemo(() => {
    if (!dominantColor) return false;
    const parts = dominantColor.split(',').map((s) => parseInt(s.trim(), 10));
    if (parts.length < 3) return false;
    // Luminance formula
    const luminance = (0.299 * parts[0] + 0.587 * parts[1] + 0.114 * parts[2]) / 255;
    return luminance > 0.6;
  }, [dominantColor]);

  return (
    <div className={styles.nowPlaying__header}>
      <button
        className={`${styles.nowPlaying__closeBtn}${isLightColor ? ` ${styles['nowPlaying__closeBtn--dark']}` : ''}`}
        onClick={onClose}
        title={t('common.close')}
      >
        <ChevronDown size={28} />
      </button>
      <div
        className={`${styles.nowPlaying__headerTitle}${isLightColor ? ` ${styles['nowPlaying__headerTitle--dark']}` : ''}`}
      >
        {albumName || t('player.nowPlaying')}
      </div>
      <div className={styles.nowPlaying__headerSpacer} />
    </div>
  );
}
