import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Shuffle, Repeat, Repeat1, ListMusic, Radio, MoreVertical } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { QueueList } from '../QueueList/QueueList';
import { useScrollDetection } from '../../hooks/useScrollDetection';
import { usePlayerPreference } from '../../hooks/usePlayerPreference';
import { getCoverUrl, handleImageError } from '@shared/utils/cover.utils';
import { formatDuration } from '@shared/utils/format';
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
  const queueRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Detectar scroll para activar mini-player
  const isMiniMode = useScrollDetection(120);

  // Sistema de preferencias
  const { preference, setPreference } = usePlayerPreference();

  // Lógica de visibilidad basada en preferencia
  // - 'footer': siempre visible en footer (shouldHide = false)
  // - 'sidebar': siempre oculto, usa mini-player en sidebar (shouldHide = true)
  // - 'dynamic': ocultar cuando hay scroll (shouldHide = isMiniMode)
  const shouldHide =
    preference === 'footer' ? false :
    preference === 'sidebar' ? true :
    isMiniMode;

  // Controlar padding-bottom del body según si el mini-player está activo
  useEffect(() => {
    if (isMiniMode) {
      // Mini-player activo: quitar padding (el reproductor está en el sidebar)
      document.body.style.paddingBottom = '0';
    } else {
      // Mini-player inactivo: restaurar padding (el reproductor está en el footer)
      document.body.style.paddingBottom = '110px';
    }

    // Cleanup: restaurar padding al desmontar
    return () => {
      document.body.style.paddingBottom = '110px';
    };
  }, [isMiniMode]);

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

  // Close menu dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isMenuOpen]);

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

  // Determinar qué mostrar: track o radio
  const displayTitle = isRadioMode && currentRadioStation
    ? currentRadioStation.name
    : currentTrack?.title || '';

  const displayArtist = isRadioMode && currentRadioStation
    ? [currentRadioStation.country, currentRadioStation.tags?.split(',')[0]].filter(Boolean).join(' • ') || 'Radio'
    : currentTrack?.artist || '';

  const displayCover = isRadioMode && currentRadioStation
    ? currentRadioStation.favicon || '/images/covers/placeholder.jpg'
    : currentTrack?.coverImage || '/images/covers/placeholder.jpg';

  return (
    <div className={`${styles.player} ${shouldHide ? styles.player_hidden : ''}`}>

      {/* Track/Radio info - Left side */}
      <div className={styles.trackInfo}>
        <img
          src={isRadioMode ? displayCover : getCoverUrl(displayCover)}
          alt={displayTitle}
          className={styles.trackCover}
          onError={handleImageError}
        />
        <div className={styles.trackDetails}>
          <div className={styles.trackTitle}>{displayTitle}</div>
          <div className={styles.trackArtist}>{displayArtist}</div>
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

        {/* Progress bar - Solo para tracks, no para radio */}
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
        )}

        {/* Volume container con slider vertical */}
        <div className={styles.volumeContainer}>
          <button
            className={styles.volumeButton}
            onClick={toggleMute}
            title={volume === 0 ? 'Activar sonido' : 'Silenciar'}
          >
            {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <div className={styles.volumeSliderContainer}>
            <div className={styles.volumeSlider}>
              <div
                className={styles.volumeFill}
                style={{ height: `${volume * 100}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className={styles.volumeInput}
              orient="vertical"
            />
          </div>
        </div>

        {/* Menú de opciones junto al volumen */}
        <div className={styles.menuContainer} ref={menuRef}>
          <button
            className={`${styles.menuButton} ${isMenuOpen ? styles.menuButton_active : ''}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            title="Opciones del reproductor"
          >
            <MoreVertical size={16} />
          </button>

          {isMenuOpen && (
            <div className={styles.menuDropdown}>
              <button
                className={`${styles.menuOption} ${preference === 'dynamic' ? styles.menuOption_active : ''}`}
                onClick={() => { setPreference('dynamic'); setIsMenuOpen(false); }}
              >
                Posición dinámica
              </button>
              <button
                className={`${styles.menuOption} ${preference === 'sidebar' ? styles.menuOption_active : ''}`}
                onClick={() => { setPreference('sidebar'); setIsMenuOpen(false); }}
              >
                Reproductor lateral
              </button>
              <button
                className={`${styles.menuOption} ${preference === 'footer' ? styles.menuOption_active : ''}`}
                onClick={() => { setPreference('footer'); setIsMenuOpen(false); }}
              >
                Reproductor por defecto
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
