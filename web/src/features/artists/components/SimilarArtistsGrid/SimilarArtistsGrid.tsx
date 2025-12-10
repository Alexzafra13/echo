import { useLocation } from 'wouter';
import { Users } from 'lucide-react';
import { getArtistImageUrl } from '@features/home/hooks';
import type { SimilarArtist } from '../../services/artists.service';
import styles from './SimilarArtistsGrid.module.css';

interface SimilarArtistsGridProps {
  artists: SimilarArtist[];
}

/**
 * Get the best image URL for a similar artist
 * - Local artists: use their profile image from our storage
 * - External artists: use Last.fm image (if available)
 */
function getArtistImage(artist: SimilarArtist): string | null {
  // For local artists, use their profile image
  if (artist.localId) {
    return getArtistImageUrl(artist.localId, 'profile');
  }
  // For external artists, use Last.fm image
  return artist.imageUrl;
}

/**
 * SimilarArtistsGrid Component
 * Displays a horizontal scroll of similar artists from Last.fm
 * Prioritizes local artists (they have saved profile images)
 */
export function SimilarArtistsGrid({ artists }: SimilarArtistsGridProps) {
  const [, setLocation] = useLocation();

  const handleArtistClick = (artist: SimilarArtist) => {
    if (artist.localId) {
      setLocation(`/artists/${artist.localId}`);
    }
  };

  if (!artists || artists.length === 0) {
    return null;
  }

  return (
    <section className={styles.similarArtists}>
      <div className={styles.similarArtists__header}>
        <Users size={24} className={styles.similarArtists__icon} />
        <h2 className={styles.similarArtists__title}>Artistas similares</h2>
      </div>
      <div className={styles.similarArtists__scroll}>
        {artists.map((artist, index) => {
          const imageUrl = getArtistImage(artist);
          return (
            <div
              key={`${artist.name}-${index}`}
              className={`${styles.artistCard} ${artist.localId ? styles.artistCard__clickable : ''}`}
              onClick={() => handleArtistClick(artist)}
            >
              <div className={styles.artistCard__imageContainer}>
                {imageUrl ? (
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
                ) : null}
                <div
                  className={`${styles.artistCard__placeholder} ${imageUrl ? styles.hidden : ''}`}
                >
                  {artist.name.charAt(0).toUpperCase()}
                </div>
                {artist.localId && (
                  <div className={styles.artistCard__badge}>
                    En tu biblioteca
                  </div>
                )}
              </div>
              <span className={styles.artistCard__name}>{artist.name}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
