import { Play, Pause, TrendingUp, Music, Film } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ArtistTopTrack } from '../../../types';
import { formatPlayCount } from '@shared/utils/format';
import styles from '../ArtistDetailPage.module.css';

interface TopTracksSectionProps {
  tracks: ArtistTopTrack[];
  currentTrackId: string | undefined;
  isPlaying: boolean;
  onPlayTrack: (track: ArtistTopTrack) => void;
  videoTrackIds?: Set<string>;
}

/**
 * Formats duration in seconds to mm:ss format
 */
function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * TopTracksSection - Displays the artist's most popular tracks
 */
export function TopTracksSection({
  tracks,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  videoTrackIds,
}: TopTracksSectionProps) {
  const { t } = useTranslation();
  if (tracks.length === 0) {
    return null;
  }

  const isTrackPlaying = (trackId: string) => {
    return currentTrackId === trackId && isPlaying;
  };

  return (
    <section className={styles.artistDetailPage__topTracks}>
      <div className={styles.artistDetailPage__sectionHeader}>
        <TrendingUp size={24} className={styles.artistDetailPage__sectionIcon} />
        <h2 className={styles.artistDetailPage__sectionTitle}>{t('artists.popularTracks')}</h2>
      </div>
      <div className={styles.artistDetailPage__topTracksList}>
        {tracks.map((track, index) => {
          const trackIsPlaying = isTrackPlaying(track.trackId);
          return (
            <div
              key={track.trackId}
              className={`${styles.artistDetailPage__topTrack} ${trackIsPlaying ? styles.artistDetailPage__topTrackPlaying : ''}`}
              onClick={() => onPlayTrack(track)}
            >
              <span className={styles.artistDetailPage__topTrackRank}>{index + 1}</span>
              {track.albumId && (
                <img
                  src={`/api/albums/${track.albumId}/cover`}
                  alt={track.albumName || track.title}
                  className={styles.artistDetailPage__topTrackCover}
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-album.png';
                  }}
                />
              )}
              {!track.albumId && (
                <div className={styles.artistDetailPage__topTrackCoverPlaceholder}>
                  <Music size={16} />
                </div>
              )}
              <div className={styles.artistDetailPage__topTrackInfo}>
                <span className={styles.artistDetailPage__topTrackTitle}>
                  {track.title}
                  {videoTrackIds?.has(track.trackId) && (
                    <Film
                      size={13}
                      style={{
                        color: 'var(--color-primary-500)',
                        opacity: 0.7,
                        marginLeft: 6,
                        flexShrink: 0,
                      }}
                    />
                  )}
                </span>
                <span className={styles.artistDetailPage__topTrackMeta}>
                  {track.albumName && <>{track.albumName} • </>}
                  {t('artists.playsCount', { count: formatPlayCount(track.playCount) })}
                </span>
              </div>
              <span className={styles.artistDetailPage__topTrackDuration}>
                {formatDuration(track.duration)}
              </span>
              <button
                className={`${styles.artistDetailPage__topTrackPlay} ${trackIsPlaying ? styles.artistDetailPage__topTrackPlayActive : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayTrack(track);
                }}
                aria-label={
                  trackIsPlaying
                    ? t('artists.pauseTrack', { title: track.title })
                    : t('artists.playTrack', { title: track.title })
                }
              >
                {trackIsPlaying ? (
                  <Pause size={16} fill="currentColor" />
                ) : (
                  <Play size={16} fill="currentColor" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
