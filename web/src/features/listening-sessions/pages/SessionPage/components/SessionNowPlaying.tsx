import { useTranslation } from 'react-i18next';
import { Music, SkipForward } from 'lucide-react';
import { getCoverUrl } from '@shared/utils/cover.utils';
import { formatDuration } from '@shared/utils/format';
import type { SessionQueueItem } from '../../../types';
import styles from '../SessionPage.module.css';

interface SessionNowPlayingProps {
  currentTrack: SessionQueueItem;
  isHost: boolean;
  onSkip: () => void;
  isSkipPending: boolean;
}

export function SessionNowPlaying({
  currentTrack,
  isHost,
  onSkip,
  isSkipPending,
}: SessionNowPlayingProps) {
  const { t } = useTranslation();

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <Music size={18} /> {t('sessions.nowPlaying')}
      </h2>
      <div className={styles.nowPlaying}>
        <img
          src={getCoverUrl(
            currentTrack.albumId ? `/api/albums/${currentTrack.albumId}/cover` : undefined
          )}
          alt=""
          className={styles.nowPlayingCover}
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/radio/radio-cover-dark.webp';
          }}
        />
        <div className={styles.nowPlayingInfo}>
          <span className={styles.nowPlayingTitle}>{currentTrack.trackTitle}</span>
          <span className={styles.nowPlayingArtist}>{currentTrack.artistName}</span>
          <span className={styles.nowPlayingMeta}>
            {currentTrack.addedByUsername} · {formatDuration(currentTrack.trackDuration)}
          </span>
        </div>
        {isHost && (
          <button
            className={styles.skipBtn}
            onClick={onSkip}
            disabled={isSkipPending}
            type="button"
          >
            <SkipForward size={20} />
          </button>
        )}
      </div>
    </section>
  );
}
