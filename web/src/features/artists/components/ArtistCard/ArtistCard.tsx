import { memo, useState } from 'react';
import type { ArtistCardProps } from '../../types';
import { getArtistAvatarUrl, getArtistInitials } from '../../utils/artist-image.utils';
import styles from './ArtistCard.module.css';

export const ArtistCard = memo(function ArtistCard({ artist, onClick }: ArtistCardProps) {
  const initials = getArtistInitials(artist.name);
  const hasImage = !!artist.profileImageUrl;
  const avatarUrl = hasImage ? getArtistAvatarUrl(artist.id, artist.updatedAt) : null;
  const [imgFailed, setImgFailed] = useState(false);

  const showFallback = !hasImage || imgFailed;

  return (
    <article className={styles.artistCard} onClick={onClick}>
      <div className={styles.artistCard__avatarContainer}>
        {avatarUrl && !imgFailed && (
          <img
            src={avatarUrl}
            alt={artist.name}
            loading="lazy"
            className={styles.artistCard__avatar}
            onError={() => setImgFailed(true)}
          />
        )}
        {showFallback && <div className={styles.artistCard__fallback}>{initials}</div>}
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
