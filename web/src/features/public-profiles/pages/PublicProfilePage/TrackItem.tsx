import { Music, Play, Pause } from 'lucide-react';
import { usePlayer } from '@features/player/context/PlayerContext';
import type { TopTrack } from '../../services/public-profiles.service';
import styles from './PublicProfilePage.module.css';

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
  const { play, pause, currentTrack, isPlaying } = usePlayer();

  const isTrackPlaying = currentTrack?.id === track.id && isPlaying;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isTrackPlaying) {
      pause();
      return;
    }

    play({
      id: track.id,
      title: track.title,
      artist: track.artistName || 'Unknown Artist',
      albumId: track.albumId || undefined,
      albumName: track.albumName || undefined,
      duration: track.duration || 0,
      coverImage: track.coverUrl || undefined,
    });
  };

  return (
    <div
      className={`${styles.publicProfilePage__trackItem} ${isTrackPlaying ? styles.publicProfilePage__trackItemPlaying : ''}`}
      onClick={handlePlayClick}
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
      <button
        className={`${styles.publicProfilePage__trackPlay} ${isTrackPlaying ? styles.publicProfilePage__trackPlayActive : ''}`}
        onClick={handlePlayClick}
        aria-label={isTrackPlaying ? `Pausar ${track.title}` : `Reproducir ${track.title}`}
      >
        {isTrackPlaying ? (
          <Pause size={16} fill="currentColor" />
        ) : (
          <Play size={16} fill="currentColor" />
        )}
      </button>
    </div>
  );
}
