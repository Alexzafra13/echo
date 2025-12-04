import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Repeat1, ListMusic, ChevronDown } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { QueueList } from '../QueueList/QueueList';
import { getPlayerDisplayInfo } from '../../utils/player.utils';
import { getCoverUrl, handleImageError } from '@shared/utils/cover.utils';
import { formatDuration } from '@shared/utils/format';
import styles from './NowPlayingView.module.css';

interface NowPlayingViewProps {
  isOpen: boolean;
  onClose: () => void;
  dominantColor: string;
}

export function NowPlayingView({ isOpen, onClose, dominantColor }: NowPlayingViewProps) {
  const {
    currentTrack,
    currentRadioStation,
    isRadioMode,
    isPlaying,
    currentTime,
    duration,
    isShuffle,
    repeatMode,
    queue,
    togglePlayPause,
    playNext,
    playPrevious,
    seek,
    toggleShuffle,
    toggleRepeat,
  } = usePlayer();

  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [queueHeight, setQueueHeight] = useState(50); // Percentage of screen height
  const queueRef = useRef<HTMLDivElement>(null);

  // Reset queue state when NowPlayingView closes
  useEffect(() => {
    if (!isOpen) {
      setIsQueueOpen(false);
      setQueueHeight(50);
    }
  }, [isOpen]);

  // Block body scroll when open
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';

      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Swipe down to close (main view)
  const touchStartY = useRef<number>(0);
  const touchCurrentY = useRef<number>(0);
  const [dragOffset, setDragOffset] = useState(0);
  const isDragging = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Don't start drag if queue is open
    if (isQueueOpen) return;
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
    isDragging.current = false;
  }, [isQueueOpen]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Don't drag if queue is open
    if (isQueueOpen) return;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    touchCurrentY.current = e.touches[0].clientY;

    // Only allow dragging down
    if (deltaY > 0) {
      isDragging.current = true;
      setDragOffset(Math.min(deltaY, 300));
    }
  }, [isQueueOpen]);

  const handleTouchEnd = useCallback(() => {
    // Don't close if queue is open
    if (isQueueOpen) return;
    if (dragOffset > 150) {
      onClose();
    }
    setDragOffset(0);
    isDragging.current = false;
  }, [dragOffset, onClose, isQueueOpen]);

  // Queue panel gesture handling
  const queueTouchStartY = useRef<number>(0);
  const [queueDragOffset, setQueueDragOffset] = useState(0);
  const isQueueDragging = useRef(false);

  const handleQueueTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    queueTouchStartY.current = e.touches[0].clientY;
    isQueueDragging.current = false;
  }, []);

  const handleQueueTouchMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const deltaY = e.touches[0].clientY - queueTouchStartY.current;

    // Dragging down (positive delta) - to close or shrink
    if (deltaY > 0) {
      isQueueDragging.current = true;
      setQueueDragOffset(deltaY);
    }
    // Dragging up (negative delta) - to expand
    else if (deltaY < 0) {
      isQueueDragging.current = true;
      const newHeight = Math.min(90, queueHeight + Math.abs(deltaY) / 5);
      setQueueHeight(newHeight);
    }
  }, [queueHeight]);

  const handleQueueTouchEnd = useCallback(() => {
    if (queueDragOffset > 100) {
      // Close queue panel
      setIsQueueOpen(false);
      setQueueHeight(50);
    }
    setQueueDragOffset(0);
    isQueueDragging.current = false;
  }, [queueDragOffset]);

  // Don't render content if not open (but keep the container for animation)
  const { title, artist, cover, albumName } = getPlayerDisplayInfo(
    isRadioMode,
    currentRadioStation,
    currentTrack
  );

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    seek(percent * duration);
  };

  const handleProgressTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    seek(percent * duration);
  };

  // Calculate styles for drag interaction
  const dragStyles: React.CSSProperties = {
    '--dominant-color': dominantColor,
  } as React.CSSProperties;

  // Only override transform when actively dragging down
  if (isOpen && dragOffset > 0) {
    dragStyles.transform = `translateY(${dragOffset}px)`;
    dragStyles.transition = 'none';
    dragStyles.opacity = 1 - dragOffset / 400;
  }

  // Use portal to render outside the player (which has transform that breaks fixed positioning)
  return createPortal(
    <div
      className={`${styles.nowPlaying} ${isOpen ? styles['nowPlaying--open'] : ''}`}
      style={dragStyles}
      onTouchStart={isOpen ? handleTouchStart : undefined}
      onTouchMove={isOpen ? handleTouchMove : undefined}
      onTouchEnd={isOpen ? handleTouchEnd : undefined}
    >
      {/* Background gradient */}
      <div className={styles.nowPlaying__background} />

      {/* Header */}
      <div className={styles.nowPlaying__header}>
        <button className={styles.nowPlaying__closeBtn} onClick={onClose} title="Cerrar">
          <ChevronDown size={28} />
        </button>
        <div className={styles.nowPlaying__headerTitle}>
          {albumName || 'Reproduciendo'}
        </div>
        <div className={styles.nowPlaying__headerSpacer} />
      </div>

      {/* Cover */}
      <div className={styles.nowPlaying__coverContainer}>
        <img
          src={isRadioMode ? cover : getCoverUrl(cover)}
          alt={title}
          className={styles.nowPlaying__cover}
          onError={handleImageError}
        />
      </div>

      {/* Track Info */}
      <div className={styles.nowPlaying__info}>
        <h1 className={styles.nowPlaying__title}>{title}</h1>
        <p className={styles.nowPlaying__artist}>{artist}</p>
      </div>

      {/* Progress Bar */}
      {!isRadioMode && (
        <div className={styles.nowPlaying__progress}>
          <div
            className={styles.nowPlaying__progressBar}
            onClick={handleProgressClick}
            onTouchMove={handleProgressTouch}
          >
            <div
              className={styles.nowPlaying__progressFill}
              style={{ width: `${progressPercent}%` }}
            />
            <div
              className={styles.nowPlaying__progressHandle}
              style={{ left: `${progressPercent}%` }}
            />
          </div>
          <div className={styles.nowPlaying__time}>
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className={styles.nowPlaying__controls}>
        {!isRadioMode && (
          <button
            className={`${styles.nowPlaying__controlBtn} ${styles['nowPlaying__controlBtn--small']} ${isShuffle ? styles['nowPlaying__controlBtn--active'] : ''}`}
            onClick={toggleShuffle}
            title="Aleatorio"
          >
            <Shuffle size={22} />
          </button>
        )}

        <button
          className={styles.nowPlaying__controlBtn}
          onClick={playPrevious}
          title="Anterior"
          disabled={isRadioMode}
        >
          <SkipBack size={32} fill="currentColor" />
        </button>

        <button
          className={`${styles.nowPlaying__controlBtn} ${styles.nowPlaying__playBtn}`}
          onClick={togglePlayPause}
          title={isPlaying ? 'Pausar' : 'Reproducir'}
        >
          {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
        </button>

        <button
          className={styles.nowPlaying__controlBtn}
          onClick={playNext}
          title="Siguiente"
          disabled={isRadioMode}
        >
          <SkipForward size={32} fill="currentColor" />
        </button>

        {!isRadioMode && (
          <button
            className={`${styles.nowPlaying__controlBtn} ${styles['nowPlaying__controlBtn--small']} ${repeatMode !== 'off' ? styles['nowPlaying__controlBtn--active'] : ''}`}
            onClick={toggleRepeat}
            title={`Repetir: ${repeatMode}`}
          >
            {repeatMode === 'one' ? <Repeat1 size={22} /> : <Repeat size={22} />}
          </button>
        )}
      </div>

      {/* Bottom Actions */}
      {!isRadioMode && (
        <div className={styles.nowPlaying__actions}>
          <button
            className={`${styles.nowPlaying__actionBtn} ${isQueueOpen ? styles['nowPlaying__actionBtn--active'] : ''}`}
            onClick={() => setIsQueueOpen(!isQueueOpen)}
            title="Cola de reproducción"
          >
            <ListMusic size={24} />
            {queue.length > 0 && (
              <span className={styles.nowPlaying__badge}>{queue.length}</span>
            )}
          </button>
        </div>
      )}

      {/* Queue Panel */}
      {isQueueOpen && (
        <div
          className={styles.nowPlaying__queuePanel}
          ref={queueRef}
          style={{
            height: `${queueHeight}vh`,
            transform: queueDragOffset > 0 ? `translateY(${queueDragOffset}px)` : undefined,
            transition: isQueueDragging.current ? 'none' : 'height 0.2s ease, transform 0.3s ease',
          }}
          onTouchStart={handleQueueTouchStart}
          onTouchMove={handleQueueTouchMove}
          onTouchEnd={handleQueueTouchEnd}
        >
          <div className={styles.nowPlaying__queueHandle} />
          <QueueList onClose={() => setIsQueueOpen(false)} />
        </div>
      )}

      {/* Drag indicator */}
      <div className={styles.nowPlaying__dragIndicator} />
    </div>,
    document.body
  );
}
