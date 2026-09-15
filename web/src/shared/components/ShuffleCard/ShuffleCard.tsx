import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Shuffle, RefreshCw } from 'lucide-react';
import { useShufflePlay } from '@shared/hooks';
import { DjModeChip } from '@shared/components/DjModeChip';
import { getRandomGradient } from '@shared/constants';
import styles from './ShuffleCard.module.css';

export interface ShuffleCardProps {
  /** Title text displayed on the card */
  title?: string;
  /** Loading text displayed while fetching tracks */
  loadingTitle?: string;
  /** Additional CSS class name */
  className?: string;
  /** Custom margin style (to handle different page layouts) */
  style?: React.CSSProperties;
}

/**
 * ShuffleCard Component
 * A button card that plays the entire library in shuffle mode
 * Displays with a random gradient background on each render
 */
export function ShuffleCard({ title, loadingTitle, className, style }: ShuffleCardProps) {
  const { t } = useTranslation();
  const { shufflePlay, isLoading, djMode, setDjMode } = useShufflePlay();
  const resolvedTitle = title ?? t('shuffle.title');
  const resolvedLoadingTitle = loadingTitle ?? t('shuffle.loading');

  // Generate random gradient on mount
  const gradientStyle = useMemo(() => getRandomGradient(), []);

  // El chip DJ va encima de la tarjeta; el envoltorio recibe los márgenes de la página
  return (
    <div className={`${styles.shuffleCardWrapper} ${className || ''}`} style={style}>
      <DjModeChip active={djMode} onToggle={setDjMode} className={styles.shuffleCard__dj} />
      <button
        className={styles.shuffleCard}
        onClick={shufflePlay}
        disabled={isLoading}
        style={gradientStyle}
      >
        <div className={styles.shuffleCard__content}>
          <div className={styles.shuffleCard__icon}>
            {isLoading ? (
              <RefreshCw size={24} className={styles.shuffleCard__spinning} />
            ) : (
              <Shuffle size={24} />
            )}
          </div>
          <div className={styles.shuffleCard__text}>
            <h3 className={styles.shuffleCard__title}>
              {isLoading ? resolvedLoadingTitle : resolvedTitle}
            </h3>
          </div>
        </div>
      </button>
    </div>
  );
}

export default ShuffleCard;
