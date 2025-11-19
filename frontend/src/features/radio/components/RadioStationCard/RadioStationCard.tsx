import { Play, Heart, HeartOff, Radio, Music } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';
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
export function RadioStationCard({
  station,
  isFavorite = false,
  isPlaying = false,
  currentMetadata,
  onPlay,
  onToggleFavorite,
}: RadioStationCardProps) {
  const metadataTextRef = useRef<HTMLSpanElement>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlay?.();
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.();
  };

  // Get station properties (compatible with both RadioBrowserStation and RadioStation)
  const name = station.name;
  const favicon = 'favicon' in station ? station.favicon : null;
  const country = 'country' in station ? station.country : null;
  const tags = 'tags' in station ? station.tags : null;
  const codec = 'codec' in station ? station.codec : null;
  const bitrate = 'bitrate' in station ? station.bitrate : null;

  // Format tags for display
  const genreTags = tags ? tags.split(',').slice(0, 2).join(', ') : 'Radio';

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
    <article className={`${styles.radioCard} ${isPlaying ? styles['radioCard--playing'] : ''}`}>
      <div className={styles.radioCard__coverContainer}>
        {favicon ? (
          <img
            src={favicon}
            alt={name}
            loading="lazy"
            className={styles.radioCard__cover}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : null}
        <div className={styles.radioCard__fallback} style={{ display: favicon ? 'none' : 'flex' }}>
          <Radio size={32} />
        </div>
        <div className={styles.radioCard__overlay}>
          <button
            className={styles.radioCard__playButton}
            onClick={handlePlayClick}
            aria-label={`Play ${name}`}
          >
            <Play size={20} fill="currentColor" />
          </button>
          {onToggleFavorite && (
            <button
              className={`${styles.radioCard__favoriteButton} ${
                isFavorite ? styles['radioCard__favoriteButton--active'] : ''
              }`}
              onClick={handleFavoriteClick}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isFavorite ? <HeartOff size={18} /> : <Heart size={18} />}
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
}
