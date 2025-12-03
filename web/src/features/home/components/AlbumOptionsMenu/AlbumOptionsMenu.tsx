import { useState, useRef, useEffect, useCallback } from 'react';
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
  const [isClosing, setIsClosing] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastPositionRef = useRef<ReturnType<typeof useDropdownPosition>>(null);
  const { user } = useAuth();

  // Calculate dropdown position with smart placement
  const position = useDropdownPosition({
    isOpen: isOpen && !isClosing,
    triggerRef,
    offset: 8,
    align: 'right',
    maxHeight: 400,
  });

  // Keep last valid position for closing animation
  if (position) {
    lastPositionRef.current = position;
  }
  const effectivePosition = isClosing ? lastPositionRef.current : position;

  // Function to close with animation
  const closeMenu = useCallback(() => {
    if (!isOpen || isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 150);
  }, [isOpen, isClosing]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, closeMenu]);

  // Close menu on scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => {
      closeMenu();
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, closeMenu]);

  const handleOptionClick = (e: React.MouseEvent, callback?: () => void) => {
    e.stopPropagation();
    if (callback) {
      callback();
    }
    closeMenu();
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      closeMenu();
    } else {
      setIsOpen(true);
    }
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
