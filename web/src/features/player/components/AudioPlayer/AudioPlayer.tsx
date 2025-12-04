import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Shuffle, Repeat, Repeat1, ListMusic, Radio, Maximize2 } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { QueueList } from '../QueueList/QueueList';
import { PlayerMenu } from '../PlayerMenu/PlayerMenu';
import { NowPlayingView } from '../NowPlayingView';
import { usePageEndDetection } from '../../hooks/usePageEndDetection';
import { usePlayerPreference } from '../../hooks/usePlayerPreference';
import { useClickOutsideRef } from '../../hooks/useClickOutsideRef';
import { getPlayerDisplayInfo } from '../../utils/player.utils';
import { getCoverUrl, handleImageError } from '@shared/utils/cover.utils';
import { formatDuration } from '@shared/utils/format';
import { extractDominantColor } from '@shared/utils/colorExtractor';
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
  const [dominantColor, setDominantColor] = useState<string>('0, 0, 0');
  const queueRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Swipe gesture state for mobile
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isSwiping = useRef(false);

  // Detectar cuando el usuario llega al final de la página para activar mini-player
  const isMiniMode = usePageEndDetection(120);

  // Sistema de preferencias
  const { preference } = usePlayerPreference();

  // Detectar si estamos en mobile (viewport <= 768px)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lógica de visibilidad basada en preferencia
  // - En mobile: NUNCA ocultar (no hay sidebar)
  // - 'footer': siempre visible en footer (shouldHide = false)
  // - 'sidebar': siempre oculto, usa mini-player en sidebar (shouldHide = true)
  // - 'dynamic': ocultar cuando hay scroll (shouldHide = isMiniMode)
  const shouldHide = isMobile ? false :
    preference === 'footer' ? false :
    preference === 'sidebar' ? true :
    isMiniMode;

  // Cerrar dropdowns al hacer click fuera
  useClickOutsideRef(queueRef, () => setIsQueueOpen(false), isQueueOpen);
  useClickOutsideRef(menuRef, () => setIsMenuOpen(false), isMenuOpen);

  // Controlar espaciador del footer según contenido, preferencia y scroll
  useEffect(() => {
    const hasContent = !!(currentTrack || currentRadioStation);

    // En mobile: SIEMPRE agregar spacer si hay contenido (no hay sidebar en mobile)
    // En desktop: depende de la preferencia y scroll
    const needsFooterSpacer = isMobile
      ? hasContent  // Mobile: siempre footer si hay contenido
      : hasContent &&  // Desktop: depende de preferencia
        preference !== 'sidebar' &&
        !(preference === 'dynamic' && isMiniMode);

    if (needsFooterSpacer) {
      document.body.classList.add('has-footer-player');
    } else {
      document.body.classList.remove('has-footer-player');
    }

    return () => {
      document.body.classList.remove('has-footer-player');
    };
  }, [currentTrack, currentRadioStation, isMiniMode, preference, isMobile]);

  // Extraer color dominante del cover para gradient móvil
  useEffect(() => {
    let coverUrl: string | undefined;

    if (isRadioMode) {
      coverUrl = currentRadioStation?.favicon || undefined;
    } else if (currentTrack) {
      // Try multiple sources for the cover URL
      coverUrl = currentTrack.album?.cover ||
                 currentTrack.coverImage ||
                 // If we have albumId, construct the URL
                 (currentTrack.albumId ? `/api/images/albums/${currentTrack.albumId}/cover` : undefined);
    }

    if (coverUrl) {
      const finalCoverUrl = isRadioMode ? coverUrl : getCoverUrl(coverUrl);
      extractDominantColor(finalCoverUrl)
        .then(color => setDominantColor(color))
        .catch(() => setDominantColor('0, 0, 0'));
    } else {
      setDominantColor('0, 0, 0');
    }
  }, [currentTrack, currentRadioStation, isRadioMode]);

  // Swipe gesture handlers for mobile
  const SWIPE_THRESHOLD = 60; // Minimum distance to trigger swipe action

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile || isRadioMode) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  }, [isMobile, isRadioMode]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile || isRadioMode) return;

    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;

    // Only swipe horizontally if movement is more horizontal than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isSwiping.current = true;
      // Limit the offset for visual feedback
      const limitedOffset = Math.max(-100, Math.min(100, deltaX));
      setSwipeOffset(limitedOffset);
    }
  }, [isMobile, isRadioMode]);

  const handleTouchEnd = useCallback(() => {
    if (!isMobile || isRadioMode || !isSwiping.current) {
      setSwipeOffset(0);
      return;
    }

    const deltaX = swipeOffset;

    if (Math.abs(deltaX) >= SWIPE_THRESHOLD) {
      if (deltaX < 0) {
        // Swipe left → next track
        setSwipeDirection('left');
        setTimeout(() => {
          playNext();
          setSwipeDirection(null);
          setSwipeOffset(0);
        }, 200);
      } else {
        // Swipe right → previous track
        setSwipeDirection('right');
        setTimeout(() => {
          playPrevious();
          setSwipeDirection(null);
          setSwipeOffset(0);
        }, 200);
      }
    } else {
      // Reset if swipe was too short
      setSwipeOffset(0);
    }

    isSwiping.current = false;
  }, [isMobile, isRadioMode, swipeOffset, playNext, playPrevious]);

  // No mostrar si no hay ni track ni radio
  if (!currentTrack && !currentRadioStation) {
    return null;
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

  // Obtener información de visualización (track o radio)
  const { title, artist, cover, albumId, albumName } = getPlayerDisplayInfo(
    isRadioMode,
    currentRadioStation,
    currentTrack
  );

  // Navegar al álbum al hacer clic en la carátula
  const handleGoToAlbum = () => {
    if (!isRadioMode && albumId) {
      setLocation(`/album/${albumId}`);
    }
  };

  const canNavigateToAlbum = !isRadioMode && albumId;

  // Abrir NowPlayingView al hacer clic en trackInfo (solo mobile)
  const handleTrackInfoClick = () => {
    if (isMobile) {
      setIsNowPlayingOpen(true);
    }
  };

  // Calculate swipe styles for mobile (separate animations for cover and text)
  const coverSwipeStyles = isMobile && !isRadioMode ? {
    opacity: swipeDirection ? 0 : 1, // Only fade when changing tracks, not during swipe
    transition: 'opacity 0.2s ease-out',
  } as React.CSSProperties : undefined;

  const textSwipeStyles = isMobile && !isRadioMode ? {
    transform: swipeDirection
      ? `translateX(${swipeDirection === 'left' ? '-120%' : '120%'})`
      : swipeOffset !== 0
        ? `translateX(${swipeOffset * 1.2}px)`
        : undefined,
    opacity: swipeDirection ? 0 : 1 - Math.abs(swipeOffset) / 250,
    transition: swipeDirection || swipeOffset === 0 ? 'transform 0.2s ease-out, opacity 0.2s ease-out' : 'none',
  } as React.CSSProperties : undefined;

  return (
    <div
      className={`${styles.player} ${shouldHide ? styles['player--hidden'] : ''}`}
      style={{ '--player-color': dominantColor } as React.CSSProperties}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >

      {/* Track/Radio info - Left side */}
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
          <div className={styles.trackArtist}>{artist}</div>
          {/* Album name - clickable link to album (solo desktop) */}
          {canNavigateToAlbum && albumName && (
            <div
              className={styles.trackAlbum}
              onClick={!isMobile ? handleGoToAlbum : undefined}
              title={!isMobile ? `Ir al álbum: ${albumName}` : undefined}
            >
              {albumName}
            </div>
          )}
          {/* ICY Metadata - Now Playing for Radio */}
          {isRadioMode && radioMetadata && (
            <div className={styles.trackMetadata}>
              {radioMetadata.title || `${radioMetadata.artist || ''} - ${radioMetadata.song || ''}`.trim()}
            </div>
          )}
        </div>
      </div>

      {/* Player controls - Center */}
      <div className={styles.playerControls}>
        <div className={styles.controlButtons}>
          {/* Radio mode: solo play/pause centrado */}
          {isRadioMode ? (
            <button
              className={`${styles.controlButton} ${styles.playButton}`}
              onClick={togglePlayPause}
              title={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
          ) : (
            /* Track mode: controles completos */
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Volume control - Right side */}
      <div className={styles.volumeControl}>
        {/* Indicador EN VIVO para radio con estado de señal */}
        {isRadioMode && (
          <div className={`${styles.liveIndicator} ${
            radioSignalStatus === 'good' ? styles['liveIndicator--good'] :
            radioSignalStatus === 'weak' ? styles['liveIndicator--weak'] :
            radioSignalStatus === 'error' ? styles['liveIndicator--error'] :
            ''
          }`}>
            <Radio size={16} className={styles.liveAntenna} />
            <span className={styles.liveText}>
              {radioSignalStatus === 'good' ? 'EN VIVO' :
               radioSignalStatus === 'weak' ? 'SEÑAL DÉBIL' :
               radioSignalStatus === 'error' ? 'SIN SEÑAL' :
               'EN VIVO'}
            </span>
          </div>
        )}

        {/* Queue button and dropdown - Solo para tracks */}
        {!isRadioMode && (
          <div className={styles.queueContainer} ref={queueRef}>
            <button
              className={`${styles.queueButton} ${isQueueOpen ? styles['queueButton--active'] : ''}`}
              onClick={toggleQueue}
              title="Lista de reproducción"
            >
              <ListMusic size={24} />
              {queue.length > 0 && (
                <span className={styles.queueButton__count}>{queue.length}</span>
              )}
            </button>

            {isQueueOpen && <QueueList onClose={() => setIsQueueOpen(false)} />}
          </div>
        )}

        {/* Volume container con slider horizontal */}
        <div className={styles.volumeContainer}>
          <button
            className={styles.volumeButton}
            onClick={toggleMute}
            title={volume === 0 ? 'Activar sonido' : 'Silenciar'}
          >
            {volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
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

        {/* Botón expandir NowPlayingView (solo desktop) */}
        {!isMobile && (
          <button
            className={styles.expandButton}
            onClick={() => setIsNowPlayingOpen(true)}
            title="Expandir reproductor"
          >
            <Maximize2 size={18} />
          </button>
        )}

        {/* Menú de opciones junto al volumen */}
        <PlayerMenu
          isOpen={isMenuOpen}
          onToggle={() => setIsMenuOpen(!isMenuOpen)}
          onClose={() => setIsMenuOpen(false)}
          menuRef={menuRef}
          size={16}
        />
      </div>

      {/* Progress bar - Solo para tracks, no para radio - Ahora en la parte inferior del player */}
      {!isRadioMode && (
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
      )}

      {/* NowPlayingView - Vista completa en pantalla (mobile) */}
      <NowPlayingView
        isOpen={isNowPlayingOpen}
        onClose={() => setIsNowPlayingOpen(false)}
        dominantColor={dominantColor}
      />
    </div>
  );
}
