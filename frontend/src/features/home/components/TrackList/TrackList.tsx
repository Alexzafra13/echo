import { Play } from 'lucide-react';
import type { Track } from '../../types';
import { formatDuration } from '../../types';
import styles from './TrackList.module.css';

interface TrackListProps {
  tracks: Track[];
  onTrackPlay?: (track: Track) => void;
}

/**
 * TrackList Component
 * Displays a list of tracks with play buttons
 *
 * @example
 * <TrackList
 *   tracks={albumTracks}
 *   onTrackPlay={(track) => play(track.id)}
 * />
 */
export function TrackList({ tracks, onTrackPlay }: TrackListProps) {
  const handlePlay = (track: Track) => {
    onTrackPlay?.(track);
    console.log('Playing track:', track.id);
  };

  if (!tracks || tracks.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No se encontraron canciones en este álbum</p>
      </div>
    );
  }

  return (
    <div className={styles.trackList}>
      <div className={styles.header}>
        <span className={styles.headerNumber}>#</span>
        <span className={styles.headerTitle}>Título</span>
        <span className={styles.headerDuration}>Duración</span>
      </div>

      <div className={styles.tracks}>
        {tracks.map((track, index) => (
          <div
            key={track.id}
            className={styles.track}
            onClick={() => handlePlay(track)}
          >
            <span className={styles.trackNumber}>
              {track.trackNumber || index + 1}
            </span>

            <div className={styles.trackInfo}>
              <span className={styles.trackTitle}>{track.title}</span>
              {track.artistName && (
                <span className={styles.trackArtist}>{track.artistName}</span>
              )}
            </div>

            <button
              className={styles.playButton}
              onClick={(e) => {
                e.stopPropagation();
                handlePlay(track);
              }}
              aria-label={`Play ${track.title}`}
            >
              <Play size={16} fill="currentColor" />
            </button>

            <span className={styles.trackDuration}>
              {formatDuration(track.duration)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
