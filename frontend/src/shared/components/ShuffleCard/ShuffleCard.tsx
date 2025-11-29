import { useMemo } from 'react';
import { Shuffle, RefreshCw } from 'lucide-react';
import { useShufflePlay } from '@shared/hooks';
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
export function ShuffleCard({
  title = 'Aleatorio',
  loadingTitle = 'Cargando...',
  className,
  style,
}: ShuffleCardProps) {
  const { shufflePlay, isLoading } = useShufflePlay();

  // Generate random gradient on mount
  const gradientStyle = useMemo(() => getRandomGradient(), []);

  // Combine gradient with any custom styles
  const cardStyle = useMemo(
    () => ({ ...gradientStyle, ...style }),
    [gradientStyle, style]
  );

  return (
    <button
      className={`${styles.shuffleCard} ${className || ''}`}
      onClick={shufflePlay}
      disabled={isLoading}
      style={cardStyle}
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
            {isLoading ? loadingTitle : title}
          </h3>
        </div>
      </div>
    </button>
  );
}

export default ShuffleCard;
