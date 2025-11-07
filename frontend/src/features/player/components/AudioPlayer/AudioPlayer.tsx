import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Shuffle, Repeat, Repeat1, ListMusic } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { QueueList } from '../QueueList/QueueList';
import { getCoverUrl, handleImageError } from '@shared/utils/cover.utils';
import { formatDuration } from '@shared/utils/format';
import styles from './AudioPlayer.module.css';

export function AudioPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isShuffle,
    repeatMode,
    queue,
    togglePlayPause,
    playNext,
    playPrevious,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
  } = usePlayer();

  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const queueRef = useRef<HTMLDivElement>(null);

  // Close queue dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (queueRef.current && !queueRef.current.contains(event.target as Node)) {
        setIsQueueOpen(false);
      }
    };

    if (isQueueOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isQueueOpen]);

  if (!currentTrack) {
    return null; // No mostrar barra si no hay track
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    seek(percent * duration);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const toggleMute = () => {
    setVolume(volume === 0 ? 0.7 : 0);
  };

  const toggleQueue = () => {
    setIsQueueOpen(!isQueueOpen);
  };

  return (
    <div className={styles.player}>
      {/* Track info - Left side */}
      <div className={styles.trackInfo}>
        <img
          src={getCoverUrl(currentTrack.coverImage)}
          alt={currentTrack.title}
          className={styles.trackCover}
          onError={handleImageError}
        />
        <div className={styles.trackDetails}>
          <div className={styles.trackTitle}>{currentTrack.title}</div>
          <div className={styles.trackArtist}>{currentTrack.artist}</div>
        </div>
      </div>

      {/* Player controls - Center */}
      <div className={styles.playerControls}>
        <div className={styles.controlButtons}>
          <button
            className={`${styles.controlButton} ${styles.controlButtonSmall} ${isShuffle ? styles.active : ''}`}
            onClick={toggleShuffle}
            title="Shuffle"
          >
            <Shuffle size={16} />
          </button>

          <button
            className={styles.controlButton}
            onClick={playPrevious}
            title="Anterior"
          >
            <SkipBack size={20} />
          </button>

          <button
            className={`${styles.controlButton} ${styles.playButton}`}
            onClick={togglePlayPause}
            title={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>

          <button
            className={styles.controlButton}
            onClick={playNext}
            title="Siguiente"
          >
            <SkipForward size={20} />
          </button>

          <button
            className={`${styles.controlButton} ${styles.controlButtonSmall} ${repeatMode !== 'off' ? styles.active : ''}`}
            onClick={toggleRepeat}
            title={`Repetir: ${repeatMode}`}
          >
            {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
          </button>
        </div>

        {/* Progress bar */}
        <div className={styles.progressContainer}>
          <span className={styles.timeLabel}>{formatDuration(currentTime)}</span>
          <div
            className={styles.progressBar}
            onClick={handleProgressClick}
          >
            <div
              className={styles.progressFill}
              style={{ width: `${progressPercent}%` }}
            />
            <div
              className={styles.progressHandle}
              style={{ left: `${progressPercent}%` }}
            />
          </div>
          <span className={styles.timeLabel}>{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Volume control - Right side */}
      <div className={styles.volumeControl}>
        {/* Queue button and dropdown */}
        <div className={styles.queueContainer} ref={queueRef}>
          <button
            className={`${styles.queueButton} ${isQueueOpen ? styles.queueButton_active : ''}`}
            onClick={toggleQueue}
            title="Lista de reproducción"
          >
            <ListMusic size={20} />
            {queue.length > 0 && (
              <span className={styles.queueButton__badge}>{queue.length}</span>
            )}
          </button>

          {isQueueOpen && <QueueList onClose={() => setIsQueueOpen(false)} />}
        </div>

        <button
          className={styles.volumeButton}
          onClick={toggleMute}
          title={volume === 0 ? 'Activar sonido' : 'Silenciar'}
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
          className={styles.volumeSlider}
          style={{ '--volume-percent': `${volume * 100}%` } as React.CSSProperties}
        />
      </div>
    </div>
  );
}
