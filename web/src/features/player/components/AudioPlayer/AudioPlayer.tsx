import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'wouter';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  Radio,
  Maximize2,
} from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { QueueList } from '../QueueList/QueueList';
import { PlayerMenu } from '../PlayerMenu/PlayerMenu';
import { NowPlayingView } from '../NowPlayingView';
import { usePageEndDetection } from '../../hooks/usePageEndDetection';
import { usePlayerSettingsStore } from '../../store';
import { useClickOutsideRef } from '../../hooks/useClickOutsideRef';
import { getPlayerDisplayInfo } from '../../utils/player.utils';
import { getCoverUrl, handleImageError } from '@shared/utils/cover.utils';
import { useDominantColor } from '@shared/hooks';
import { ProgressBar } from './ProgressBar';
import styles from './AudioPlayer.module.css';

export function AudioPlayer() {
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
    radioMetadata,
    radioSignalStatus,
    togglePlayPause,
    playNext,
    playPrevious,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
  } = usePlayer();

  const [, setLocation] = useLocation();
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const queueRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isSwiping = useRef(false);
  const swipeTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (swipeTimeoutRef.current) clearTimeout(swipeTimeoutRef.current);
    };
  }, []);

  const isMiniMode = usePageEndDetection(120);

  const preference = usePlayerSettingsStore((s) => s.playerPreference);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Visibilidad según preferencia, viewport y NowPlayingView
  const shouldHide = isNowPlayingOpen
    ? true
    : isMobile
      ? false
      : preference === 'footer'
        ? false
        : preference === 'sidebar'
          ? true
          : isMiniMode;

  useClickOutsideRef(queueRef, () => setIsQueueOpen(false), isQueueOpen);
  useClickOutsideRef(menuRef, () => setIsMenuOpen(false), isMenuOpen);

  // Spacer del footer según contenido y preferencia
  useEffect(() => {
    const hasContent = !!(currentTrack || currentRadioStation);

    const needsFooterSpacer = isMobile
      ? hasContent
      : hasContent && preference !== 'sidebar' && !(preference === 'dynamic' && isMiniMode);

    if (needsFooterSpacer) {
      document.body.classList.add('has-footer-player');
    } else {
      document.body.classList.remove('has-footer-player');
    }

    return () => {
      document.body.classList.remove('has-footer-player');
    };
  }, [currentTrack, currentRadioStation, isMiniMode, preference, isMobile]);

  const colorSourceUrl = useMemo(() => {
    if (isRadioMode) return currentRadioStation?.favicon || undefined;
    if (currentTrack) {
      const rawUrl =
        currentTrack.album?.cover ||
        currentTrack.coverImage ||
        (currentTrack.albumId ? `/api/images/albums/${currentTrack.albumId}/cover` : undefined);
      return rawUrl ? getCoverUrl(rawUrl) : undefined;
    }
    return undefined;
  }, [isRadioMode, currentRadioStation?.favicon, currentTrack]);
  const dominantColor = useDominantColor(colorSourceUrl, '0, 0, 0');

  const SWIPE_THRESHOLD = 60;

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile || isRadioMode) return;
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isSwiping.current = false;
    },
    [isMobile, isRadioMode]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile || isRadioMode) return;

      const deltaX = e.touches[0].clientX - touchStartX.current;
      const deltaY = e.touches[0].clientY - touchStartY.current;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        isSwiping.current = true;
        const limitedOffset = Math.max(-100, Math.min(100, deltaX));
        setSwipeOffset(limitedOffset);
      }
    },
    [isMobile, isRadioMode]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isMobile || isRadioMode || !isSwiping.current) {
      setSwipeOffset(0);
      return;
    }

    const deltaX = swipeOffset;

    if (Math.abs(deltaX) >= SWIPE_THRESHOLD) {
      if (swipeTimeoutRef.current) clearTimeout(swipeTimeoutRef.current);

      if (deltaX < 0) {
        setSwipeDirection('left');
        swipeTimeoutRef.current = setTimeout(() => {
          playNext();
          setSwipeDirection(null);
          setSwipeOffset(0);
        }, 200);
      } else {
        setSwipeDirection('right');
        swipeTimeoutRef.current = setTimeout(() => {
          playPrevious();
          setSwipeDirection(null);
          setSwipeOffset(0);
        }, 200);
      }
    } else {
      setSwipeOffset(0);
    }

    isSwiping.current = false;
  }, [isMobile, isRadioMode, swipeOffset, playNext, playPrevious]);

  if (!currentTrack && !currentRadioStation) {
    return null;
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const toggleMute = () => {
    setVolume(volume === 0 ? 0.7 : 0);
  };

  const toggleQueue = () => {
    setIsQueueOpen(!isQueueOpen);
  };

  const { title, artist, cover, albumId, albumName, artistId } = getPlayerDisplayInfo(
    isRadioMode,
    currentRadioStation,
    currentTrack
  );

  const handleGoToAlbum = () => {
    if (!isRadioMode && albumId) {
      setLocation(`/album/${albumId}`);
    }
  };

  const handleGoToArtist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isRadioMode && artistId) {
      setLocation(`/artists/${artistId}`);
    }
  };

  const canNavigateToAlbum = !isRadioMode && albumId;
  const canNavigateToArtist = !isRadioMode && artistId;

  const handleTrackInfoClick = () => {
    if (isMobile) {
      setIsNowPlayingOpen(true);
    }
  };

  const coverSwipeStyles =
    isMobile && !isRadioMode
      ? ({
          opacity: swipeDirection ? 0 : 1,
          transition: 'opacity 0.2s ease-out',
        } as React.CSSProperties)
      : undefined;

  const textSwipeStyles =
    isMobile && !isRadioMode
      ? ({
          transform: swipeDirection
            ? `translateX(${swipeDirection === 'left' ? '-120%' : '120%'})`
            : swipeOffset !== 0
              ? `translateX(${swipeOffset * 1.2}px)`
              : undefined,
          opacity: swipeDirection ? 0 : 1 - Math.abs(swipeOffset) / 250,
          transition:
            swipeDirection || swipeOffset === 0
              ? 'transform 0.2s ease-out, opacity 0.2s ease-out'
              : 'none',
        } as React.CSSProperties)
      : undefined;

  return (
    <div
      className={`${styles.player} ${shouldHide ? styles['player--hidden'] : ''}`}
      style={{ '--player-color': dominantColor } as React.CSSProperties}
      role="region"
      aria-label="Reproductor de audio"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={`${styles.trackInfo} ${isMobile ? styles['trackInfo--clickable'] : ''}`}
        onClick={handleTrackInfoClick}
      >
        <div
          className={`${styles.trackCoverContainer} ${canNavigateToAlbum && !isMobile ? styles['trackCoverContainer--clickable'] : ''}`}
          onClick={canNavigateToAlbum && !isMobile ? handleGoToAlbum : undefined}
          title={canNavigateToAlbum && !isMobile ? `Ir al álbum: ${albumName || title}` : undefined}
          style={coverSwipeStyles}
        >
          {isRadioMode && (
            <div className={styles.trackCoverFallback}>
              <Radio size={24} />
            </div>
          )}
          <img
            src={isRadioMode ? cover : getCoverUrl(cover)}
            alt={title}
            className={styles.trackCover}
            onError={handleImageError}
          />
        </div>
        <div className={styles.trackDetails} style={textSwipeStyles}>
          <div className={styles.trackTitle}>{title}</div>
          <div
            className={`${styles.trackArtist} ${canNavigateToArtist && !isMobile ? styles['trackArtist--clickable'] : ''}`}
            onClick={canNavigateToArtist && !isMobile ? handleGoToArtist : undefined}
          >
            {artist}
          </div>
          {canNavigateToAlbum && albumName && <div className={styles.trackAlbum}>{albumName}</div>}
          {isRadioMode && radioMetadata && (
            <div className={styles.trackMetadata}>
              {radioMetadata.title ||
                `${radioMetadata.artist || ''} - ${radioMetadata.song || ''}`.trim()}
            </div>
          )}
        </div>
      </div>

      <div className={styles.playerControls}>
        <div className={styles.controlButtons}>
          {isRadioMode ? (
            <button
              className={`${styles.controlButton} ${styles.playButton}`}
              onClick={togglePlayPause}
              aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
          ) : (
            <>
              <button
                className={`${styles.controlButton} ${styles.controlButtonSmall} ${isShuffle ? styles.active : ''}`}
                onClick={toggleShuffle}
                aria-label={isShuffle ? 'Desactivar aleatorio' : 'Activar aleatorio'}
                aria-pressed={isShuffle}
              >
                <Shuffle size={16} />
              </button>

              <button className={styles.controlButton} onClick={playPrevious} aria-label="Anterior">
                <SkipBack size={20} />
              </button>

              <button
                className={`${styles.controlButton} ${styles.playButton}`}
                onClick={togglePlayPause}
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>

              <button className={styles.controlButton} onClick={playNext} aria-label="Siguiente">
                <SkipForward size={20} />
              </button>

              <button
                className={`${styles.controlButton} ${styles.controlButtonSmall} ${repeatMode !== 'off' ? styles.active : ''}`}
                onClick={toggleRepeat}
                aria-label={`Repetir: ${repeatMode === 'off' ? 'desactivado' : repeatMode === 'one' ? 'una canción' : 'todas'}`}
                aria-pressed={repeatMode !== 'off'}
              >
                {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
              </button>
            </>
          )}
        </div>
      </div>

      <div className={styles.volumeControl}>
        {isRadioMode && (
          <div
            className={`${styles.liveIndicator} ${
              radioSignalStatus === 'good'
                ? styles['liveIndicator--good']
                : radioSignalStatus === 'weak'
                  ? styles['liveIndicator--weak']
                  : radioSignalStatus === 'error'
                    ? styles['liveIndicator--error']
                    : ''
            }`}
          >
            <Radio size={16} className={styles.liveAntenna} />
            <span className={styles.liveText}>
              {radioSignalStatus === 'good'
                ? 'EN VIVO'
                : radioSignalStatus === 'weak'
                  ? 'SEÑAL DÉBIL'
                  : radioSignalStatus === 'error'
                    ? 'SIN SEÑAL'
                    : 'EN VIVO'}
            </span>
          </div>
        )}

        {!isRadioMode && (
          <div className={styles.queueContainer} ref={queueRef}>
            <button
              className={`${styles.queueButton} ${isQueueOpen ? styles['queueButton--active'] : ''}`}
              onClick={toggleQueue}
              title="Lista de reproducción"
            >
              <ListMusic size={22} strokeWidth={1.5} />
              {queue.length > 0 && (
                <span className={styles.queueButton__count}>{queue.length}</span>
              )}
            </button>

            {isQueueOpen && <QueueList onClose={() => setIsQueueOpen(false)} />}
          </div>
        )}

        <div className={styles.volumeContainer}>
          <button
            className={styles.volumeButton}
            onClick={toggleMute}
            aria-label={volume === 0 ? 'Activar sonido' : 'Silenciar'}
          >
            {volume === 0 ? (
              <VolumeX size={22} strokeWidth={1.5} />
            ) : (
              <Volume2 size={22} strokeWidth={1.5} />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className={styles.volumeSlider}
            aria-label="Volumen"
            aria-valuetext={`${Math.round(volume * 100)}%`}
            style={{ '--volume-percent': `${volume * 100}%` } as React.CSSProperties}
          />
        </div>

        {!isMobile && (
          <button
            className={styles.expandButton}
            onClick={() => setIsNowPlayingOpen(true)}
            aria-label="Expandir reproductor"
          >
            <Maximize2 size={22} strokeWidth={1.5} />
          </button>
        )}

        <PlayerMenu
          isOpen={isMenuOpen}
          onToggle={() => setIsMenuOpen(!isMenuOpen)}
          onClose={() => setIsMenuOpen(false)}
          menuRef={menuRef}
          size={22}
          strokeWidth={1.5}
        />
      </div>

      {!isRadioMode && <ProgressBar currentTime={currentTime} duration={duration} onSeek={seek} />}

      <NowPlayingView
        isOpen={isNowPlayingOpen}
        onClose={() => setIsNowPlayingOpen(false)}
        dominantColor={dominantColor}
      />
    </div>
  );
}
