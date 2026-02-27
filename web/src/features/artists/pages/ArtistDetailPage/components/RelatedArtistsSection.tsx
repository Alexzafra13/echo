import { Users } from 'lucide-react';
import { getArtistImageUrl } from '@features/home/hooks';
import { getArtistInitials } from '../../../utils/artist-image.utils';
import type { RelatedArtist } from '../../../types';
import styles from '../ArtistDetailPage.module.css';

interface RelatedArtistsSectionProps {
  artists: RelatedArtist[];
  onNavigate: (path: string) => void;
}

/**
 * RelatedArtistsSection - Displays artists similar to the current one
 */
export function RelatedArtistsSection({ artists, onNavigate }: RelatedArtistsSectionProps) {
  if (artists.length === 0) {
    return null;
  }

  return (
    <section className={styles.artistDetailPage__relatedArtists}>
      <div className={styles.artistDetailPage__sectionHeader}>
        <Users size={24} className={styles.artistDetailPage__sectionIcon} />
        <h2 className={styles.artistDetailPage__sectionTitle}>Artistas similares</h2>
      </div>
      <div className={styles.artistDetailPage__relatedArtistsGrid}>
        {artists.map((relArtist) => (
          <div
            key={relArtist.id}
            className={styles.artistDetailPage__relatedArtist}
            onClick={() => onNavigate(`/artists/${relArtist.id}`)}
          >
            <div className={styles.artistDetailPage__relatedArtistAvatar}>
              <img
                src={getArtistImageUrl(relArtist.id, 'profile')}
                alt={relArtist.name}
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div
                className={styles.artistDetailPage__relatedArtistFallback}
                style={{ display: 'none' }}
              >
                {getArtistInitials(relArtist.name)}
              </div>
            </div>
            <span className={styles.artistDetailPage__relatedArtistName}>{relArtist.name}</span>
            {relArtist.matchScore > 0 && (
              <span className={styles.artistDetailPage__relatedArtistScore}>
                {relArtist.matchScore}% similar
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
