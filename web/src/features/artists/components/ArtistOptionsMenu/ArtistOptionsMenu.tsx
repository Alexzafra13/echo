import { useState, useRef, useEffect, useCallback } from 'react';
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
  const [isClosing, setIsClosing] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastPositionRef = useRef<ReturnType<typeof useDropdownPosition>>(null);

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

      {isOpen && effectivePosition && (
        <Portal>
          <div
            ref={dropdownRef}
            className={`${styles.artistOptionsMenu__dropdown} ${isClosing ? styles['artistOptionsMenu__dropdown--closing'] : ''}`}
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
