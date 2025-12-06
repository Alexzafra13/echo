import { MoreHorizontal, Info, ListPlus, Download, Image } from 'lucide-react';
import { useAuth, useDropdownMenu } from '@shared/hooks';
import { Portal } from '@shared/components/ui';
import styles from './AlbumOptionsMenu.module.css';

interface AlbumOptionsMenuProps {
  onShowInfo?: () => void;
  onAddToPlaylist?: () => void;
  onDownload?: () => void;
  onChangeCover?: () => void;
}

/**
 * AlbumOptionsMenu Component
 * Displays a dropdown menu with album options (3 dots menu)
 * Uses Portal to render dropdown outside parent hierarchy to avoid overflow issues
 */
export function AlbumOptionsMenu({
  onShowInfo,
  onAddToPlaylist,
  onDownload,
  onChangeCover,
}: AlbumOptionsMenuProps) {
  const { user } = useAuth();
  const {
    isOpen,
    isClosing,
    triggerRef,
    dropdownRef,
    effectivePosition,
    toggleMenu,
    handleOptionClick,
  } = useDropdownMenu({ offset: 8 });

  return (
    <>
      <div className={styles.albumOptionsMenu}>
        <button
          ref={triggerRef}
          className={styles.albumOptionsMenu__trigger}
          onClick={toggleMenu}
          aria-label="Opciones del álbum"
          aria-expanded={isOpen}
          title="Más opciones"
        >
          <MoreHorizontal size={20} />
        </button>
      </div>

      {isOpen && effectivePosition && (
        <Portal>
          <div
            ref={dropdownRef}
            className={`${styles.albumOptionsMenu__dropdown} ${isClosing ? styles['albumOptionsMenu__dropdown--closing'] : ''}`}
            style={{
              position: 'fixed',
              top: effectivePosition.top !== undefined ? `${effectivePosition.top}px` : undefined,
              bottom: effectivePosition.bottom !== undefined ? `${effectivePosition.bottom}px` : undefined,
              right: effectivePosition.right !== undefined ? `${effectivePosition.right}px` : undefined,
              left: effectivePosition.left !== undefined ? `${effectivePosition.left}px` : undefined,
              maxHeight: `${effectivePosition.maxHeight}px`,
              pointerEvents: isClosing ? 'none' : 'auto',
            }}
            data-placement={effectivePosition.placement}
          >
            {onShowInfo && (
              <button
                className={styles.albumOptionsMenu__option}
                onClick={(e) => handleOptionClick(e, onShowInfo)}
              >
                <Info size={16} />
                <span>Ver información</span>
              </button>
            )}

            {onAddToPlaylist && (
              <button
                className={styles.albumOptionsMenu__option}
                onClick={(e) => handleOptionClick(e, onAddToPlaylist)}
              >
                <ListPlus size={16} />
                <span>Agregar a playlist</span>
              </button>
            )}

            {user?.isAdmin && onChangeCover && (
              <button
                className={styles.albumOptionsMenu__option}
                onClick={(e) => handleOptionClick(e, onChangeCover)}
              >
                <Image size={16} />
                <span>Cambiar carátula</span>
              </button>
            )}

            {onDownload && (
              <>
                <div className={styles.albumOptionsMenu__separator} />
                <button
                  className={styles.albumOptionsMenu__option}
                  onClick={(e) => handleOptionClick(e, onDownload)}
                  disabled
                  title="Próximamente"
                >
                  <Download size={16} />
                  <span>Descargar (próximamente)</span>
                </button>
              </>
            )}
          </div>
        </Portal>
      )}
    </>
  );
}
