import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Repeat1 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from '../NowPlayingView.module.css';

interface PlaybackControlsProps {
  isPlaying: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  isRadioMode: boolean;
  onTogglePlayPause: () => void;
  onPlayNext: () => void;
  onPlayPrevious: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
}

/**
 * PlaybackControls - Play/pause, next, previous, shuffle, repeat buttons
 */
export function PlaybackControls({
  isPlaying,
  isShuffle,
  repeatMode,
  isRadioMode,
  onTogglePlayPause,
  onPlayNext,
  onPlayPrevious,
  onToggleShuffle,
  onToggleRepeat,
}: PlaybackControlsProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.nowPlaying__controls}>
      {!isRadioMode && (
        <button
          className={`${styles.nowPlaying__controlBtn} ${styles['nowPlaying__controlBtn--small']} ${isShuffle ? styles['nowPlaying__controlBtn--active'] : ''}`}
          onClick={onToggleShuffle}
          title={t('player.shuffle')}
        >
          <Shuffle size={22} />
        </button>
      )}

      <button
        className={styles.nowPlaying__controlBtn}
        onClick={onPlayPrevious}
        title={t('player.previous')}
        disabled={isRadioMode}
      >
        <SkipBack size={32} fill="currentColor" />
      </button>

      <button
        className={`${styles.nowPlaying__controlBtn} ${styles.nowPlaying__playBtn}`}
        onClick={onTogglePlayPause}
        title={isPlaying ? t('player.pause') : t('player.play')}
      >
        {isPlaying ? (
          <Pause size={32} fill="currentColor" />
        ) : (
          <Play size={32} fill="currentColor" />
        )}
      </button>

      <button
        className={styles.nowPlaying__controlBtn}
        onClick={onPlayNext}
        title={t('player.next')}
        disabled={isRadioMode}
      >
        <SkipForward size={32} fill="currentColor" />
      </button>

      {!isRadioMode && (
        <button
          className={`${styles.nowPlaying__controlBtn} ${styles['nowPlaying__controlBtn--small']} ${repeatMode !== 'off' ? styles['nowPlaying__controlBtn--active'] : ''}`}
          onClick={onToggleRepeat}
          title={t('player.repeatStatus', {
            status:
              repeatMode === 'off'
                ? t('player.repeatStatusOff')
                : repeatMode === 'one'
                  ? t('player.repeatStatusOne')
                  : t('player.repeatStatusAll'),
          })}
        >
          {repeatMode === 'one' ? <Repeat1 size={22} /> : <Repeat size={22} />}
        </button>
      )}
    </div>
  );
}
