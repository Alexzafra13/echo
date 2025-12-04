import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'wouter';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Repeat1, ListMusic, ChevronDown, Volume2, VolumeX } from 'lucide-react';
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
  const [, setLocation] = useLocation();
  const {
    currentTrack,
    currentRadioStation,
    isRadioMode,
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

  // Navigation handlers - will use displayAlbumId and displayArtistId from getPlayerDisplayInfo
  const handleGoToAlbum = useCallback((e: React.MouseEvent, albumIdParam?: string) => {
    e.stopPropagation();
    if (!isRadioMode && albumIdParam) {
      onClose();
      setTimeout(() => {
        setLocation(`/album/${albumIdParam}`);
      }, 50);
    }
  }, [isRadioMode, onClose, setLocation]);

  const handleGoToArtist = useCallback((e: React.MouseEvent, artistIdParam?: string) => {
    e.stopPropagation();
    if (!isRadioMode && artistIdParam) {
      onClose();
      setTimeout(() => {
        setLocation(`/artist/${artistIdParam}`);
      }, 50);
    }
  }, [isRadioMode, onClose, setLocation]);

  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [queueState, setQueueState] = useState<'half' | 'full'>('half'); // 'half' = 50%, 'full' = 90%
  const [queueDragOffset, setQueueDragOffset] = useState(0);
  const queueRef = useRef<HTMLDivElement>(null);
  const queueContentRef = useRef<HTMLDivElement>(null);
  const isQueueDragging = useRef(false);
  const queueTouchStartY = useRef<number>(0);
  const lastQueueScrollTop = useRef<number>(0);

  // Detect desktop
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Volume handlers
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const toggleMute = () => {
    setVolume(volume === 0 ? 0.7 : 0);
  };

  // Reset queue state when NowPlayingView closes
  useEffect(() => {
    if (!isOpen) {
      setIsQueueOpen(false);
      setQueueState('half');
      setQueueDragOffset(0);
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

  // Queue panel gesture handling - 3 state behavior like Spotify
  const handleQueueTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    queueTouchStartY.current = e.touches[0].clientY;
    lastQueueScrollTop.current = queueContentRef.current?.scrollTop || 0;
    isQueueDragging.current = false;
  }, []);

  const handleQueueTouchMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const deltaY = e.touches[0].clientY - queueTouchStartY.current;
    const scrollTop = queueContentRef.current?.scrollTop || 0;
    const isAtTop = scrollTop <= 0;

    // Dragging down (positive delta)
    if (deltaY > 0) {
      if (queueState === 'full' && isAtTop) {
        // At full height and at top of content - allow dragging to shrink
        isQueueDragging.current = true;
        setQueueDragOffset(deltaY);
        e.preventDefault();
      } else if (queueState === 'half' && isAtTop) {
        // At half height and at top - allow dragging to close
        isQueueDragging.current = true;
        setQueueDragOffset(deltaY);
        e.preventDefault();
      }
      // Otherwise, let the content scroll naturally
    }
    // Dragging up (negative delta)
    else if (deltaY < 0) {
      if (queueState === 'half') {
        // At half height - expand to full before allowing scroll
        isQueueDragging.current = true;
        // Use negative dragOffset to indicate upward drag for expansion
        setQueueDragOffset(deltaY);
        e.preventDefault();
      }
      // At full height - let content scroll naturally
    }
  }, [queueState]);

  const handleQueueTouchEnd = useCallback(() => {
    if (queueDragOffset > 100) {
      // Dragged down significantly
      if (queueState === 'full') {
        // Shrink to half
        setQueueState('half');
      } else {
        // Close
        setIsQueueOpen(false);
        setQueueState('half');
      }
    } else if (queueDragOffset < -50) {
      // Dragged up - expand to full
      setQueueState('full');
    }
    setQueueDragOffset(0);
    isQueueDragging.current = false;
  }, [queueDragOffset, queueState]);

  // Get display info including artistId
  const { title, artist, cover, albumName, artistId: displayArtistId, albumId: displayAlbumId } = getPlayerDisplayInfo(
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

      {/* Cover - clickable to go to album */}
      <div
        className={`${styles.nowPlaying__coverContainer} ${!isRadioMode && displayAlbumId ? styles['nowPlaying__coverContainer--clickable'] : ''}`}
        onClick={!isRadioMode && displayAlbumId ? (e) => handleGoToAlbum(e, displayAlbumId) : undefined}
        title={!isRadioMode && displayAlbumId ? `Ir al álbum: ${albumName}` : undefined}
      >
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
        <p
          className={`${styles.nowPlaying__artist} ${!isRadioMode && displayArtistId ? styles['nowPlaying__artist--clickable'] : ''}`}
          onClick={!isRadioMode && displayArtistId ? (e) => handleGoToArtist(e, displayArtistId) : undefined}
        >
          {artist}
        </p>
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

      {/* Volume Control - Desktop style like Apple Music */}
      {isDesktop && (
        <div className={styles.nowPlaying__volume}>
          <button
            className={styles.nowPlaying__volumeBtn}
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
            className={styles.nowPlaying__volumeSlider}
            style={{ '--volume-percent': `${volume * 100}%` } as React.CSSProperties}
          />
        </div>
      )}

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

      {/* Queue Panel - Bottom Sheet with 3 states */}
      {isQueueOpen && (
        <div
          className={`${styles.nowPlaying__queuePanel} ${queueState === 'full' ? styles['nowPlaying__queuePanel--full'] : ''}`}
          ref={queueRef}
          style={{
            height: queueState === 'full' ? '90vh' : '50vh',
            transform: queueDragOffset > 0 ? `translateY(${queueDragOffset}px)` : undefined,
            transition: isQueueDragging.current
              ? 'none'
              : 'height 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), border-radius 0.3s ease',
          }}
          onTouchStart={handleQueueTouchStart}
          onTouchMove={handleQueueTouchMove}
          onTouchEnd={handleQueueTouchEnd}
        >
          <div className={styles.nowPlaying__queueHandle} />
          <div className={styles.nowPlaying__queueContent} ref={queueContentRef}>
            <QueueList onClose={() => setIsQueueOpen(false)} />
          </div>
        </div>
      )}

      {/* Drag indicator */}
      <div className={styles.nowPlaying__dragIndicator} />
    </div>,
    document.body
  );
}
