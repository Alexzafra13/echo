import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal, Edit2, Download, Trash2, Globe, Lock, X, Users } from 'lucide-react';
import { useDropdownMenu, useSheetDragToClose, useIsMobile } from '@shared/hooks';
import { Portal } from '@shared/components/ui';
import styles from './PlaylistOptionsMenu.module.css';

interface PlaylistOptionsMenuProps {
  onEdit?: () => void;
  onShare?: () => void;
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
  onShare,
  onDownload,
  onDelete,
  onToggleVisibility,
  isPublic,
  playlistName,
  playlistCoverUrl,
  dominantColor,
}: PlaylistOptionsMenuProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetClosing, setSheetClosing] = useState(false);

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
          <span>{t('playlists.editPlaylist')}</span>
        </button>
      )}

      {onShare && (
        <button
          className={
            isSheet ? styles.playlistOptionsMenu__sheetOption : styles.playlistOptionsMenu__option
          }
          onClick={(e) => onOption(e, onShare)}
        >
          <Users size={isSheet ? 18 : 16} />
          <span>{t('playlists.share')}</span>
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
          <span>{isPublic ? t('playlists.makePrivate') : t('playlists.makePublic')}</span>
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
          <span>{t('playlists.downloadPlaylist')}</span>
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
            <span>{t('playlists.deletePlaylist')}</span>
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
          aria-label={t('playlists.playlistOptions')}
          aria-expanded={isMobile ? sheetOpen : isOpen}
          title={t('playlists.moreOptions')}
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
                <span className={styles.playlistOptionsMenu__sheetSubtitle}>
                  {t('playlists.typeLabel')}
                </span>
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
