import { useState, useRef, useEffect } from 'react';
import { MoreVertical, ListPlus, Plus, Disc, User, Info, Trash2 } from 'lucide-react';
import { useDropdownPosition } from '@shared/hooks';
import { Portal } from '@shared/components/ui';
import type { Track } from '../../types';
import styles from './TrackOptionsMenu.module.css';

interface TrackOptionsMenuProps {
  track: Track;
  onAddToPlaylist?: (track: Track) => void;
  onAddToQueue?: (track: Track) => void;
  onGoToAlbum?: (track: Track) => void;
  onGoToArtist?: (track: Track) => void;
  onShowInfo?: (track: Track) => void;
  onRemoveFromPlaylist?: (track: Track) => void;
}

/**
 * TrackOptionsMenu Component
 * Displays a dropdown menu with track options (3 dots menu)
 * Uses Portal to render dropdown outside parent hierarchy to avoid overflow issues
 */
export function TrackOptionsMenu({
  track,
  onAddToPlaylist,
  onAddToQueue,
  onGoToAlbum,
  onGoToArtist,
  onShowInfo,
  onRemoveFromPlaylist,
}: TrackOptionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calculate dropdown position with smart placement
  const position = useDropdownPosition({
    isOpen,
    triggerRef,
    offset: 4,
    align: 'right',
    maxHeight: 400,
  });

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
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

  const handleOptionClick = (e: React.MouseEvent, callback?: (track: Track) => void) => {
    e.stopPropagation();
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
    <>
      <div className={styles.trackOptionsMenu}>
        <button
          ref={triggerRef}
          className={`${styles.trackOptionsMenu__trigger} trackOptionsMenu__trigger`}
          onClick={toggleMenu}
          aria-label="Opciones de la canción"
          aria-expanded={isOpen}
          title="Más opciones"
        >
          <MoreVertical size={18} />
        </button>
      </div>

      {isOpen && position && (
        <Portal>
          <div
            ref={dropdownRef}
            className={styles.trackOptionsMenu__dropdown}
            style={{
              position: 'fixed',
              top: `${position.top}px`,
              right: position.right !== undefined ? `${position.right}px` : undefined,
              left: position.left !== undefined ? `${position.left}px` : undefined,
              maxHeight: `${position.maxHeight}px`,
              pointerEvents: 'auto',
            }}
            data-placement={position.placement}
          >
            {onAddToPlaylist && (
              <button
                className={styles.trackOptionsMenu__option}
                onClick={(e) => handleOptionClick(e, onAddToPlaylist)}
              >
                <ListPlus size={16} />
                <span>Agregar a playlist</span>
              </button>
            )}

            {onAddToQueue && (
              <button
                className={styles.trackOptionsMenu__option}
                onClick={(e) => handleOptionClick(e, onAddToQueue)}
              >
                <Plus size={16} />
                <span>Agregar a la cola</span>
              </button>
            )}

            {onRemoveFromPlaylist && (
              <button
                className={`${styles.trackOptionsMenu__option} ${styles.trackOptionsMenu__optionDanger}`}
                onClick={(e) => handleOptionClick(e, onRemoveFromPlaylist)}
              >
                <Trash2 size={16} />
                <span>Quitar de la playlist</span>
              </button>
            )}

            <div className={styles.trackOptionsMenu__separator} />

            {onGoToAlbum && (
              <button
                className={styles.trackOptionsMenu__option}
                onClick={(e) => handleOptionClick(e, onGoToAlbum)}
              >
                <Disc size={16} />
                <span>Ir al álbum</span>
              </button>
            )}

            {onGoToArtist && (
              <button
                className={styles.trackOptionsMenu__option}
                onClick={(e) => handleOptionClick(e, onGoToArtist)}
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
                  onClick={(e) => handleOptionClick(e, onShowInfo)}
                >
                  <Info size={16} />
                  <span>Ver información</span>
                </button>
              </>
            )}
          </div>
        </Portal>
      )}
    </>
  );
}
