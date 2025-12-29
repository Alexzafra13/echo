import { memo } from 'react';
import type { ArtistCardProps } from '../../types';
import { getArtistAvatarUrl, handleArtistImageError, getArtistInitials } from '../../utils/artist-image.utils';
import styles from './ArtistCard.module.css';

/**
 * ArtistCard Component
 * Displays a single artist with avatar, name, and album/song counts
 * Memoized to prevent unnecessary re-renders in lists
 *
 * @example
 * <ArtistCard
 *   artist={artist}
 *   onClick={() => navigate(`/artists/${artist.id}`)}
 * />
 *
 * Note: Avatar URL is generated dynamically from ImageService API.
 * Uses updatedAt timestamp for cache-busting to ensure images sync with detail view.
 */
export const ArtistCard = memo(function ArtistCard({ artist, onClick }: ArtistCardProps) {
  // Use dynamic URL generation (V2 system) with cache-busting timestamp
  // ImageService will prioritize: custom > local > external
  const avatarUrl = getArtistAvatarUrl(artist.id, artist.updatedAt);
  const initials = getArtistInitials(artist.name);

  return (
    <article className={styles.artistCard} onClick={onClick}>
      <div className={styles.artistCard__avatarContainer}>
        <img
          src={avatarUrl}
          alt={artist.name}
          loading="lazy"
          className={styles.artistCard__avatar}
          onError={handleArtistImageError}
        />
        {/* Fallback initials circle */}
        <div className={styles.artistCard__fallback}>
          {initials}
        </div>
      </div>

      <div className={styles.artistCard__info}>
        <h3 className={styles.artistCard__name}>{artist.name}</h3>
        <p className={styles.artistCard__meta}>
          {artist.albumCount} {artist.albumCount === 1 ? 'álbum' : 'álbumes'} • {artist.songCount} {artist.songCount === 1 ? 'canción' : 'canciones'}
        </p>
      </div>
    </article>
  );
});
