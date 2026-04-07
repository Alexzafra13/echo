import { useTranslation, Trans } from 'react-i18next';
import { X, Radio } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getCoverUrl } from '@shared/utils/cover.utils';
import { formatDuration } from '@shared/utils/format';
import { usePlayback, useQueue } from '@features/player';
import type { Track } from '@shared/types/track.types';
import { listeningSessionsService } from '../../../services/listening-sessions.service';
import type { SessionQueueItem } from '../../../types';
import styles from '../SessionPage.module.css';

interface SessionDeviceProps {
  sessionId: string;
  isJukebox: boolean;
  isHost: boolean;
  currentTrack?: SessionQueueItem;
  pendingTracks: SessionQueueItem[];
  hostDisplayName: string;
}

export function SessionDevice({
  sessionId,
  isJukebox,
  isHost,
  currentTrack,
  pendingTracks,
  hostDisplayName,
}: SessionDeviceProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { currentTrack: playerTrack, isPlaying } = usePlayback();
  const { playQueue } = useQueue();

  return (
    <div className={styles.device}>
      <div className={styles.deviceFrame}>
        <div className={styles.deviceNotch} />
        <div className={styles.deviceScreen}>
          <div className={styles.lcdDisplay}>
            {isJukebox && !isHost ? (
              currentTrack ? (
                <>
                  <div className={`${styles.lcdEqualizer} ${styles['lcdEqualizer--playing']}`}>
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className={styles.lcdInfo}>
                    <span className={styles.lcdTitle}>{currentTrack.trackTitle}</span>
                    <span className={styles.lcdArtist}>
                      {currentTrack.artistName} — {formatDuration(currentTrack.trackDuration)}
                    </span>
                  </div>
                </>
              ) : (
                <span className={styles.lcdIdle}>{t('sessions.waiting')}</span>
              )
            ) : playerTrack ? (
              <>
                <div
                  className={`${styles.lcdEqualizer} ${isPlaying ? styles['lcdEqualizer--playing'] : styles['lcdEqualizer--paused']}`}
                >
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className={styles.lcdInfo}>
                  <span className={styles.lcdStatus}>
                    {isPlaying ? `▶ ${t('sessions.playing')}` : `❚❚ ${t('sessions.paused')}`}
                  </span>
                  <span className={styles.lcdTitle}>{playerTrack.title}</span>
                  <span className={styles.lcdArtist}>
                    {playerTrack.artistName || playerTrack.artist} —{' '}
                    {formatDuration(playerTrack.duration)}
                  </span>
                </div>
              </>
            ) : (
              <span className={styles.lcdIdle}>{t('sessions.waiting')}</span>
            )}
          </div>
          {isJukebox && !isHost && (
            <div className={styles.jukeboxBanner}>
              <Radio size={14} />
              <span>
                <Trans
                  i18nKey="sessions.jukeboxBanner"
                  values={{ host: hostDisplayName }}
                  components={{ strong: <strong /> }}
                />
              </span>
            </div>
          )}
          {pendingTracks.length > 0 && (
            <div className={styles.deviceTrackList}>
              <span className={styles.deviceListLabel}>
                {t('sessions.queueLabel')} · {pendingTracks.length}
              </span>
              {pendingTracks.map((item, i) => (
                <div
                  key={item.id}
                  className={styles.deviceTrack}
                  onClick={async () => {
                    try {
                      const { apiClient } = await import('@shared/services/api');
                      const { data: track } = await apiClient.get(`/tracks/${item.trackId}`);
                      playQueue([track as Track], 0);
                    } catch {
                      /* silencioso */
                    }
                  }}
                >
                  <span className={styles.deviceTrackNum}>{i + 1}</span>
                  <img
                    src={getCoverUrl(
                      item.albumId ? `/api/albums/${item.albumId}/cover` : undefined
                    )}
                    alt=""
                    className={styles.deviceTrackCover}
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/radio/radio-cover-dark.webp';
                    }}
                  />
                  <div className={styles.deviceTrackInfo}>
                    <span className={styles.deviceTrackTitle}>{item.trackTitle}</span>
                    <span className={styles.deviceTrackArtist}>{item.artistName}</span>
                  </div>
                  <span className={styles.deviceTrackDuration}>
                    {formatDuration(item.trackDuration)}
                  </span>
                  {isHost && (
                    <button
                      className={styles.deviceTrackRemove}
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await listeningSessionsService.removeFromQueue(sessionId, item.id);
                          queryClient.invalidateQueries({
                            queryKey: ['listening-session', sessionId],
                          });
                        } catch {
                          /* silencioso */
                        }
                      }}
                      type="button"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {pendingTracks.length === 0 && !playerTrack && (
            <div className={styles.deviceEmpty}>
              <Radio size={20} />
              <span>{t('sessions.emptyQueue')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
