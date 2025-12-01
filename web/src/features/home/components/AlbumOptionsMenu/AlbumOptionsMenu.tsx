import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Info, ListPlus, Download, Image } from 'lucide-react';
import { useAuth, useDropdownPosition } from '@shared/hooks';
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
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Calculate dropdown position with smart placement
  const position = useDropdownPosition({
    isOpen,
    triggerRef,
    offset: 8,
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

  const handleOptionClick = (e: React.MouseEvent, callback?: () => void) => {
    e.stopPropagation();
    if (callback) {
      callback();
    }
    setIsOpen(false);
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

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

      {isOpen && position && (
        <Portal>
          <div
            ref={dropdownRef}
            className={styles.albumOptionsMenu__dropdown}
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
