import { useState, useEffect, useCallback } from 'react';
import { MoreHorizontal, Edit2, Download, Trash2, Globe, Lock, X } from 'lucide-react';
import { useDropdownMenu, useSheetDragToClose } from '@shared/hooks';
import { Portal } from '@shared/components/ui';
import styles from './PlaylistOptionsMenu.module.css';

interface PlaylistOptionsMenuProps {
  onEdit?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  onToggleVisibility?: () => void;
  isPublic?: boolean;
  playlistName?: string;
  playlistCoverUrl?: string;
  dominantColor?: string;
}

export function PlaylistOptionsMenu({
  onEdit,
  onDownload,
  onDelete,
  onToggleVisibility,
  isPublic,
  playlistName,
  playlistCoverUrl,
  dominantColor,
}: PlaylistOptionsMenuProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetClosing, setSheetClosing] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const {
    isOpen,
    isClosing,
    triggerRef,
    dropdownRef,
    effectivePosition,
    toggleMenu,
    handleOptionClick,
  } = useDropdownMenu({ offset: 8 });

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
    (e: React.MouseEvent, callback?: () => void) => {
      e.stopPropagation();
      if (callback) callback();
      closeSheet();
    },
    [closeSheet]
  );

  useEffect(() => {
    if (sheetOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [sheetOpen]);

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

  const renderOptions = (
    onOption: (e: React.MouseEvent, cb?: () => void) => void,
    isSheet = false
  ) => (
    <>
      {onEdit && (
        <button
          className={
            isSheet ? styles.playlistOptionsMenu__sheetOption : styles.playlistOptionsMenu__option
          }
          onClick={(e) => onOption(e, onEdit)}
        >
          <Edit2 size={isSheet ? 18 : 16} />
          <span>Editar playlist</span>
        </button>
      )}

      {onToggleVisibility && (
        <button
          className={
            isSheet ? styles.playlistOptionsMenu__sheetOption : styles.playlistOptionsMenu__option
          }
          onClick={(e) => onOption(e, onToggleVisibility)}
        >
          {isPublic ? <Lock size={isSheet ? 18 : 16} /> : <Globe size={isSheet ? 18 : 16} />}
          <span>{isPublic ? 'Hacer privada' : 'Hacer pública'}</span>
        </button>
      )}

      {onDownload && (
        <button
          className={
            isSheet ? styles.playlistOptionsMenu__sheetOption : styles.playlistOptionsMenu__option
          }
          onClick={(e) => onOption(e, onDownload)}
        >
          <Download size={isSheet ? 18 : 16} />
          <span>Descargar playlist</span>
        </button>
      )}

      {onDelete && (
        <>
          <div className={styles.playlistOptionsMenu__separator} />
          <button
            className={`${isSheet ? styles.playlistOptionsMenu__sheetOption : styles.playlistOptionsMenu__option} ${styles['playlistOptionsMenu__option--danger']}`}
            onClick={(e) => onOption(e, onDelete)}
          >
            <Trash2 size={isSheet ? 18 : 16} />
            <span>Eliminar playlist</span>
          </button>
        </>
      )}
    </>
  );

  return (
    <>
      <div className={styles.playlistOptionsMenu}>
        <button
          ref={triggerRef}
          className={styles.playlistOptionsMenu__trigger}
          onClick={isMobile ? openSheet : toggleMenu}
          aria-label="Opciones de la playlist"
          aria-expanded={isMobile ? sheetOpen : isOpen}
          title="Más opciones"
        >
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Desktop: dropdown */}
      {!isMobile && isOpen && effectivePosition && (
        <Portal>
          <div
            ref={dropdownRef}
            className={`${styles.playlistOptionsMenu__dropdown} ${isClosing ? styles['playlistOptionsMenu__dropdown--closing'] : ''}`}
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
            {renderOptions((e, cb) => handleOptionClick(e, cb))}
          </div>
        </Portal>
      )}

      {/* Mobile: bottom sheet */}
      {isMobile && sheetOpen && (
        <Portal>
          <div
            ref={dragOverlayRef}
            className={`${styles.playlistOptionsMenu__overlay} ${sheetClosing ? styles['playlistOptionsMenu__overlay--closing'] : ''}`}
            onClick={closeSheet}
          />
          <div
            ref={dragSheetRef}
            className={`${styles.playlistOptionsMenu__sheet} ${sheetClosing ? styles['playlistOptionsMenu__sheet--closing'] : ''}`}
            style={{ '--dominant-color': dominantColor } as React.CSSProperties}
          >
            <div className={styles.playlistOptionsMenu__sheetHandleArea}>
              <div className={styles.playlistOptionsMenu__sheetHandle} />
            </div>

            {/* Playlist info header */}
            <div className={styles.playlistOptionsMenu__sheetHeader}>
              {playlistCoverUrl && (
                <img
                  src={playlistCoverUrl}
                  alt={playlistName || ''}
                  className={styles.playlistOptionsMenu__sheetCover}
                  onError={(e) => {
                    e.currentTarget.src = '/images/empy_cover/empy_cover_default.png';
                  }}
                />
              )}
              <div className={styles.playlistOptionsMenu__sheetInfo}>
                {playlistName && (
                  <span className={styles.playlistOptionsMenu__sheetTitle}>{playlistName}</span>
                )}
                <span className={styles.playlistOptionsMenu__sheetSubtitle}>Playlist</span>
              </div>
              <button className={styles.playlistOptionsMenu__sheetClose} onClick={closeSheet}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.playlistOptionsMenu__separator} />

            <div ref={dragScrollRef} className={styles.playlistOptionsMenu__sheetContent}>
              {renderOptions(handleSheetOptionClick, true)}
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
