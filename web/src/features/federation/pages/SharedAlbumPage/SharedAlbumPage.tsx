import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { Download, Check, Loader2, Server, Play, Pause } from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { Sidebar } from '@features/home/components';
import { useRemoteAlbum, useConnectedServers, useStartImport } from '../../hooks';
import { Button } from '@shared/components/ui';
import { extractDominantColor } from '@shared/utils/colorExtractor';
import { handleImageError } from '@shared/utils/cover.utils';
import { usePlayer } from '@features/player/context/PlayerContext';
import type { Track } from '@shared/types/track.types';
import type { RemoteTrack } from '../../types';
import styles from './SharedAlbumPage.module.css';

/**
 * SharedAlbumPage Component
 * Displays album details from a federated server
 */
export default function SharedAlbumPage() {
  const { serverId, albumId } = useParams<{ serverId: string; albumId: string }>();
  const [, setLocation] = useLocation();
  const [dominantColor, setDominantColor] = useState<string>('10, 14, 39');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [coverDimensions, setCoverDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isImported, setIsImported] = useState(false);

  const { data: album, isLoading, error } = useRemoteAlbum(serverId, albumId);
  const { data: servers } = useConnectedServers();
  const startImport = useStartImport();
  const { playQueue, currentTrack, isPlaying, play, pause } = usePlayer();

  const server = servers?.find(s => s.id === serverId);
  const coverUrl = album?.coverUrl;
  const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

  /**
   * Convert RemoteTrack to Track with proper stream URL for federated playback
   */
  const convertToPlayableTracks = useCallback((remoteTracks: RemoteTrack[]): Track[] => {
    if (!serverId || !album) return [];

    return remoteTracks.map((remoteTrack) => ({
      id: `${serverId}-${remoteTrack.id}`, // Unique ID for player queue
      title: remoteTrack.title,
      artistName: remoteTrack.artistName,
      artist: remoteTrack.artistName,
      albumId: album.id,
      albumName: album.name,
      trackNumber: remoteTrack.trackNumber,
      discNumber: remoteTrack.discNumber,
      duration: remoteTrack.duration,
      size: remoteTrack.size,
      bitRate: remoteTrack.bitRate,
      coverImage: coverUrl,
      // Custom stream URL for federated tracks
      streamUrl: `${API_BASE_URL}/federation/servers/${serverId}/tracks/${remoteTrack.id}/stream`,
    }));
  }, [serverId, album, coverUrl, API_BASE_URL]);

  // Memoized playable tracks
  const playableTracks = useMemo(() => {
    if (!album?.tracks) return [];
    return convertToPlayableTracks(album.tracks);
  }, [album?.tracks, convertToPlayableTracks]);

  // Check if current track is from this album
  const isCurrentAlbumPlaying = useMemo(() => {
    if (!currentTrack || !serverId) return false;
    return currentTrack.id.startsWith(`${serverId}-`);
  }, [currentTrack, serverId]);

  // Get the index of the currently playing track
  const currentPlayingIndex = useMemo(() => {
    if (!currentTrack || !album?.tracks) return -1;
    return album.tracks.findIndex(
      (track) => currentTrack.id === `${serverId}-${track.id}`
    );
  }, [currentTrack, album?.tracks, serverId]);

  /**
   * Play all tracks starting from the beginning
   */
  const handlePlayAll = useCallback(() => {
    if (playableTracks.length === 0) return;
    playQueue(playableTracks, 0);
  }, [playableTracks, playQueue]);

  /**
   * Play a specific track
   */
  const handlePlayTrack = useCallback((index: number) => {
    if (playableTracks.length === 0 || index < 0 || index >= playableTracks.length) return;
    playQueue(playableTracks, index);
  }, [playableTracks, playQueue]);

  /**
   * Toggle play/pause for the current track
   */
  const handleTogglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // Extract dominant color from album cover
  useEffect(() => {
    if (coverUrl) {
      extractDominantColor(coverUrl).then(color => {
        setDominantColor(color);
      });
    }
  }, [coverUrl]);

  // Load cover dimensions when modal opens
  useEffect(() => {
    if (isImageModalOpen && coverUrl) {
      const img = new window.Image();
      img.onload = () => {
        setCoverDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = coverUrl;
    } else if (!isImageModalOpen) {
      setCoverDimensions(null);
    }
  }, [isImageModalOpen, coverUrl]);

  const handleImport = async () => {
    if (!serverId || !albumId || isImporting || isImported) return;

    setIsImporting(true);
    try {
      await startImport.mutateAsync({ serverId, remoteAlbumId: albumId });
      setIsImported(true);
    } catch (error) {
      console.error('Failed to start import:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTotalDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours} h ${minutes} min`;
    }
    return `${minutes} min`;
  };

  if (isLoading) {
    return (
      <div className={styles.sharedAlbumPage}>
        <Sidebar />
        <main className={styles.sharedAlbumPage__main}>
          <Header showBackButton disableSearch />
          <div className={styles.sharedAlbumPage__content}>
            <div className={styles.sharedAlbumPage__loadingState}>
              <Loader2 size={32} className={styles.sharedAlbumPage__spinner} />
              <p>Cargando album...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className={styles.sharedAlbumPage}>
        <Sidebar />
        <main className={styles.sharedAlbumPage__main}>
          <Header showBackButton disableSearch />
          <div className={styles.sharedAlbumPage__content}>
            <div className={styles.sharedAlbumPage__errorState}>
              <p>Error al cargar el album</p>
              <Button variant="secondary" onClick={() => setLocation('/home')}>
                Volver al inicio
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const totalDuration = album.tracks?.reduce((acc, track) => acc + (track.duration || 0), 0) || album.duration || 0;

  return (
    <div className={styles.sharedAlbumPage}>
      <Sidebar />

      <main className={styles.sharedAlbumPage__main}>
        <Header showBackButton disableSearch />

        <div
          className={styles.sharedAlbumPage__content}
          style={{
            background: `linear-gradient(180deg,
              rgba(${dominantColor}, 0.4) 0%,
              rgba(${dominantColor}, 0.2) 25%,
              transparent 60%)`
          }}
        >
          {/* Album hero section */}
          <div className={styles.sharedAlbumPage__hero}>
            {/* Album cover */}
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={album.name}
                className={styles.sharedAlbumPage__heroCover}
                onError={handleImageError}
                onClick={() => setIsImageModalOpen(true)}
              />
            ) : (
              <div className={styles.sharedAlbumPage__heroCoverPlaceholder}>
                <span>🎵</span>
              </div>
            )}

            {/* Album info */}
            <div className={styles.sharedAlbumPage__heroInfo}>
              <div className={styles.sharedAlbumPage__heroType}>
                <Server size={14} />
                <span>Album Federado</span>
              </div>
              <h1 className={styles.sharedAlbumPage__heroTitle}>{album.name}</h1>
              <div className={styles.sharedAlbumPage__heroMeta}>
                <span className={styles.sharedAlbumPage__heroArtist}>{album.artistName}</span>
                <span className={styles.sharedAlbumPage__heroDivider}>•</span>
                {album.year && (
                  <>
                    <span>{album.year}</span>
                    <span className={styles.sharedAlbumPage__heroDivider}>•</span>
                  </>
                )}
                <span>{album.songCount} canciones</span>
                {totalDuration > 0 && (
                  <>
                    <span className={styles.sharedAlbumPage__heroDivider}>•</span>
                    <span>{formatTotalDuration(totalDuration)}</span>
                  </>
                )}
              </div>

              {server && (
                <div className={styles.sharedAlbumPage__serverBadge}>
                  <Server size={14} />
                  <span>Desde {server.name}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className={styles.sharedAlbumPage__heroActions}>
                {/* Play button */}
                {playableTracks.length > 0 && (
                  <button
                    className={styles.sharedAlbumPage__playButton}
                    onClick={isCurrentAlbumPlaying && isPlaying ? handleTogglePlayPause : handlePlayAll}
                    title={isCurrentAlbumPlaying && isPlaying ? 'Pausar' : 'Reproducir'}
                  >
                    {isCurrentAlbumPlaying && isPlaying ? (
                      <Pause size={24} fill="currentColor" />
                    ) : (
                      <Play size={24} fill="currentColor" />
                    )}
                  </button>
                )}

                {/* Import button */}
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handleImport}
                  disabled={isImporting || isImported}
                  leftIcon={
                    isImporting ? (
                      <Loader2 size={20} className={styles.sharedAlbumPage__spinner} />
                    ) : isImported ? (
                      <Check size={20} />
                    ) : (
                      <Download size={20} />
                    )
                  }
                >
                  {isImported ? 'Importado' : isImporting ? 'Importando...' : 'Importar'}
                </Button>
              </div>
            </div>
          </div>

          {/* Track listing */}
          <div className={styles.sharedAlbumPage__trackSection}>
            {album.tracks && album.tracks.length > 0 ? (
              <div className={styles.sharedAlbumPage__trackList}>
                <div className={styles.sharedAlbumPage__trackHeader}>
                  <span className={styles.sharedAlbumPage__trackNumber}>#</span>
                  <span className={styles.sharedAlbumPage__trackTitle}>Titulo</span>
                  <span className={styles.sharedAlbumPage__trackDuration}>Duracion</span>
                </div>
                {album.tracks.map((track: RemoteTrack, index: number) => {
                  const isCurrentTrack = currentPlayingIndex === index;
                  const isTrackPlaying = isCurrentTrack && isPlaying;

                  return (
                    <div
                      key={track.id}
                      className={`${styles.sharedAlbumPage__trackRow} ${isCurrentTrack ? styles['sharedAlbumPage__trackRow--active'] : ''}`}
                      onClick={() => isTrackPlaying ? handleTogglePlayPause() : handlePlayTrack(index)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          isTrackPlaying ? handleTogglePlayPause() : handlePlayTrack(index);
                        }
                      }}
                    >
                      <span className={styles.sharedAlbumPage__trackNumber}>
                        {isTrackPlaying ? (
                          <Pause size={14} className={styles.sharedAlbumPage__trackPlayIcon} />
                        ) : isCurrentTrack ? (
                          <Play size={14} className={styles.sharedAlbumPage__trackPlayIcon} />
                        ) : (
                          <span className={styles.sharedAlbumPage__trackNumberText}>
                            {track.trackNumber || index + 1}
                          </span>
                        )}
                        <Play size={14} className={styles.sharedAlbumPage__trackPlayIconHover} />
                      </span>
                      <div className={styles.sharedAlbumPage__trackInfo}>
                        <span className={`${styles.sharedAlbumPage__trackName} ${isCurrentTrack ? styles['sharedAlbumPage__trackName--active'] : ''}`}>
                          {track.title}
                        </span>
                        <span className={styles.sharedAlbumPage__trackArtist}>{track.artistName}</span>
                      </div>
                      <span className={styles.sharedAlbumPage__trackDuration}>
                        {formatDuration(track.duration)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.sharedAlbumPage__emptyTracks}>
                <p>No se encontraron canciones en este album</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Image Modal/Lightbox */}
      {isImageModalOpen && coverUrl && (
        <div
          className={styles.sharedAlbumPage__imageModal}
          onClick={() => setIsImageModalOpen(false)}
        >
          <div className={styles.sharedAlbumPage__imageModalContent} onClick={(e) => e.stopPropagation()}>
            <img
              src={coverUrl}
              alt={album.name}
              className={styles.sharedAlbumPage__imageModalImage}
              onError={handleImageError}
            />
            {coverDimensions && (
              <div className={styles.sharedAlbumPage__imageDimensions}>
                {coverDimensions.width} x {coverDimensions.height} px
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
