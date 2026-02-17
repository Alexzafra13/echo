import { MoreHorizontal, Edit2, Download, Trash2, Globe, Lock } from 'lucide-react';
import { useDropdownMenu } from '@shared/hooks';
import { Portal } from '@shared/components/ui';
import styles from './PlaylistOptionsMenu.module.css';

interface PlaylistOptionsMenuProps {
  onEdit?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  onToggleVisibility?: () => void;
  isPublic?: boolean;
}

export function PlaylistOptionsMenu({
  onEdit,
  onDownload,
  onDelete,
  onToggleVisibility,
  isPublic,
}: PlaylistOptionsMenuProps) {
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
      <div className={styles.playlistOptionsMenu}>
        <button
          ref={triggerRef}
          className={styles.playlistOptionsMenu__trigger}
          onClick={toggleMenu}
          aria-label="Opciones de la playlist"
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
            className={`${styles.playlistOptionsMenu__dropdown} ${isClosing ? styles['playlistOptionsMenu__dropdown--closing'] : ''}`}
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
            {onEdit && (
              <button
                className={styles.playlistOptionsMenu__option}
                onClick={(e) => handleOptionClick(e, onEdit)}
              >
                <Edit2 size={16} />
                <span>Editar playlist</span>
              </button>
            )}

            {onToggleVisibility && (
              <button
                className={styles.playlistOptionsMenu__option}
                onClick={(e) => handleOptionClick(e, onToggleVisibility)}
              >
                {isPublic ? <Lock size={16} /> : <Globe size={16} />}
                <span>{isPublic ? 'Hacer privada' : 'Hacer pública'}</span>
              </button>
            )}

            {onDownload && (
              <button
                className={styles.playlistOptionsMenu__option}
                onClick={(e) => handleOptionClick(e, onDownload)}
              >
                <Download size={16} />
                <span>Descargar playlist</span>
              </button>
            )}

            {onDelete && (
              <>
                <div className={styles.playlistOptionsMenu__separator} />
                <button
                  className={`${styles.playlistOptionsMenu__option} ${styles['playlistOptionsMenu__option--danger']}`}
                  onClick={(e) => handleOptionClick(e, onDelete)}
                >
                  <Trash2 size={16} />
                  <span>Eliminar playlist</span>
                </button>
              </>
            )}
          </div>
        </Portal>
      )}
    </>
  );
}
