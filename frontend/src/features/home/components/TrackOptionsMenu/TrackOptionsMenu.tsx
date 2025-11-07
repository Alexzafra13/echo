import { useState, useRef, useEffect } from 'react';
import { MoreVertical, ListPlus, Plus, PlayCircle, Disc, User, Info } from 'lucide-react';
import type { Track } from '../../types';
import styles from './TrackOptionsMenu.module.css';

interface TrackOptionsMenuProps {
  track: Track;
  onAddToPlaylist?: (track: Track) => void;
  onAddToQueue?: (track: Track) => void;
  onPlayNext?: (track: Track) => void;
  onGoToAlbum?: (track: Track) => void;
  onGoToArtist?: (track: Track) => void;
  onShowInfo?: (track: Track) => void;
}

/**
 * TrackOptionsMenu Component
 * Displays a dropdown menu with track options (3 dots menu)
 */
export function TrackOptionsMenu({
  track,
  onAddToPlaylist,
  onAddToQueue,
  onPlayNext,
  onGoToAlbum,
  onGoToArtist,
  onShowInfo,
}: TrackOptionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleOptionClick = (callback?: (track: Track) => void) => {
    if (callback) {
      callback(track);
    }
    setIsOpen(false);
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className={styles.trackOptionsMenu} ref={menuRef}>
      <button
        className={`${styles.trackOptionsMenu__trigger} trackOptionsMenu__trigger`}
        onClick={toggleMenu}
        aria-label="Opciones de la canción"
        title="Más opciones"
      >
        <MoreVertical size={18} />
      </button>

      {isOpen && (
        <div className={styles.trackOptionsMenu__dropdown}>
          {onAddToPlaylist && (
            <button
              className={styles.trackOptionsMenu__option}
              onClick={() => handleOptionClick(onAddToPlaylist)}
            >
              <ListPlus size={16} />
              <span>Agregar a playlist</span>
            </button>
          )}

          {onAddToQueue && (
            <button
              className={styles.trackOptionsMenu__option}
              onClick={() => handleOptionClick(onAddToQueue)}
            >
              <Plus size={16} />
              <span>Agregar a la cola</span>
            </button>
          )}

          {onPlayNext && (
            <button
              className={styles.trackOptionsMenu__option}
              onClick={() => handleOptionClick(onPlayNext)}
            >
              <PlayCircle size={16} />
              <span>Reproducir siguiente</span>
            </button>
          )}

          <div className={styles.trackOptionsMenu__separator} />

          {onGoToAlbum && (
            <button
              className={styles.trackOptionsMenu__option}
              onClick={() => handleOptionClick(onGoToAlbum)}
            >
              <Disc size={16} />
              <span>Ir al álbum</span>
            </button>
          )}

          {onGoToArtist && (
            <button
              className={styles.trackOptionsMenu__option}
              onClick={() => handleOptionClick(onGoToArtist)}
            >
              <User size={16} />
              <span>Ir al artista</span>
            </button>
          )}

          {onShowInfo && (
            <>
              <div className={styles.trackOptionsMenu__separator} />
              <button
                className={styles.trackOptionsMenu__option}
                onClick={() => handleOptionClick(onShowInfo)}
              >
                <Info size={16} />
                <span>Ver información</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
