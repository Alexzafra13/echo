import { memo, useCallback } from 'react';
import { Music } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { getCoverUrl, handleImageError } from '@shared/utils/cover.utils';
import { formatDuration } from '@shared/utils/format';
import styles from './QueueList.module.css';

interface QueueListProps {
  onClose: () => void;
}

/**
 * QueueList Component
 * Displays the current playback queue with track details
 * Memoized to prevent unnecessary re-renders
 */
export const QueueList = memo(function QueueList({ onClose }: QueueListProps) {
  const { queue, currentTrack, play } = usePlayer();

  const handleTrackClick = useCallback((trackIndex: number) => {
    if (queue[trackIndex]) {
      play(queue[trackIndex]);
      onClose();
    }
  }, [queue, play, onClose]);

  if (queue.length === 0) {
    return (
      <div className={styles.queueList}>
        <div className={styles.queueList__header}>
          <h3 className={styles.queueList__title}>
            <Music size={16} />
            Lista de reproducción
          </h3>
        </div>
        <p className={styles.queueList__empty}>
          No hay canciones en la cola
        </p>
      </div>
    );
  }

  return (
    <div className={styles.queueList}>
      <div className={styles.queueList__header}>
        <h3 className={styles.queueList__title}>
          <Music size={16} />
          Lista de reproducción
        </h3>
        <span className={styles.queueList__count}>
          {queue.length} {queue.length === 1 ? 'canción' : 'canciones'}
        </span>
      </div>

      <div className={styles.queueList__tracks}>
        {queue.map((track, index) => {
          const isCurrentTrack = currentTrack?.id === track.id;
          return (
            <button
              key={`${track.id}-${index}`}
              className={`${styles.queueList__item} ${isCurrentTrack ? styles.queueList__item_active : ''}`}
              onClick={() => handleTrackClick(index)}
            >
              {track.trackNumber && (
                <span className={styles.queueList__trackNumber}>
                  {track.trackNumber}
                </span>
              )}
              <div className={styles.queueList__coverWrapper}>
                <img
                  src={getCoverUrl(track.coverImage)}
                  alt={track.title}
                  className={styles.queueList__cover}
                  loading="lazy"
                  decoding="async"
                  onError={handleImageError}
                />
              </div>
              <div className={styles.queueList__info}>
                <p className={styles.queueList__name}>{track.title}</p>
                <p className={styles.queueList__meta}>{track.artist}</p>
              </div>
              <span className={styles.queueList__duration}>
                {formatDuration(track.duration)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
