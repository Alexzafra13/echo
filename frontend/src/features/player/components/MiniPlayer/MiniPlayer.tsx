import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Radio, MoreVertical } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { usePlayerPreference } from '../../hooks/usePlayerPreference';
import { getCoverUrl, handleImageError } from '@shared/utils/cover.utils';
import { formatDuration } from '@shared/utils/format';
import styles from './MiniPlayer.module.css';

interface MiniPlayerProps {
  isVisible: boolean;
}

export function MiniPlayer({ isVisible }: MiniPlayerProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { preference, setPreference } = usePlayerPreference();
  const {
    currentTrack,
    currentRadioStation,
    isRadioMode,
    isPlaying,
    currentTime,
    duration,
    volume,
    togglePlayPause,
    playNext,
    playPrevious,
    seek,
    setVolume,
  } = usePlayer();

  // Cerrar menú al hacer click fuera (moved before early return)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  // No mostrar si no hay ni track ni radio (moved after all hooks)
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

  // Lógica de visibilidad basada en preferencia
  const shouldShow =
    preference === 'sidebar' ? true :
    preference === 'dynamic' ? isVisible :
    false;

  return (
    <div className={`${styles.miniPlayer} ${shouldShow ? styles.miniPlayer_visible : ''}`}>
      {/* Menú de opciones */}
      <div className={styles.menuContainer} ref={menuRef}>
        <button
          className={`${styles.menuButton} ${isMenuOpen ? styles.menuButton_active : ''}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          title="Opciones del reproductor"
        >
          <MoreVertical size={14} />
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

      {/* Cover con animación de reproducción */}
      <div className={styles.coverContainer}>
        <img
          src={isRadioMode ? displayCover : getCoverUrl(displayCover)}
          alt={displayTitle}
          className={styles.cover}
          onError={handleImageError}
        />
        {/* Animación EQ en la parte inferior del disco */}
        {isPlaying && (
          <div className={styles.playingIndicator}>
            <div className={`${styles.bar} ${styles.bar1}`}></div>
            <div className={`${styles.bar} ${styles.bar2}`}></div>
            <div className={`${styles.bar} ${styles.bar3}`}></div>
            <div className={`${styles.bar} ${styles.bar4}`}></div>
            <div className={`${styles.bar} ${styles.bar5}`}></div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className={styles.info}>
        <div className={styles.title}>{displayTitle}</div>
        <div className={styles.artist}>{displayArtist}</div>
      </div>

      {/* Controls reorganizados */}
      <div className={styles.controls}>
        {/* Play controls centrados */}
        <div className={styles.playControls}>
          {!isRadioMode && (
            <button
              className={styles.controlBtn}
              onClick={playPrevious}
              title="Anterior"
            >
              <SkipBack size={16} />
            </button>
          )}

          <button
            className={styles.playBtn}
            onClick={togglePlayPause}
            title={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>

          {!isRadioMode && (
            <button
              className={styles.controlBtn}
              onClick={playNext}
              title="Siguiente"
            >
              <SkipForward size={16} />
            </button>
          )}

          {/* Indicador EN VIVO para radio */}
          {isRadioMode && (
            <div className={styles.liveIndicator}>
              <Radio size={12} className={styles.liveIcon} />
              <span className={styles.liveText}>EN VIVO</span>
            </div>
          )}
        </div>

        {/* Volume control a la derecha con hover desplegable */}
        <div className={styles.volumeContainer}>
          <button
            className={styles.volumeButton}
            onClick={toggleMute}
            title={volume === 0 ? 'Activar sonido' : 'Silenciar'}
          >
            {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
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
      </div>

      {/* Progress bar - Solo para tracks */}
      {!isRadioMode && (
        <div className={styles.progressContainer}>
          <div
            className={styles.progressBar}
            onClick={handleProgressClick}
          >
            <div
              className={styles.progressFill}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className={styles.timeDisplay}>
            <span className={styles.timeText}>{formatDuration(currentTime)}</span>
            <span className={styles.timeText}>{formatDuration(duration)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
