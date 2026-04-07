import { MoreVertical, ImageIcon, Frame, Move, Tag, LayoutGrid } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDropdownMenu } from '@shared/hooks';
import { Portal } from '@shared/components/ui';
import styles from './ArtistOptionsMenu.module.css';

interface ArtistOptionsMenuProps {
  onChangeProfile?: () => void;
  onChangeBackground?: () => void;
  onChangeBanner?: () => void;
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
  onChangeBanner,
  onAdjustPosition,
  onChangeLogo,
  hasBackground = false,
}: ArtistOptionsMenuProps) {
  const { t } = useTranslation();
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
        aria-label={t('artists.imageOptions')}
        aria-expanded={isOpen}
        title={t('artists.imageOptions')}
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
            {onChangeProfile && (
              <button
                className={styles.artistOptionsMenu__option}
                onClick={(e) => handleOptionClick(e, onChangeProfile)}
              >
                <ImageIcon size={14} />
                <span>{t('artists.changeProfile')}</span>
              </button>
            )}

            {onChangeBackground && (
              <button
                className={styles.artistOptionsMenu__option}
                onClick={(e) => handleOptionClick(e, onChangeBackground)}
              >
                <Frame size={14} />
                <span>{t('artists.changeBackground')}</span>
              </button>
            )}

            {onChangeBanner && (
              <button
                className={styles.artistOptionsMenu__option}
                onClick={(e) => handleOptionClick(e, onChangeBanner)}
              >
                <LayoutGrid size={14} />
                <span>{t('artists.changeBanner')}</span>
              </button>
            )}

            {hasBackground && onAdjustPosition && (
              <button
                className={styles.artistOptionsMenu__option}
                onClick={(e) => handleOptionClick(e, onAdjustPosition)}
              >
                <Move size={14} />
                <span>{t('artists.adjustPosition')}</span>
              </button>
            )}

            {onChangeLogo && (
              <button
                className={styles.artistOptionsMenu__option}
                onClick={(e) => handleOptionClick(e, onChangeLogo)}
              >
                <Tag size={14} />
                <span>{t('artists.changeLogo')}</span>
              </button>
            )}
          </div>
        </Portal>
      )}
    </>
  );
}
