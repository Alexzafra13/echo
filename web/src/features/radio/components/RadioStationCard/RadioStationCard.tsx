import { Heart, Radio, Music } from 'lucide-react';
import { memo, useRef, useEffect, useState, useCallback } from 'react';
import type { RadioBrowserStation } from '../../types';
import type { RadioStation } from '@features/player/types';
import type { RadioMetadata } from '../../hooks/useRadioMetadata';
import styles from './RadioStationCard.module.css';

interface RadioStationCardProps {
  station: RadioBrowserStation | RadioStation;
  isFavorite?: boolean;
  isPlaying?: boolean;
  currentMetadata?: RadioMetadata | null;
  onPlay?: () => void;
  onToggleFavorite?: () => void;
}

/**
 * RadioStationCard Component
 * Displays a single radio station with cover, name, country and play button
 * Memoized to prevent unnecessary re-renders in lists
 *
 * @example
 * <RadioStationCard
 *   station={station}
 *   isFavorite={true}
 *   isPlaying={false}
 *   onPlay={() => playRadio(station)}
 *   onToggleFavorite={() => toggleFavorite(station)}
 * />
 */
export const RadioStationCard = memo(function RadioStationCard({
  station,
  isFavorite = false,
  isPlaying = false,
  currentMetadata,
  onPlay,
  onToggleFavorite,
}: RadioStationCardProps) {
  const metadataTextRef = useRef<HTMLSpanElement>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  const handleCardClick = useCallback(() => {
    onPlay?.();
  }, [onPlay]);

  const handleFavoriteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.();
  }, [onToggleFavorite]);

  // Get station properties (compatible with both RadioBrowserStation and RadioStation)
  const name = station.name;
  const favicon = 'favicon' in station ? station.favicon : null;
  const country = 'country' in station ? station.country : null;
  const tags = 'tags' in station ? station.tags : null;
  const codec = 'codec' in station ? station.codec : null;
  const bitrate = 'bitrate' in station ? station.bitrate : null;

  // Format tags for display (handle null, empty string, and valid strings)
  const genreTags = tags && typeof tags === 'string' && tags.trim()
    ? tags.split(',').slice(0, 2).join(', ')
    : 'Radio';

  // Check if metadata text overflows and needs animation
  useEffect(() => {
    if (metadataTextRef.current && currentMetadata?.title) {
      const element = metadataTextRef.current;
      const isOverflowing = element.scrollWidth > element.clientWidth;
      setShouldAnimate(isOverflowing);
    } else {
      setShouldAnimate(false);
    }
  }, [currentMetadata?.title]);

  return (
    <article
      className={`${styles.radioCard} ${isPlaying ? styles['radioCard--playing'] : ''}`}
      onClick={handleCardClick}
    >
      <div className={styles.radioCard__coverContainer}>
        <div className={styles.radioCard__fallback}>
          <Radio size={32} />
        </div>
        {favicon && (
          <img
            src={favicon}
            alt={name}
            loading="lazy"
            className={styles.radioCard__cover}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <div className={styles.radioCard__overlay}>
          {onToggleFavorite && (
            <button
              className={`${styles.radioCard__favoriteButton} ${
                isFavorite ? styles['radioCard__favoriteButton--active'] : ''
              }`}
              onClick={handleFavoriteClick}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>
      </div>
      <div className={styles.radioCard__info}>
        <h3 className={styles.radioCard__title}>{name}</h3>
        <p className={styles.radioCard__meta}>
          {country && <span>{country}</span>}
          {country && genreTags && <span className={styles.radioCard__separator}>•</span>}
          {genreTags && <span>{genreTags}</span>}
        </p>
        {(codec || bitrate) && (
          <p className={styles.radioCard__quality}>
            {codec && <span>{codec.toUpperCase()}</span>}
            {codec && bitrate && <span className={styles.radioCard__separator}>•</span>}
            {bitrate && <span>{bitrate} kbps</span>}
          </p>
        )}
        {isPlaying && currentMetadata?.title && (
          <p className={styles.radioCard__nowPlaying}>
            <span
              ref={metadataTextRef}
              className={`${styles.radioCard__nowPlayingText} ${shouldAnimate ? styles['radioCard__nowPlayingText--animate'] : ''}`}
            >
              <Music size={12} />
              {currentMetadata.title}
            </span>
          </p>
        )}
      </div>
    </article>
  );
});
