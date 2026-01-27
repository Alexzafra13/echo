import { Play, Pause, TrendingUp, Music } from 'lucide-react';
import type { ArtistTopTrack } from '../../../types';
import styles from '../ArtistDetailPage.module.css';

interface TopTracksSectionProps {
  tracks: ArtistTopTrack[];
  currentTrackId: string | undefined;
  isPlaying: boolean;
  onPlayTrack: (track: ArtistTopTrack) => void;
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
 * Formats a play count number to a human-readable string
 */
function formatPlayCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

/**
 * TopTracksSection - Displays the artist's most popular tracks
 */
export function TopTracksSection({
  tracks,
  currentTrackId,
  isPlaying,
  onPlayTrack,
}: TopTracksSectionProps) {
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
        <h2 className={styles.artistDetailPage__sectionTitle}>Canciones populares</h2>
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
                <span className={styles.artistDetailPage__topTrackTitle}>{track.title}</span>
                <span className={styles.artistDetailPage__topTrackMeta}>
                  {track.albumName && <>{track.albumName} • </>}
                  {formatPlayCount(track.playCount)} reproducciones
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
                aria-label={trackIsPlaying ? `Pausar ${track.title}` : `Reproducir ${track.title}`}
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
