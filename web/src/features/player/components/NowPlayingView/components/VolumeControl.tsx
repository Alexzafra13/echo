import { Volume2, VolumeX, ListMusic } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from '../NowPlayingView.module.css';

interface VolumeControlProps {
  volume: number;
  queueLength: number;
  isQueueOpen: boolean;
  isRadioMode: boolean;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onToggleQueue: () => void;
}

/**
 * VolumeControl - Volume slider with mute button and queue toggle (desktop only)
 */
export function VolumeControl({
  volume,
  queueLength,
  isQueueOpen,
  isRadioMode,
  onVolumeChange,
  onToggleMute,
  onToggleQueue,
}: VolumeControlProps) {
  const { t } = useTranslation();

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onVolumeChange(parseFloat(e.target.value));
  };

  return (
    <div className={styles.nowPlaying__volumeRow}>
      <div className={styles.nowPlaying__volume}>
        <button
          className={styles.nowPlaying__volumeBtn}
          onClick={onToggleMute}
          title={volume === 0 ? t('player.unmute') : t('player.mute')}
        >
          {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className={styles.nowPlaying__volumeSlider}
          style={{ '--volume-percent': `${volume * 100}%` } as React.CSSProperties}
        />
      </div>
      {/* Queue button next to volume */}
      {!isRadioMode && (
        <button
          className={`${styles.nowPlaying__volumeQueueBtn} ${isQueueOpen ? styles['nowPlaying__volumeQueueBtn--active'] : ''}`}
          onClick={onToggleQueue}
          title={t('player.queue')}
        >
          <ListMusic size={22} />
          {queueLength > 0 && (
            <span className={styles.nowPlaying__volumeQueueCount}>{queueLength}</span>
          )}
        </button>
      )}
    </div>
  );
}
