import { useLocation } from 'wouter';
import { Users } from 'lucide-react';
import type { SimilarArtist } from '../../services/artists.service';
import styles from './SimilarArtistsGrid.module.css';

interface SimilarArtistsGridProps {
  artists: SimilarArtist[];
}

/**
 * SimilarArtistsGrid Component
 * Displays a horizontal scroll of similar artists from Last.fm
 * Artists with localId can be clicked to navigate to their page
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
        {artists.map((artist, index) => (
          <div
            key={`${artist.name}-${index}`}
            className={`${styles.artistCard} ${artist.localId ? styles.artistCard__clickable : ''}`}
            onClick={() => handleArtistClick(artist)}
          >
            <div className={styles.artistCard__imageContainer}>
              {artist.imageUrl ? (
                <img
                  src={artist.imageUrl}
                  alt={artist.name}
                  className={styles.artistCard__image}
                  loading="lazy"
                />
              ) : (
                <div className={styles.artistCard__placeholder}>
                  {artist.name.charAt(0).toUpperCase()}
                </div>
              )}
              {artist.localId && (
                <div className={styles.artistCard__badge}>
                  En tu biblioteca
                </div>
              )}
            </div>
            <span className={styles.artistCard__name}>{artist.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
