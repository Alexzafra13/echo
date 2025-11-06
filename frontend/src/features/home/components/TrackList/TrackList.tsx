import { Play } from 'lucide-react';
import type { Track } from '../../types';
import { formatDuration } from '../../types';
import styles from './TrackList.module.css';

/**
 * Formatea el bitrate a kbps
 * @param bitRate - Bitrate en bps
 * @returns String formateado (ej: "320 kbps")
 */
function formatBitRate(bitRate?: number): string {
  if (!bitRate) return '';
  const kbps = Math.round(bitRate / 1000);
  return `${kbps} kbps`;
}

/**
 * Formatea el formato del archivo (extensión en mayúsculas)
 * @param suffix - Extensión del archivo
 * @returns String formateado (ej: "FLAC")
 */
function formatFormat(suffix?: string): string {
  if (!suffix) return '';
  return suffix.toUpperCase();
}

interface TrackListProps {
  tracks: Track[];
  onTrackPlay?: (track: Track) => void;
  currentTrackId?: string;
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
export function TrackList({ tracks, onTrackPlay, currentTrackId }: TrackListProps) {
  const handlePlay = (track: Track) => {
    onTrackPlay?.(track);
    console.log('Playing track:', track.id);
  };

  if (!tracks || tracks.length === 0) {
    return (
      <div className={styles.trackList__emptyState}>
        <p>No se encontraron canciones en este álbum</p>
      </div>
    );
  }

  return (
    <div className={styles.trackList}>
      <div className={styles.trackList__header}>
        <span className={styles.trackList__headerNumber}>#</span>
        <span className={styles.trackList__headerTitle}>Título</span>
        <span className={styles.trackList__headerFormat}>Formato</span>
        <span className={styles.trackList__headerDuration}>Duración</span>
      </div>

      <div className={styles.trackList__tracks}>
        {tracks.map((track, index) => {
          const isPlaying = currentTrackId === track.id;
          return (
            <div
              key={track.id}
              className={`${styles.trackList__track} ${isPlaying ? styles.trackList__track__active : ''}`}
              onClick={() => handlePlay(track)}
            >
            <span className={styles.trackList__trackNumber}>
              {track.trackNumber || index + 1}
            </span>

            <div className={styles.trackList__trackInfo}>
              <span className={styles.trackList__trackTitle}>{track.title}</span>
              {track.artistName && (
                <span className={styles.trackList__trackArtist}>{track.artistName}</span>
              )}
            </div>

            <div className={styles.trackList__trackFormat}>
              {formatFormat(track.suffix) && (
                <span className={styles.trackList__format}>{formatFormat(track.suffix)}</span>
              )}
              {formatBitRate(track.bitRate) && (
                <span className={styles.trackList__bitrate}>{formatBitRate(track.bitRate)}</span>
              )}
            </div>

            <button
              className={styles.trackList__playButton}
              onClick={(e) => {
                e.stopPropagation();
                handlePlay(track);
              }}
              aria-label={`Play ${track.title}`}
            >
              <Play size={16} fill="currentColor" />
            </button>

            <span className={styles.trackList__trackDuration}>
              {formatDuration(track.duration)}
            </span>
          </div>
        );
        })}
      </div>
    </div>
  );
}
