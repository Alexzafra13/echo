import { useRef } from 'react';
import { useLocation } from 'wouter';
import { Users } from 'lucide-react';
import { getArtistImageUrl, useHorizontalItemCount } from '@features/home/hooks';
import type { SimilarArtist } from '../../services/artists.service';
import styles from './SimilarArtistsGrid.module.css';

interface SimilarArtistsGridProps {
  artists: SimilarArtist[];
}

// Card dimensions (synced with CSS)
const CARD_WIDTH = 140; // .artistCard width
const CARD_GAP = 16; // .similarArtists__scroll gap
const MIN_VISIBLE = 10; // Minimum artists to show (scrollable on small screens)

/**
 * SimilarArtistsGrid Component
 * Displays a horizontal row of similar artists
 * - Large screens: shows exactly what fits
 * - Small screens: shows at least 10, scrollable horizontally
 * All artists have local profiles (created automatically for external artists)
 */
export function SimilarArtistsGrid({ artists }: SimilarArtistsGridProps) {
  const [, setLocation] = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate how many items fit in the container
  const itemsInView = useHorizontalItemCount(containerRef, {
    itemWidth: CARD_WIDTH,
    gap: CARD_GAP,
    minItems: 3,
    maxItems: 15,
  });

  if (!artists || artists.length === 0) {
    return null;
  }

  // Show at least MIN_VISIBLE artists (scrollable) or what fits if more
  const visibleCount = Math.max(itemsInView, MIN_VISIBLE);
  const visibleArtists = artists.slice(0, visibleCount);

  return (
    <section className={styles.similarArtists} ref={containerRef}>
      <div className={styles.similarArtists__header}>
        <Users size={24} className={styles.similarArtists__icon} />
        <h2 className={styles.similarArtists__title}>Artistas similares</h2>
      </div>
      <div className={styles.similarArtists__scroll}>
        {visibleArtists.map((artist) => {
          const imageUrl = getArtistImageUrl(artist.localId, 'profile');
          return (
            <div
              key={artist.localId}
              className={`${styles.artistCard} ${styles.artistCard__clickable}`}
              onClick={() => setLocation(`/artists/${artist.localId}`)}
            >
              <div className={styles.artistCard__imageContainer}>
                <img
                  src={imageUrl}
                  alt={artist.name}
                  className={styles.artistCard__image}
                  loading="lazy"
                  onError={(e) => {
                    // If image fails to load, hide it and show placeholder
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove(styles.hidden);
                  }}
                />
                <div className={`${styles.artistCard__placeholder} ${styles.hidden}`}>
                  {artist.name.charAt(0).toUpperCase()}
                </div>
              </div>
              <span className={styles.artistCard__name}>{artist.name}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
