import { useState, useEffect, useCallback } from 'react';
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
  X,
} from 'lucide-react';
import { useDropdownMenu, useSheetDragToClose } from '@shared/hooks';
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
 * Desktop: dropdown menu near the trigger button
 * Mobile: bottom sheet with track info header (Spotify-style)
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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetClosing, setSheetClosing] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Desktop dropdown hook
  const {
    isOpen: dropdownOpen,
    isClosing: dropdownClosing,
    triggerRef,
    dropdownRef,
    effectivePosition,
    toggleMenu: toggleDropdown,
    handleOptionClick: handleDropdownOptionClick,
  } = useDropdownMenu({ offset: 4 });

  // Mobile bottom sheet handlers
  const openSheet = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    if (sheetClosing) return;
    setSheetClosing(true);
    setTimeout(() => {
      setSheetOpen(false);
      setSheetClosing(false);
    }, 300);
  }, [sheetClosing]);

  const handleSheetOptionClick = useCallback(
    (e: React.MouseEvent, callback?: (track: Track) => void) => {
      e.stopPropagation();
      if (callback) callback(track);
      closeSheet();
    },
    [track, closeSheet]
  );

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (sheetOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [sheetOpen]);

  // Drag-down-to-close for mobile bottom sheet
  const {
    sheetRef: dragSheetRef,
    scrollRef: dragScrollRef,
    overlayRef: dragOverlayRef,
  } = useSheetDragToClose({
    onClose: () => {
      setSheetOpen(false);
      setSheetClosing(false);
    },
    enabled: isMobile && sheetOpen,
  });

  const coverUrl = track.albumId ? `/api/albums/${track.albumId}/cover` : '/placeholder-album.png';

  // Shared options content
  const renderOptions = (onOption: (e: React.MouseEvent, cb?: (track: Track) => void) => void) => (
    <>
      {onAddToPlaylist && (
        <button
          className={styles.trackOptionsMenu__option}
          onClick={(e) => onOption(e, onAddToPlaylist)}
        >
          <ListPlus size={18} />
          <span>Agregar a playlist</span>
        </button>
      )}

      {onAddToQueue && (
        <button
          className={styles.trackOptionsMenu__option}
          onClick={(e) => onOption(e, onAddToQueue)}
        >
          <Plus size={18} />
          <span>Agregar a la cola</span>
        </button>
      )}

      {onRemoveFromPlaylist && (
        <button
          className={`${styles.trackOptionsMenu__option} ${styles.trackOptionsMenu__optionDanger}`}
          onClick={(e) => onOption(e, onRemoveFromPlaylist)}
        >
          <Trash2 size={18} />
          <span>Quitar de la playlist</span>
        </button>
      )}

      <div className={styles.trackOptionsMenu__separator} />

      {onGoToAlbum && (
        <button
          className={styles.trackOptionsMenu__option}
          onClick={(e) => onOption(e, onGoToAlbum)}
        >
          <Disc size={18} />
          <span>Ir al álbum</span>
        </button>
      )}

      {onGoToArtist && (
        <button
          className={styles.trackOptionsMenu__option}
          onClick={(e) => onOption(e, onGoToArtist)}
        >
          <User size={18} />
          <span>Ir al artista</span>
        </button>
      )}

      {onShowInfo && (
        <>
          <div className={styles.trackOptionsMenu__separator} />
          <button
            className={styles.trackOptionsMenu__option}
            onClick={(e) => onOption(e, onShowInfo)}
          >
            <Info size={18} />
            <span>Ver información</span>
          </button>
        </>
      )}

      {onDownload && (
        <>
          <div className={styles.trackOptionsMenu__separator} />
          <button
            className={styles.trackOptionsMenu__option}
            onClick={(e) => onOption(e, onDownload)}
          >
            <Download size={18} />
            <span>Descargar</span>
          </button>
        </>
      )}

      {/* Rating */}
      <div className={styles.trackOptionsMenu__separator} />
      <div className={styles.trackOptionsMenu__ratingRow} onClick={(e) => e.stopPropagation()}>
        <Star size={18} />
        <span>Calificar</span>
        <div className={styles.trackOptionsMenu__ratingStars}>
          <RatingStars itemId={track.id} itemType="track" size={18} />
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className={styles.trackOptionsMenu}>
        <button
          ref={triggerRef}
          className={`${styles.trackOptionsMenu__trigger} trackOptionsMenu__trigger`}
          onClick={isMobile ? openSheet : toggleDropdown}
          aria-label="Opciones de la canción"
          aria-expanded={isMobile ? sheetOpen : dropdownOpen}
          title="Más opciones"
        >
          <MoreVertical size={18} />
        </button>
      </div>

      {/* Desktop: dropdown */}
      {!isMobile && dropdownOpen && effectivePosition && (
        <Portal>
          <div
            ref={dropdownRef}
            className={`${styles.trackOptionsMenu__dropdown} ${dropdownClosing ? styles['trackOptionsMenu__dropdown--closing'] : ''}`}
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
              pointerEvents: dropdownClosing ? 'none' : 'auto',
            }}
            data-placement={effectivePosition.placement}
          >
            {renderOptions((e, cb) => handleDropdownOptionClick(e, cb, track))}
          </div>
        </Portal>
      )}

      {/* Mobile: bottom sheet */}
      {isMobile && sheetOpen && (
        <Portal>
          <div
            ref={dragOverlayRef}
            className={`${styles.trackOptionsMenu__overlay} ${sheetClosing ? styles['trackOptionsMenu__overlay--closing'] : ''}`}
            onClick={closeSheet}
          />
          <div
            ref={dragSheetRef}
            className={`${styles.trackOptionsMenu__sheet} ${sheetClosing ? styles['trackOptionsMenu__sheet--closing'] : ''}`}
          >
            {/* Drag handle */}
            <div className={styles.trackOptionsMenu__sheetHandleArea}>
              <div className={styles.trackOptionsMenu__sheetHandle} />
            </div>

            {/* Track info header */}
            <div className={styles.trackOptionsMenu__sheetHeader}>
              <img
                src={coverUrl}
                alt={track.title}
                className={styles.trackOptionsMenu__sheetCover}
                onError={(e) => {
                  e.currentTarget.src = '/placeholder-album.png';
                }}
              />
              <div className={styles.trackOptionsMenu__sheetInfo}>
                <span className={styles.trackOptionsMenu__sheetTitle}>{track.title}</span>
                {track.artistName && (
                  <span className={styles.trackOptionsMenu__sheetArtist}>{track.artistName}</span>
                )}
              </div>
              <button className={styles.trackOptionsMenu__sheetClose} onClick={closeSheet}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.trackOptionsMenu__separator} />

            {/* Options */}
            <div ref={dragScrollRef} className={styles.trackOptionsMenu__sheetContent}>
              {renderOptions(handleSheetOptionClick)}
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
