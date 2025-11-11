import { useState } from 'react';
import { Play } from 'lucide-react';
import { useLocation } from 'wouter';
import { usePlayer } from '@features/player/context/PlayerContext';
import { AddToPlaylistModal } from '@features/playlists/components/AddToPlaylistModal';
import { TrackInfoModal } from '../TrackInfoModal';
import type { Track } from '../../types';
import { formatDuration } from '../../types';
import { TrackOptionsMenu } from '../TrackOptionsMenu/TrackOptionsMenu';
import { RatingStars } from '@shared/components/ui/RatingStars';
import { LikeDislikeButtons } from '@shared/components/ui/LikeDislikeButtons';
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
  hideGoToAlbum?: boolean; // Hide "Go to Album" option when already in album view
  hideAlbumCover?: boolean; // Hide album cover icon when in album view (only useful in playlists)
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
export function TrackList({ tracks, onTrackPlay, currentTrackId, hideGoToAlbum = false, hideAlbumCover = false }: TrackListProps) {
  const [, setLocation] = useLocation();
  const { addToQueue } = usePlayer();
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<Track | null>(null);
  const [selectedTrackForInfo, setSelectedTrackForInfo] = useState<Track | null>(null);

  const handlePlay = (track: Track) => {
    onTrackPlay?.(track);
    console.log('Playing track:', track.id);
  };

  // Track options handlers
  const handleAddToPlaylist = (track: Track) => {
    setSelectedTrackForPlaylist(track);
  };

  const handleAddToQueue = (track: Track) => {
    // Map track to player format
    const playerTrack = {
      id: track.id,
      title: track.title,
      artist: track.artistName || 'Unknown Artist',
      albumName: track.albumName,
      duration: track.duration || 0,
      coverImage: track.albumId ? `/api/albums/${track.albumId}/cover` : undefined,
      trackNumber: track.trackNumber,
    };
    addToQueue(playerTrack);
  };

  const handleGoToAlbum = (track: Track) => {
    if (track.albumId) {
      setLocation(`/album/${track.albumId}`);
    }
  };

  const handleGoToArtist = (track: Track) => {
    if (track.artistId) {
      setLocation(`/artists/${track.artistId}`);
    }
  };

  const handleShowInfo = (track: Track) => {
    setSelectedTrackForInfo(track);
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
        <span className={styles.trackList__headerRating}>Calificación</span>
      </div>

      <div className={styles.trackList__tracks}>
        {tracks.map((track, index) => {
          const isPlaying = currentTrackId === track.id;
          const coverUrl = track.albumId ? `/api/albums/${track.albumId}/cover` : '/placeholder-album.png';
          // Use playlistOrder if available (for playlists), otherwise use trackNumber
          const displayNumber = track.playlistOrder !== undefined ? track.playlistOrder : (track.trackNumber || index + 1);

          return (
            <div
              key={track.id}
              className={`${styles.trackList__track} ${isPlaying ? styles.trackList__track__active : ''}`}
              onClick={() => handlePlay(track)}
            >
              {/* Track number / Play button container */}
              <div className={styles.trackList__numberCell}>
                <span className={styles.trackList__trackNumber}>
                  {displayNumber}
                </span>
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
              </div>

              {/* Track info (cover + title + artist) */}
              <div className={styles.trackList__trackInfo}>
                {!hideAlbumCover && (
                  <img
                    src={coverUrl}
                    alt={track.albumName || track.title}
                    className={styles.trackList__trackCover}
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder-album.png';
                    }}
                  />
                )}
                <div className={styles.trackList__trackText}>
                  <span className={styles.trackList__trackTitle}>{track.title}</span>
                  {track.artistName && (
                    <span className={styles.trackList__trackArtist}>{track.artistName}</span>
                  )}
                </div>
              </div>

              {/* Format info (format + bitrate) */}
              <div className={styles.trackList__trackFormat}>
                {formatFormat(track.suffix) && (
                  <span className={styles.trackList__format}>{formatFormat(track.suffix)}</span>
                )}
                {formatBitRate(track.bitRate) && (
                  <span className={styles.trackList__bitrate}>{formatBitRate(track.bitRate)}</span>
                )}
              </div>

              {/* Duration */}
              <span className={styles.trackList__trackDuration}>
                {formatDuration(track.duration)}
              </span>

              {/* Rating (Like/Dislike + Stars) */}
              <div className={styles.trackList__trackRating}>
                <LikeDislikeButtons itemId={track.id} itemType="track" size={16} />
                <RatingStars itemId={track.id} itemType="track" size={14} />
              </div>

              {/* Options Menu */}
              <TrackOptionsMenu
                track={track}
                onAddToPlaylist={handleAddToPlaylist}
                onAddToQueue={handleAddToQueue}
                onGoToAlbum={hideGoToAlbum ? undefined : handleGoToAlbum}
                onGoToArtist={handleGoToArtist}
                onShowInfo={handleShowInfo}
              />
            </div>
          );
        })}
      </div>

      {/* Add to Playlist Modal */}
      {selectedTrackForPlaylist && (
        <AddToPlaylistModal
          track={selectedTrackForPlaylist}
          onClose={() => setSelectedTrackForPlaylist(null)}
        />
      )}

      {/* Track Info Modal */}
      {selectedTrackForInfo && (
        <TrackInfoModal
          track={selectedTrackForInfo}
          onClose={() => setSelectedTrackForInfo(null)}
        />
      )}
    </div>
  );
}
