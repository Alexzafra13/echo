import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Shuffle, Repeat, Repeat1, ListMusic, Radio } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { QueueList } from '../QueueList/QueueList';
import { PlayerMenu } from '../PlayerMenu/PlayerMenu';
import { useScrollDetection } from '../../hooks/useScrollDetection';
import { usePlayerPreference } from '../../hooks/usePlayerPreference';
import { useClickOutside } from '../../hooks/useClickOutside';
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
    togglePlayPause,
    playNext,
    playPrevious,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
  } = usePlayer();

  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [dominantColor, setDominantColor] = useState<string>('0, 0, 0');
  const queueRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Detectar scroll para activar mini-player
  const isMiniMode = useScrollDetection(120);

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
  useClickOutside(queueRef, () => setIsQueueOpen(false), isQueueOpen);
  useClickOutside(menuRef, () => setIsMenuOpen(false), isMenuOpen);

  // Controlar espaciador del footer según contenido, preferencia y scroll
  useEffect(() => {
    const hasContent = !!(currentTrack || currentRadioStation);
    const needsFooterSpacer =
      hasContent &&
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
  }, [currentTrack, currentRadioStation, isMiniMode, preference]);

  // Extraer color dominante del cover para gradient móvil
  useEffect(() => {
    const coverUrl = isRadioMode
      ? currentRadioStation?.favicon
      : currentTrack?.album?.cover;

    if (coverUrl) {
      const finalCoverUrl = isRadioMode ? coverUrl : getCoverUrl(coverUrl);
      extractDominantColor(finalCoverUrl)
        .then(color => setDominantColor(color))
        .catch(() => setDominantColor('0, 0, 0'));
    } else {
      setDominantColor('0, 0, 0');
    }
  }, [currentTrack, currentRadioStation, isRadioMode]);

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
  const { title, artist, cover } = getPlayerDisplayInfo(
    isRadioMode,
    currentRadioStation,
    currentTrack
  );

  return (
    <div
      className={`${styles.player} ${shouldHide ? styles['player--hidden'] : ''}`}
      style={{ '--player-color': dominantColor } as React.CSSProperties}
    >

      {/* Track/Radio info - Left side */}
      <div className={styles.trackInfo}>
        <div className={styles.trackCoverContainer}>
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
        <div className={styles.trackDetails}>
          <div className={styles.trackTitle}>{title}</div>
          <div className={styles.trackArtist}>{artist}</div>
          {/* ICY Metadata - Now Playing for Radio */}
          {isRadioMode && radioMetadata && (
            <div className={styles.trackMetadata}>
              🎵 {radioMetadata.title || `${radioMetadata.artist || ''} - ${radioMetadata.song || ''}`.trim()}
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
        {/* Indicador EN VIVO para radio - al lado del volumen */}
        {isRadioMode && (
          <div className={styles.liveIndicator}>
            <Radio size={16} className={styles.liveAntenna} />
            <span className={styles.liveText}>EN VIVO</span>
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
              <ListMusic size={20} />
              {queue.length > 0 && (
                <span className={styles.queueButton__badge}>{queue.length}</span>
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
    </div>
  );
}
