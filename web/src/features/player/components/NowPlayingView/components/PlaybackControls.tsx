import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Repeat1 } from 'lucide-react';
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
  return (
    <div className={styles.nowPlaying__controls}>
      {!isRadioMode && (
        <button
          className={`${styles.nowPlaying__controlBtn} ${styles['nowPlaying__controlBtn--small']} ${isShuffle ? styles['nowPlaying__controlBtn--active'] : ''}`}
          onClick={onToggleShuffle}
          title="Aleatorio"
        >
          <Shuffle size={22} />
        </button>
      )}

      <button
        className={styles.nowPlaying__controlBtn}
        onClick={onPlayPrevious}
        title="Anterior"
        disabled={isRadioMode}
      >
        <SkipBack size={32} fill="currentColor" />
      </button>

      <button
        className={`${styles.nowPlaying__controlBtn} ${styles.nowPlaying__playBtn}`}
        onClick={onTogglePlayPause}
        title={isPlaying ? 'Pausar' : 'Reproducir'}
      >
        {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
      </button>

      <button
        className={styles.nowPlaying__controlBtn}
        onClick={onPlayNext}
        title="Siguiente"
        disabled={isRadioMode}
      >
        <SkipForward size={32} fill="currentColor" />
      </button>

      {!isRadioMode && (
        <button
          className={`${styles.nowPlaying__controlBtn} ${styles['nowPlaying__controlBtn--small']} ${repeatMode !== 'off' ? styles['nowPlaying__controlBtn--active'] : ''}`}
          onClick={onToggleRepeat}
          title={`Repetir: ${repeatMode}`}
        >
          {repeatMode === 'one' ? <Repeat1 size={22} /> : <Repeat size={22} />}
        </button>
      )}
    </div>
  );
}
