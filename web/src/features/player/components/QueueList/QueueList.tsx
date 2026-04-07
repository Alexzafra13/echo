import { memo, useCallback, useState, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Music } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePlayback } from '../../context/PlaybackContext';
import { useQueue } from '../../context/QueueContext';
import { getCoverUrl, handleImageError } from '@shared/utils/cover.utils';
import { formatDuration } from '@shared/utils/format';
import styles from './QueueList.module.css';

interface QueueListProps {
  onClose: () => void;
}

const ITEM_HEIGHT = 60;

/**
 * QueueList Component
 * Displays the current playback queue with track details.
 * Virtualizado para soportar queues grandes (shuffle de toda la libreria).
 */
export const QueueList = memo(function QueueList({ onClose }: QueueListProps) {
  const { t } = useTranslation();
  const { queue, currentIndex } = useQueue();
  const { play } = usePlayback();
  const [closing, setClosing] = useState(false);
  const closingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: queue.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
  });

  const handleClose = useCallback(() => {
    if (closingTimer.current) return;
    setClosing(true);
    closingTimer.current = setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (closingTimer.current) clearTimeout(closingTimer.current);
    };
  }, []);

  // Close on page scroll (ignore scroll inside the queue list itself)
  useEffect(() => {
    const handleScroll = (e: Event) => {
      if (listRef.current && listRef.current.contains(e.target as Node)) return;
      handleClose();
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [handleClose]);

  const handleTrackClick = useCallback(
    (trackIndex: number) => {
      if (queue[trackIndex]) {
        play(queue[trackIndex]);
        onClose();
      }
    },
    [queue, play, onClose]
  );

  const containerClass = `${styles.queueList} ${closing ? styles['queueList--closing'] : ''}`;

  if (queue.length === 0) {
    return (
      <div className={containerClass} ref={listRef}>
        <div className={styles.queueList__header}>
          <h3 className={styles.queueList__title}>
            <Music size={16} />
            {t('player.queue')}
          </h3>
        </div>
        <p className={styles.queueList__empty}>{t('playback.emptyQueue')}</p>
      </div>
    );
  }

  return (
    <div className={containerClass} ref={listRef}>
      <div className={styles.queueList__header}>
        <h3 className={styles.queueList__title}>
          <Music size={16} />
          {t('player.queue')}
        </h3>
        <span className={styles.queueList__count}>
          {t('artists.songCount', { count: queue.length })}
        </span>
      </div>

      <div
        ref={scrollRef}
        className={styles.queueList__tracks}
        style={{ maxHeight: '400px', overflow: 'auto' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const track = queue[virtualItem.index];
            const isCurrentTrack = virtualItem.index === currentIndex;
            return (
              <button
                key={`${track.id}-${virtualItem.index}`}
                className={`${styles.queueList__item} ${isCurrentTrack ? styles.queueList__item_active : ''}`}
                onClick={() => handleTrackClick(virtualItem.index)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <span className={styles.queueList__trackNumber}>{virtualItem.index + 1}</span>
                <div className={styles.queueList__coverWrapper}>
                  <img
                    src={getCoverUrl(
                      track.album?.cover ||
                        track.coverImage ||
                        (track.albumId ? `/api/images/albums/${track.albumId}/cover` : undefined)
                    )}
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
                <span className={styles.queueList__duration}>{formatDuration(track.duration)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});
