import { memo } from 'react';
import { Check, Plus } from 'lucide-react';
import { getCoverUrl } from '@shared/utils/cover.utils';
import styles from '../SessionPage.module.css';

interface TrackCardProps {
  track: { id: string; title: string; artistName?: string; albumId?: string };
  onAdd: (id: string) => void;
  added: boolean;
}

export const TrackCard = memo(function TrackCard({ track, onAdd, added }: TrackCardProps) {
  return (
    <div className={styles.trackCard}>
      <img
        src={getCoverUrl(track.albumId ? `/api/albums/${track.albumId}/cover` : undefined)}
        alt=""
        className={styles.trackCardCover}
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).src = '/radio/radio-cover-dark.webp';
        }}
      />
      <div className={styles.trackCardInfo}>
        <span className={styles.trackCardTitle}>{track.title}</span>
        <span className={styles.trackCardArtist}>{track.artistName}</span>
      </div>
      <button
        className={`${styles.trackCardAdd} ${added ? styles['trackCardAdd--done'] : ''}`}
        onClick={() => onAdd(track.id)}
        disabled={added}
        type="button"
      >
        {added ? <Check size={16} /> : <Plus size={16} />}
      </button>
    </div>
  );
});
