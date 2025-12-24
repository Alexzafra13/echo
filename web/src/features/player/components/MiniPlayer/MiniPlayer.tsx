import { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Radio } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { usePlayerPreference } from '../../hooks/usePlayerPreference';
import { useClickOutsideRef } from '../../hooks/useClickOutsideRef';
import { PlayerMenu } from '../PlayerMenu/PlayerMenu';
import { getPlayerDisplayInfo } from '../../utils/player.utils';
import { getCoverUrl, handleImageError } from '@shared/utils/cover.utils';
import { formatDuration } from '@shared/utils/format';
import styles from './MiniPlayer.module.css';

interface MiniPlayerProps {
  isVisible: boolean;
}

export function MiniPlayer({ isVisible }: MiniPlayerProps) {
  const [, setLocation] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { preference } = usePlayerPreference();
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

  // Cerrar menú al hacer click fuera
  useClickOutsideRef(menuRef, () => setIsMenuOpen(false), isMenuOpen);

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

  // Lógica de visibilidad basada en preferencia
  // - 'sidebar': siempre visible en sidebar (shouldShow = true)
  // - 'dynamic': visible cuando hay scroll (shouldShow = isVisible)
  // - 'footer': siempre oculto, usa footer player (shouldShow = false)
  const shouldShow =
    preference === 'sidebar' ? true :
    preference === 'dynamic' ? isVisible :
    false;

  return (
    <div className={`${styles.miniPlayer} ${shouldShow ? styles['miniPlayer--visible'] : ''}`}>
      {/* Cover con animación de reproducción */}
      <div
        className={`${styles.coverContainer} ${canNavigateToAlbum ? styles['coverContainer--clickable'] : ''}`}
        onClick={canNavigateToAlbum ? handleGoToAlbum : undefined}
        title={canNavigateToAlbum ? `Ir al álbum: ${albumName || title}` : undefined}
      >
        <img
          src={isRadioMode ? cover : getCoverUrl(cover)}
          alt={title}
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
        <div className={styles.title}>{title}</div>
        <div className={styles.artist}>{artist}</div>
      </div>

      {/* Progress bar - Debajo del artista (Solo para tracks) */}
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

      {/* Indicador EN VIVO para radio */}
      {isRadioMode && (
        <div className={styles.liveIndicator}>
          <Radio size={12} className={styles.liveIcon} />
          <span className={styles.liveText}>EN VIVO</span>
        </div>
      )}

      {/* Play controls - centrados */}
      <div className={styles.controls}>
        {!isRadioMode && (
          <button
            className={styles.controlBtn}
            onClick={playPrevious}
            title="Anterior"
          >
            <SkipBack size={18} />
          </button>
        )}

        <button
          className={styles.playBtn}
          onClick={togglePlayPause}
          title={isPlaying ? 'Pausar' : 'Reproducir'}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        {!isRadioMode && (
          <button
            className={styles.controlBtn}
            onClick={playNext}
            title="Siguiente"
          >
            <SkipForward size={18} />
          </button>
        )}

        {/* Menú de opciones - posicionado absoluto */}
        <div className={styles.menuWrapper}>
          <PlayerMenu
            isOpen={isMenuOpen}
            onToggle={() => setIsMenuOpen(!isMenuOpen)}
            onClose={() => setIsMenuOpen(false)}
            menuRef={menuRef}
            size={14}
          />
        </div>
      </div>

      {/* Volume bar horizontal */}
      <div className={styles.volumeSection}>
        <button
          className={styles.volumeButton}
          onClick={toggleMute}
          title={volume === 0 ? 'Activar sonido' : 'Silenciar'}
        >
          {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
        <div className={styles.volumeBarContainer}>
          <div className={styles.volumeBarTrack}>
            <div
              className={styles.volumeBarFill}
              style={{ width: `${volume * 100}%` }}
            />
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className={styles.volumeBarInput}
          />
        </div>
      </div>
    </div>
  );
}
