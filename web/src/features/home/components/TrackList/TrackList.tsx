import { useState, useEffect, useMemo, useCallback } from 'react';
import { Play, Pause, Disc, Ghost, ChevronUp, ChevronDown } from 'lucide-react';
import { useLocation } from 'wouter';
import { usePlayer } from '@features/player/context/PlayerContext';
import { AddToPlaylistModal } from '@features/playlists/components/AddToPlaylistModal';
import { TrackInfoModal } from '../TrackInfoModal';
import type { Track } from '../../types';
import { formatDuration } from '../../types';
import { TrackOptionsMenu } from '../TrackOptionsMenu/TrackOptionsMenu';
import { RatingStars } from '@shared/components/ui/RatingStars';
import { downloadService } from '@shared/services/download.service';
import { logger } from '@shared/utils/logger';
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
  onRemoveFromPlaylist?: (track: Track) => void; // Handler to remove track from playlist (only in playlist view)
  onMoveUp?: (track: Track, index: number) => void; // Handler to move track up (for playlist reordering)
  onMoveDown?: (track: Track, index: number) => void; // Handler to move track down (for playlist reordering)
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
export function TrackList({ tracks, onTrackPlay, currentTrackId, hideGoToAlbum = false, hideAlbumCover = false, onRemoveFromPlaylist, onMoveUp, onMoveDown }: TrackListProps) {
  const canReorder = !!(onMoveUp && onMoveDown);
  const [, setLocation] = useLocation();
  const { addToQueue, isPlaying: playerIsPlaying, togglePlayPause } = usePlayer();
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<Track | null>(null);
  const [selectedTrackForInfo, setSelectedTrackForInfo] = useState<Track | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Detect if album has multiple discs
  const discInfo = useMemo(() => {
    const discNumbers = new Set(tracks.map(t => t.discNumber || 1));
    const hasMultipleDiscs = discNumbers.size > 1;
    const sortedDiscs = Array.from(discNumbers).sort((a, b) => a - b);
    return { hasMultipleDiscs, discs: sortedDiscs };
  }, [tracks]);

  // Group tracks by disc number
  const tracksByDisc = useMemo(() => {
    if (!discInfo.hasMultipleDiscs) return null;

    const grouped = new Map<number, Track[]>();
    for (const track of tracks) {
      const discNum = track.discNumber || 1;
      if (!grouped.has(discNum)) {
        grouped.set(discNum, []);
      }
      grouped.get(discNum)!.push(track);
    }
    return grouped;
  }, [tracks, discInfo.hasMultipleDiscs]);

  // Detect mobile viewport to conditionally render rating components
  // This prevents unnecessary API calls on mobile devices
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePlay = useCallback((track: Track) => {
    onTrackPlay?.(track);
  }, [onTrackPlay]);

  // Track options handlers - memoized to prevent unnecessary re-renders
  const handleAddToPlaylist = useCallback((track: Track) => {
    setSelectedTrackForPlaylist(track);
  }, []);

  const handleAddToQueue = useCallback((track: Track) => {
    // Map track to player format
    const playerTrack = {
      id: track.id,
      title: track.title,
      artist: track.artistName || 'Unknown Artist',
      albumId: track.albumId,
      albumName: track.albumName,
      duration: track.duration || 0,
      coverImage: track.albumId ? `/api/albums/${track.albumId}/cover` : undefined,
      trackNumber: track.trackNumber,
      // Audio normalization data (LUFS)
      rgTrackGain: track.rgTrackGain,
      rgTrackPeak: track.rgTrackPeak,
    };
    addToQueue(playerTrack);
  }, [addToQueue]);

  const handleGoToAlbum = useCallback((track: Track) => {
    if (track.albumId) {
      setLocation(`/album/${track.albumId}`);
    }
  }, [setLocation]);

  const handleGoToArtist = useCallback((track: Track) => {
    if (track.artistId) {
      setLocation(`/artists/${track.artistId}`);
    }
  }, [setLocation]);

  const handleShowInfo = useCallback((track: Track) => {
    setSelectedTrackForInfo(track);
  }, []);

  const handleDownload = useCallback(async (track: Track) => {
    try {
      logger.info('Starting track download:', { trackId: track.id, title: track.title });
      await downloadService.downloadTrack(track.id, `${track.title}.${track.suffix || 'mp3'}`);
    } catch (error) {
      logger.error('Failed to download track:', error);
    }
  }, []);

  // Helper function to render a single track row
  const renderTrackRow = (track: Track, index: number) => {
    const isCurrentTrack = currentTrackId === track.id;
    const isPlayingThisTrack = isCurrentTrack && playerIsPlaying;
    const isMissingTrack = track.isMissing === true;
    const coverUrl = track.albumId ? `/api/albums/${track.albumId}/cover` : '/placeholder-album.png';
    // Use playlistOrder if available (for playlists), otherwise use trackNumber
    const displayNumber = track.playlistOrder !== undefined ? track.playlistOrder : (track.trackNumber || index + 1);

    // Build class names
    const trackClasses = [
      styles.trackList__track,
      isCurrentTrack ? styles['trackList__track--active'] : '',
      isMissingTrack ? styles['trackList__track--missing'] : '',
      canReorder ? styles['trackList__track--reorderable'] : '',
    ].filter(Boolean).join(' ');

    // Handle click - toggle play/pause if current track, otherwise play
    const handleTrackClick = () => {
      if (isMissingTrack) return;

      if (isCurrentTrack) {
        togglePlayPause();
      } else {
        handlePlay(track);
      }
    };

    return (
      <div
        key={track.id}
        className={trackClasses}
        onClick={handleTrackClick}
        title={isMissingTrack ? 'Archivo no disponible' : undefined}
      >
        {/* Track number / Play button container */}
        <div className={styles.trackList__numberCell}>
          {isMissingTrack ? (
            <Ghost size={16} className={styles.trackList__ghostIcon} />
          ) : (
            <>
              <span className={styles.trackList__trackNumber}>
                {displayNumber}
              </span>
              <button
                className={styles.trackList__playButton}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isCurrentTrack) {
                    togglePlayPause();
                  } else {
                    handlePlay(track);
                  }
                }}
                aria-label={isPlayingThisTrack ? `Pause ${track.title}` : `Play ${track.title}`}
              >
                {isPlayingThisTrack ? (
                  <Pause size={16} fill="currentColor" />
                ) : (
                  <Play size={16} fill="currentColor" />
                )}
              </button>
            </>
          )}
        </div>

        {/* Reorder buttons (only when reordering is enabled) */}
        {canReorder && (
          <div className={styles.trackList__reorderButtons}>
            <button
              className={styles.trackList__reorderButton}
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp?.(track, index);
              }}
              disabled={index === 0}
              aria-label="Mover arriba"
              title="Mover arriba"
            >
              <ChevronUp size={16} />
            </button>
            <button
              className={styles.trackList__reorderButton}
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown?.(track, index);
              }}
              disabled={index === tracks.length - 1}
              aria-label="Mover abajo"
              title="Mover abajo"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        )}

        {/* Track info (cover + title + artist) */}
        <div className={styles.trackList__trackInfo}>
          {!hideAlbumCover && (
            <img
              src={coverUrl}
              alt={track.albumName || track.title}
              className={styles.trackList__trackCover}
              loading="lazy"
              decoding="async"
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

        {/* Rating Stars - Only render on desktop to avoid API rate limits */}
        {!isMobile && !isMissingTrack && (
          <div className={styles.trackList__trackRating}>
            <RatingStars itemId={track.id} itemType="track" size={14} />
          </div>
        )}

        {/* Options Menu - hide for missing tracks */}
        {!isMissingTrack && (
          <TrackOptionsMenu
            track={track}
            onAddToPlaylist={handleAddToPlaylist}
            onAddToQueue={handleAddToQueue}
            onGoToAlbum={hideGoToAlbum ? undefined : handleGoToAlbum}
            onGoToArtist={handleGoToArtist}
            onShowInfo={handleShowInfo}
            onRemoveFromPlaylist={onRemoveFromPlaylist}
            onDownload={handleDownload}
          />
        )}
      </div>
    );
  };

  // Helper function to render disc separator
  const renderDiscSeparator = (discNumber: number) => (
    <div key={`disc-${discNumber}`} className={styles.trackList__discSeparator}>
      <div className={styles.trackList__discLabel}>
        <Disc size={16} />
        <span>CD {discNumber}</span>
      </div>
      <div className={styles.trackList__discLine} />
    </div>
  );

  if (!tracks || tracks.length === 0) {
    return (
      <div className={styles.trackList__emptyState}>
        <p>No se encontraron canciones en este álbum</p>
      </div>
    );
  }

  return (
    <div className={styles.trackList}>
      <div className={`${styles.trackList__header} ${canReorder ? styles['trackList__header--reorderable'] : ''}`}>
        <span className={styles.trackList__headerNumber}>#</span>
        {canReorder && <span className={styles.trackList__headerReorder}>Orden</span>}
        <span className={styles.trackList__headerTitle}>Título</span>
        <span className={styles.trackList__headerFormat}>Formato</span>
        <span className={styles.trackList__headerDuration}>Duración</span>
        <span className={styles.trackList__headerRating}>Calificación</span>
      </div>

      <div className={styles.trackList__tracks}>
        {/* Render with disc separators if multiple discs, otherwise render flat list */}
        {discInfo.hasMultipleDiscs && tracksByDisc ? (
          // Multiple discs: render with separators
          discInfo.discs.map(discNumber => (
            <div key={`disc-group-${discNumber}`}>
              {renderDiscSeparator(discNumber)}
              {tracksByDisc.get(discNumber)?.map((track, index) => renderTrackRow(track, index))}
            </div>
          ))
        ) : (
          // Single disc: render flat list
          tracks.map((track, index) => renderTrackRow(track, index))
        )}
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
