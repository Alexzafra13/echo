import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Info, ListPlus, Download } from 'lucide-react';
import styles from './AlbumOptionsMenu.module.css';

interface AlbumOptionsMenuProps {
  onShowInfo?: () => void;
  onAddToPlaylist?: () => void;
  onDownload?: () => void;
}

/**
 * AlbumOptionsMenu Component
 * Displays a dropdown menu with album options (3 dots menu)
 */
export function AlbumOptionsMenu({
  onShowInfo,
  onAddToPlaylist,
  onDownload,
}: AlbumOptionsMenuProps) {
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
    <div className={styles.albumOptionsMenu} ref={menuRef}>
      <button
        className={styles.albumOptionsMenu__trigger}
        onClick={toggleMenu}
        aria-label="Opciones del álbum"
        title="Más opciones"
      >
        <MoreHorizontal size={20} />
      </button>

      {isOpen && (
        <div className={styles.albumOptionsMenu__dropdown}>
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
      )}
    </div>
  );
}
