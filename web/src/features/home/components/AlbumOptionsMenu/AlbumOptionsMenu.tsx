import { useState, useEffect, useCallback } from 'react';
import { MoreHorizontal, Info, ListPlus, Download, Image, X } from 'lucide-react';
import { useAuth, useDropdownMenu, useSheetDragToClose } from '@shared/hooks';
import { Portal } from '@shared/components/ui';
import styles from './AlbumOptionsMenu.module.css';

interface AlbumOptionsMenuProps {
  onShowInfo?: () => void;
  onAddToPlaylist?: () => void;
  onDownload?: () => void;
  onChangeCover?: () => void;
  albumTitle?: string;
  albumArtist?: string;
  albumCoverUrl?: string;
  dominantColor?: string;
}

export function AlbumOptionsMenu({
  onShowInfo,
  onAddToPlaylist,
  onDownload,
  onChangeCover,
  albumTitle,
  albumArtist,
  albumCoverUrl,
  dominantColor,
}: AlbumOptionsMenuProps) {
  const { user } = useAuth();
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
      {onShowInfo && (
        <button
          className={
            isSheet ? styles.albumOptionsMenu__sheetOption : styles.albumOptionsMenu__option
          }
          onClick={(e) => onOption(e, onShowInfo)}
        >
          <Info size={isSheet ? 18 : 16} />
          <span>Ver información</span>
        </button>
      )}

      {onAddToPlaylist && (
        <button
          className={
            isSheet ? styles.albumOptionsMenu__sheetOption : styles.albumOptionsMenu__option
          }
          onClick={(e) => onOption(e, onAddToPlaylist)}
        >
          <ListPlus size={isSheet ? 18 : 16} />
          <span>Agregar a playlist</span>
        </button>
      )}

      {user?.isAdmin && onChangeCover && (
        <button
          className={
            isSheet ? styles.albumOptionsMenu__sheetOption : styles.albumOptionsMenu__option
          }
          onClick={(e) => onOption(e, onChangeCover)}
        >
          <Image size={isSheet ? 18 : 16} />
          <span>Cambiar carátula</span>
        </button>
      )}

      {onDownload && (
        <>
          <div className={styles.albumOptionsMenu__separator} />
          <button
            className={
              isSheet ? styles.albumOptionsMenu__sheetOption : styles.albumOptionsMenu__option
            }
            onClick={(e) => onOption(e, onDownload)}
            title="Descargar álbum como ZIP"
          >
            <Download size={isSheet ? 18 : 16} />
            <span>Descargar álbum</span>
          </button>
        </>
      )}
    </>
  );

  return (
    <>
      <div className={styles.albumOptionsMenu}>
        <button
          ref={triggerRef}
          className={styles.albumOptionsMenu__trigger}
          onClick={isMobile ? openSheet : toggleMenu}
          aria-label="Opciones del álbum"
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
            className={`${styles.albumOptionsMenu__dropdown} ${isClosing ? styles['albumOptionsMenu__dropdown--closing'] : ''}`}
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
            className={`${styles.albumOptionsMenu__overlay} ${sheetClosing ? styles['albumOptionsMenu__overlay--closing'] : ''}`}
            onClick={closeSheet}
          />
          <div
            ref={dragSheetRef}
            className={`${styles.albumOptionsMenu__sheet} ${sheetClosing ? styles['albumOptionsMenu__sheet--closing'] : ''}`}
            style={{ '--dominant-color': dominantColor } as React.CSSProperties}
          >
            <div className={styles.albumOptionsMenu__sheetHandleArea}>
              <div className={styles.albumOptionsMenu__sheetHandle} />
            </div>

            {/* Album info header */}
            <div className={styles.albumOptionsMenu__sheetHeader}>
              {albumCoverUrl && (
                <img
                  src={albumCoverUrl}
                  alt={albumTitle || ''}
                  className={styles.albumOptionsMenu__sheetCover}
                  onError={(e) => {
                    e.currentTarget.src = '/images/empy_cover/empy_cover_default.png';
                  }}
                />
              )}
              <div className={styles.albumOptionsMenu__sheetInfo}>
                {albumTitle && (
                  <span className={styles.albumOptionsMenu__sheetTitle}>{albumTitle}</span>
                )}
                {albumArtist && (
                  <span className={styles.albumOptionsMenu__sheetArtist}>{albumArtist}</span>
                )}
              </div>
              <button className={styles.albumOptionsMenu__sheetClose} onClick={closeSheet}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.albumOptionsMenu__separator} />

            <div ref={dragScrollRef} className={styles.albumOptionsMenu__sheetContent}>
              {renderOptions(handleSheetOptionClick, true)}
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
