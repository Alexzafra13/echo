import { useState, useRef, useEffect } from 'react';
import { MoreVertical, ImageIcon, Frame, Move, Tag } from 'lucide-react';
import { useDropdownPosition } from '@shared/hooks';
import { Portal } from '@shared/components/ui';
import styles from './ArtistOptionsMenu.module.css';

interface ArtistOptionsMenuProps {
  onChangeProfile?: () => void;
  onChangeBackground?: () => void;
  onAdjustPosition?: () => void;
  onChangeLogo?: () => void;
  hasBackground?: boolean;
}

/**
 * ArtistOptionsMenu Component
 * Displays a dropdown menu with artist image options (3 dots menu on avatar)
 * Uses Portal to render dropdown outside parent hierarchy to avoid overflow issues
 */
export function ArtistOptionsMenu({
  onChangeProfile,
  onChangeBackground,
  onAdjustPosition,
  onChangeLogo,
  hasBackground = false,
}: ArtistOptionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close menu on scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => {
      setIsOpen(false);
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
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
      <button
        ref={triggerRef}
        className={styles.artistOptionsMenu__trigger}
        onClick={toggleMenu}
        aria-label="Opciones de imágenes del artista"
        aria-expanded={isOpen}
        title="Cambiar imágenes del artista"
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && position && (
        <Portal>
          <div
            ref={dropdownRef}
            className={styles.artistOptionsMenu__dropdown}
            style={{
              position: 'fixed',
              top: position.top !== undefined ? `${position.top}px` : undefined,
              bottom: position.bottom !== undefined ? `${position.bottom}px` : undefined,
              right: position.right !== undefined ? `${position.right}px` : undefined,
              left: position.left !== undefined ? `${position.left}px` : undefined,
              maxHeight: `${position.maxHeight}px`,
              pointerEvents: 'auto',
            }}
            data-placement={position.placement}
          >
            {onChangeProfile && (
              <button
                className={styles.artistOptionsMenu__option}
                onClick={(e) => handleOptionClick(e, onChangeProfile)}
              >
                <ImageIcon size={14} />
                <span>Cambiar perfil</span>
              </button>
            )}

            {onChangeBackground && (
              <button
                className={styles.artistOptionsMenu__option}
                onClick={(e) => handleOptionClick(e, onChangeBackground)}
              >
                <Frame size={14} />
                <span>Cambiar fondo/banner</span>
              </button>
            )}

            {hasBackground && onAdjustPosition && (
              <button
                className={styles.artistOptionsMenu__option}
                onClick={(e) => handleOptionClick(e, onAdjustPosition)}
              >
                <Move size={14} />
                <span>Ajustar posición</span>
              </button>
            )}

            {onChangeLogo && (
              <button
                className={styles.artistOptionsMenu__option}
                onClick={(e) => handleOptionClick(e, onChangeLogo)}
              >
                <Tag size={14} />
                <span>Cambiar logo</span>
              </button>
            )}
          </div>
        </Portal>
      )}
    </>
  );
}
