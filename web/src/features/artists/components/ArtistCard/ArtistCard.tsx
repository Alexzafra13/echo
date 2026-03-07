import { memo, useState } from 'react';
import type { ArtistCardProps } from '../../types';
import { getArtistAvatarUrl, getArtistInitials } from '../../utils/artist-image.utils';
import styles from './ArtistCard.module.css';

export const ArtistCard = memo(function ArtistCard({ artist, onClick }: ArtistCardProps) {
  const initials = getArtistInitials(artist.name);
  // Always try to load the image — the endpoint checks custom > local > external
  // and returns 404 only if no image exists at all
  const avatarUrl = getArtistAvatarUrl(artist.id, artist.updatedAt);
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <article className={styles.artistCard} onClick={onClick}>
      <div className={styles.artistCard__avatarContainer}>
        {/* Fallback initials always rendered as base layer */}
        <div className={styles.artistCard__fallback}>{initials}</div>
        {/* Image overlays the fallback; on error it unmounts revealing fallback */}
        {!imgFailed && (
          <img
            src={avatarUrl}
            alt={artist.name}
            loading="lazy"
            className={styles.artistCard__avatar}
            onError={() => setImgFailed(true)}
          />
        )}
      </div>

      <div className={styles.artistCard__info}>
        <h3 className={styles.artistCard__name}>{artist.name}</h3>
        <p className={styles.artistCard__meta}>
          {artist.albumCount} {artist.albumCount === 1 ? 'álbum' : 'álbumes'} • {artist.songCount}{' '}
          {artist.songCount === 1 ? 'canción' : 'canciones'}
        </p>
      </div>
    </article>
  );
});
