import { Link } from 'wouter';
import { Music } from 'lucide-react';
import type { TopTrack } from '../../../services/public-profiles.service';
import styles from '../PublicProfilePage.module.css';

// =============================================================================
// Helper Functions
// =============================================================================

export const formatPlayCount = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

// =============================================================================
// Component
// =============================================================================

interface TrackItemProps {
  track: TopTrack;
  index: number;
}

export function TrackItem({ track, index }: TrackItemProps) {
  return (
    <Link
      href={track.albumId ? `/album/${track.albumId}` : '#'}
      className={styles.publicProfilePage__trackItem}
    >
      <span className={styles.publicProfilePage__trackNumber}>{index + 1}</span>
      {track.coverUrl ? (
        <img
          src={track.coverUrl}
          alt={track.title}
          className={styles.publicProfilePage__trackCover}
        />
      ) : (
        <div className={styles.publicProfilePage__trackCoverPlaceholder}>
          <Music size={18} />
        </div>
      )}
      <div className={styles.publicProfilePage__trackInfo}>
        <h3 className={styles.publicProfilePage__trackTitle}>{track.title}</h3>
        <p className={styles.publicProfilePage__trackMeta}>
          {track.artistName && <>{track.artistName} • </>}
          {formatPlayCount(track.playCount)} reproducciones
        </p>
      </div>
    </Link>
  );
}
