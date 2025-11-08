import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { Play, Music, Trash2, Edit2, MoreHorizontal } from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { Sidebar } from '@features/home/components';
import { TrackList } from '@features/home/components';
import { usePlaylist, usePlaylistTracks, useRemoveTrackFromPlaylist } from '../../hooks/usePlaylists';
import { usePlayer, Track } from '@features/player';
import { Button } from '@shared/components/ui';
import { PlaylistCoverMosaic } from '../../components';
import { extractDominantColor } from '@shared/utils/colorExtractor';
import styles from './PlaylistDetailPage.module.css';

/**
 * PlaylistDetailPage Component
 * Displays playlist details and track listing
 */
export default function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { playQueue, currentTrack } = usePlayer();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [dominantColor, setDominantColor] = useState<string>('10, 14, 39'); // Default dark blue

  const { data: playlist, isLoading: loadingPlaylist, error: playlistError } = usePlaylist(id!);
  const { data: playlistTracks, isLoading: loadingTracks } = usePlaylistTracks(id!);
  const removeTrackMutation = useRemoveTrackFromPlaylist();

  // Extract dominant color from first album cover in playlist
  useEffect(() => {
    const tracks = playlistTracks?.tracks || [];
    const firstAlbumId = tracks.find((track) => track.albumId)?.albumId;

    if (firstAlbumId) {
      const coverUrl = `/api/albums/${firstAlbumId}/cover`;
      extractDominantColor(coverUrl).then((color) => {
        setDominantColor(color);
      });
    }
  }, [playlistTracks]);

  // Convert API tracks to Player tracks
  const convertToPlayerTracks = (apiTracks: any[]): Track[] => {
    return apiTracks.map(track => ({
      id: track.id,
      title: track.title,
      artist: track.artistName || 'Unknown Artist',
      albumName: track.albumName,
      duration: track.duration || 0,
      coverImage: track.albumId ? `/api/albums/${track.albumId}/cover` : undefined,
      trackNumber: track.trackNumber,
    }));
  };

  const handlePlayAll = () => {
    const tracks = playlistTracks?.tracks || [];
    if (tracks.length === 0) return;
    const playerTracks = convertToPlayerTracks(tracks);
    playQueue(playerTracks, 0);
  };

  const handleTrackPlay = (track: any) => {
    const tracks = playlistTracks?.tracks || [];
    if (tracks.length === 0) return;
    const playerTracks = convertToPlayerTracks(tracks);
    const trackIndex = tracks.findIndex(t => t.id === track.id);
    playQueue(playerTracks, trackIndex >= 0 ? trackIndex : 0);
  };

  const handleRemoveTrack = async (trackId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta canción de la playlist?')) {
      return;
    }

    try {
      await removeTrackMutation.mutateAsync({
        playlistId: id!,
        trackId,
      });
    } catch (error) {
      console.error('Error removing track:', error);
      alert('Error al eliminar la canción');
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes} min`;
  };

  if (loadingPlaylist) {
    return (
      <div className={styles.playlistDetailPage}>
        <Sidebar />
        <main className={styles.playlistDetailPage__main}>
          <Header showBackButton />
          <div className={styles.playlistDetailPage__content}>
            <div className={styles.playlistDetailPage__loadingState}>
              <p>Cargando playlist...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (playlistError || !playlist) {
    return (
      <div className={styles.playlistDetailPage}>
        <Sidebar />
        <main className={styles.playlistDetailPage__main}>
          <Header showBackButton />
          <div className={styles.playlistDetailPage__content}>
            <div className={styles.playlistDetailPage__errorState}>
              <p>Error al cargar la playlist</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Get tracks for the track list
  const tracks = playlistTracks?.tracks || [];

  // Extract unique album IDs for the mosaic
  const albumIds = tracks
    .map((track) => track.albumId)
    .filter((id): id is string => !!id);

  return (
    <div className={styles.playlistDetailPage}>
      <Sidebar />

      <main className={styles.playlistDetailPage__main}>
        <Header showBackButton />

        <div
          className={styles.playlistDetailPage__content}
          style={{
            background: `linear-gradient(180deg,
              rgba(${dominantColor}, 0.6) 0%,
              rgba(${dominantColor}, 0.3) 25%,
              rgba(10, 14, 39, 1) 60%)`
          }}
        >
          {/* Playlist hero section */}
          <div className={styles.playlistDetailPage__hero}>
            {/* Playlist cover */}
            <div className={styles.playlistDetailPage__heroCover}>
              <PlaylistCoverMosaic albumIds={albumIds} playlistName={playlist.name} />
            </div>

            {/* Playlist info */}
            <div className={styles.playlistDetailPage__heroInfo}>
              <span className={styles.playlistDetailPage__heroType}>Playlist</span>
              <h1 className={styles.playlistDetailPage__heroTitle}>{playlist.name}</h1>
              {playlist.description && (
                <p className={styles.playlistDetailPage__heroDescription}>
                  {playlist.description}
                </p>
              )}
              <div className={styles.playlistDetailPage__heroMeta}>
                {playlist.ownerName && (
                  <>
                    <span>{playlist.ownerName}</span>
                    <span className={styles.playlistDetailPage__heroDivider}>•</span>
                  </>
                )}
                <span>{playlist.songCount} {playlist.songCount === 1 ? 'canción' : 'canciones'}</span>
                {playlist.duration > 0 && (
                  <>
                    <span className={styles.playlistDetailPage__heroDivider}>•</span>
                    <span>{formatDuration(playlist.duration)}</span>
                  </>
                )}
              </div>

              {/* Action buttons */}
              <div className={styles.playlistDetailPage__heroActions}>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handlePlayAll}
                  leftIcon={<Play size={20} fill="currentColor" />}
                  disabled={!playlistTracks || !playlistTracks.tracks || playlistTracks.tracks.length === 0}
                >
                  Reproducir
                </Button>
                <button
                  className={styles.playlistDetailPage__heroActionButton}
                  aria-label="Edit playlist"
                  title="Editar playlist"
                >
                  <Edit2 size={20} />
                </button>
                <button
                  className={styles.playlistDetailPage__heroMoreButton}
                  aria-label="More options"
                >
                  <MoreHorizontal size={24} />
                </button>
              </div>
            </div>
          </div>

          {/* Track listing */}
          <div className={styles.playlistDetailPage__trackSection}>
            {loadingTracks ? (
              <div className={styles.playlistDetailPage__loadingTracks}>
                <p>Cargando canciones...</p>
              </div>
            ) : tracks && tracks.length > 0 ? (
              <TrackList
                tracks={tracks}
                onTrackPlay={handleTrackPlay}
                currentTrackId={currentTrack?.id}
              />
            ) : (
              <div className={styles.playlistDetailPage__emptyTracks}>
                <Music size={48} />
                <p>Esta playlist está vacía</p>
                <p className={styles.playlistDetailPage__emptyHint}>
                  Agrega canciones usando el menú de opciones de cualquier canción
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Image Modal/Lightbox */}
      {isImageModalOpen && playlist.coverImageUrl && (
        <div
          className={styles.playlistDetailPage__imageModal}
          onClick={() => setIsImageModalOpen(false)}
        >
          <div
            className={styles.playlistDetailPage__imageModalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={playlist.coverImageUrl}
              alt={playlist.name}
              className={styles.playlistDetailPage__imageModalImage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
