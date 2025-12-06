import { MoreVertical, ImageIcon, Frame, Move, Tag } from 'lucide-react';
import { useDropdownMenu } from '@shared/hooks';
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
