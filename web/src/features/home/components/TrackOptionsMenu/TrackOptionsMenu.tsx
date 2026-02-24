import {
  MoreVertical,
  ListPlus,
  Plus,
  Disc,
  User,
  Info,
  Trash2,
  Download,
  Star,
} from 'lucide-react';
import { useDropdownMenu } from '@shared/hooks';
import { Portal } from '@shared/components/ui';
import { RatingStars } from '@shared/components/ui/RatingStars';
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
  onDownload?: (track: Track) => void;
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
  onDownload,
}: TrackOptionsMenuProps) {
  const {
    isOpen,
    isClosing,
    triggerRef,
    dropdownRef,
    effectivePosition,
    toggleMenu,
    handleOptionClick,
  } = useDropdownMenu({ offset: 4 });

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

      {isOpen && effectivePosition && (
        <Portal>
          <div
            ref={dropdownRef}
            className={`${styles.trackOptionsMenu__dropdown} ${isClosing ? styles['trackOptionsMenu__dropdown--closing'] : ''}`}
            style={{
              position: 'fixed',
              top: effectivePosition.top !== undefined ? `${effectivePosition.top}px` : undefined,
              bottom:
                effectivePosition.bottom !== undefined
                  ? `${effectivePosition.bottom}px`
                  : undefined,
              right:
                effectivePosition.right !== undefined ? `${effectivePosition.right}px` : undefined,
              left:
                effectivePosition.left !== undefined ? `${effectivePosition.left}px` : undefined,
              maxHeight: `${effectivePosition.maxHeight}px`,
              pointerEvents: isClosing ? 'none' : 'auto',
            }}
            data-placement={effectivePosition.placement}
          >
            {onAddToPlaylist && (
              <button
                className={styles.trackOptionsMenu__option}
                onClick={(e) => handleOptionClick(e, onAddToPlaylist, track)}
              >
                <ListPlus size={16} />
                <span>Agregar a playlist</span>
              </button>
            )}

            {onAddToQueue && (
              <button
                className={styles.trackOptionsMenu__option}
                onClick={(e) => handleOptionClick(e, onAddToQueue, track)}
              >
                <Plus size={16} />
                <span>Agregar a la cola</span>
              </button>
            )}

            {onRemoveFromPlaylist && (
              <button
                className={`${styles.trackOptionsMenu__option} ${styles.trackOptionsMenu__optionDanger}`}
                onClick={(e) => handleOptionClick(e, onRemoveFromPlaylist, track)}
              >
                <Trash2 size={16} />
                <span>Quitar de la playlist</span>
              </button>
            )}

            <div className={styles.trackOptionsMenu__separator} />

            {onGoToAlbum && (
              <button
                className={styles.trackOptionsMenu__option}
                onClick={(e) => handleOptionClick(e, onGoToAlbum, track)}
              >
                <Disc size={16} />
                <span>Ir al álbum</span>
              </button>
            )}

            {onGoToArtist && (
              <button
                className={styles.trackOptionsMenu__option}
                onClick={(e) => handleOptionClick(e, onGoToArtist, track)}
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
                  onClick={(e) => handleOptionClick(e, onShowInfo, track)}
                >
                  <Info size={16} />
                  <span>Ver información</span>
                </button>
              </>
            )}

            {onDownload && (
              <>
                <div className={styles.trackOptionsMenu__separator} />
                <button
                  className={styles.trackOptionsMenu__option}
                  onClick={(e) => handleOptionClick(e, onDownload, track)}
                  title="Descargar canción"
                >
                  <Download size={16} />
                  <span>Descargar</span>
                </button>
              </>
            )}

            {/* Rating */}
            <div className={styles.trackOptionsMenu__separator} />
            <div
              className={styles.trackOptionsMenu__ratingRow}
              onClick={(e) => e.stopPropagation()}
            >
              <Star size={16} />
              <span>Calificar</span>
              <div className={styles.trackOptionsMenu__ratingStars}>
                <RatingStars itemId={track.id} itemType="track" size={16} />
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
