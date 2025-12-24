import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { Play, Shuffle, Music, Globe, Lock } from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { Sidebar } from '@features/home/components';
import { TrackList } from '@features/home/components';
import { usePlaylist, usePlaylistTracks, useUpdatePlaylist, useRemoveTrackFromPlaylist, useDeletePlaylist, useReorderPlaylistTracks } from '../../hooks/usePlaylists';
import { usePlayer, Track } from '@features/player';
import { Button } from '@shared/components/ui';
import { PlaylistCoverMosaic, PlaylistOptionsMenu, EditPlaylistModal, DeletePlaylistModal } from '../../components';
import { UpdatePlaylistDto } from '../../types';
import { extractDominantColor } from '@shared/utils/colorExtractor';
import { formatDuration } from '@shared/utils/format';
import { getUserAvatarUrl, handleAvatarError } from '@shared/utils/avatar.utils';
import { useAuthStore } from '@shared/store';
import { logger } from '@shared/utils/logger';
import styles from './PlaylistDetailPage.module.css';

/**
 * PlaylistDetailPage Component
 * Displays playlist details and track listing
 */
export default function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { playQueue, currentTrack, setShuffle } = usePlayer();
  const avatarTimestamp = useAuthStore((state) => state.avatarTimestamp);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [dominantColor, setDominantColor] = useState<string>('10, 14, 39'); // Default dark blue
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: playlist, isLoading: loadingPlaylist, error: playlistError } = usePlaylist(id!);
  const { data: playlistTracks, isLoading: loadingTracks } = usePlaylistTracks(id!);
  const updatePlaylistMutation = useUpdatePlaylist();
  const deletePlaylistMutation = useDeletePlaylist();
  const removeTrackMutation = useRemoveTrackFromPlaylist();
  const reorderTracksMutation = useReorderPlaylistTracks();

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
      albumId: track.albumId,
      albumName: track.albumName,
      duration: track.duration || 0,
      coverImage: track.albumId ? `/api/albums/${track.albumId}/cover` : undefined,
      trackNumber: track.trackNumber,
      // Audio normalization data (LUFS)
      rgTrackGain: track.rgTrackGain,
      rgTrackPeak: track.rgTrackPeak,
    }));
  };

  const handlePlayAll = () => {
    const tracks = playlistTracks?.tracks || [];
    if (tracks.length === 0) return;
    // Disable shuffle mode for ordered playback
    setShuffle(false);
    const playerTracks = convertToPlayerTracks(tracks);
    playQueue(playerTracks, 0);
  };

  const handleShufflePlay = () => {
    const tracks = playlistTracks?.tracks || [];
    if (tracks.length === 0) return;
    const playerTracks = convertToPlayerTracks(tracks);
    // Enable shuffle mode
    setShuffle(true);
    // Shuffle the tracks array using Fisher-Yates algorithm
    const shuffledTracks = [...playerTracks];
    for (let i = shuffledTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTracks[i], shuffledTracks[j]] = [shuffledTracks[j], shuffledTracks[i]];
    }
    playQueue(shuffledTracks, 0);
  };

  const handleTrackPlay = (track: any) => {
    const tracks = playlistTracks?.tracks || [];
    if (tracks.length === 0) return;
    const playerTracks = convertToPlayerTracks(tracks);
    const trackIndex = tracks.findIndex(t => t.id === track.id);
    playQueue(playerTracks, trackIndex >= 0 ? trackIndex : 0);
  };

  const handleUpdatePlaylist = async (id: string, data: UpdatePlaylistDto) => {
    await updatePlaylistMutation.mutateAsync({ id, dto: data });
  };

  const handleRemoveTrack = async (track: any) => {
    if (!id) return;
    try {
      await removeTrackMutation.mutateAsync({ playlistId: id, trackId: track.id });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error removing track from playlist:', error);
      }
    }
  };

  const handleDeletePlaylist = async () => {
    if (!id) return;
    try {
      await deletePlaylistMutation.mutateAsync(id);
      setShowDeleteModal(false);
      setLocation('/playlists');
    } catch (error) {
      logger.error('Error deleting playlist:', error);
    }
  };

  const handleDownloadPlaylist = () => {
    // TODO: Implement playlist download
    logger.debug('Download playlist - to be implemented');
  };

  const handleToggleVisibility = async () => {
    if (!playlist || !id) return;
    try {
      await updatePlaylistMutation.mutateAsync({
        id,
        dto: { public: !playlist.public }
      });
    } catch (error) {
      logger.error('Error toggling playlist visibility:', error);
    }
  };

  const handleMoveTrackUp = async (_track: any, index: number) => {
    if (!id || index === 0) return;
    const currentTracks = playlistTracks?.tracks || [];
    if (currentTracks.length < 2) return;

    // Create new order: swap with previous track
    const newOrder = currentTracks.map(t => t.id);
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];

    try {
      await reorderTracksMutation.mutateAsync({
        playlistId: id,
        dto: { trackOrders: newOrder.map((trackId, idx) => ({ trackId, order: idx })) },
      });
    } catch (error) {
      logger.error('Error reordering tracks:', error);
    }
  };

  const handleMoveTrackDown = async (_track: any, index: number) => {
    if (!id) return;
    const currentTracks = playlistTracks?.tracks || [];
    if (index >= currentTracks.length - 1) return;

    // Create new order: swap with next track
    const newOrder = currentTracks.map(t => t.id);
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];

    try {
      await reorderTracksMutation.mutateAsync({
        playlistId: id,
        dto: { trackOrders: newOrder.map((trackId, idx) => ({ trackId, order: idx })) },
      });
    } catch (error) {
      logger.error('Error reordering tracks:', error);
    }
  };

  if (loadingPlaylist) {
    return (
      <div className={styles.playlistDetailPage}>
        <Sidebar />
        <main className={styles.playlistDetailPage__main}>
          <Header showBackButton disableSearch />
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
          <Header showBackButton disableSearch />
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
        <Header showBackButton disableSearch />

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
              <div className={styles.playlistDetailPage__heroTypeRow}>
                <span className={styles.playlistDetailPage__heroType}>Playlist</span>
                <span className={`${styles.playlistDetailPage__visibilityBadge} ${playlist.public ? styles['playlistDetailPage__visibilityBadge--public'] : styles['playlistDetailPage__visibilityBadge--private']}`}>
                  {playlist.public ? <Globe size={14} /> : <Lock size={14} />}
                  {playlist.public ? 'Pública' : 'Privada'}
                </span>
              </div>
              <h1 className={styles.playlistDetailPage__heroTitle}>{playlist.name}</h1>
              {playlist.description && (
                <p className={styles.playlistDetailPage__heroDescription}>
                  {playlist.description}
                </p>
              )}
              <div className={styles.playlistDetailPage__heroMeta}>
                {playlist.ownerName && playlist.ownerId && (
                  <>
                    <Link
                      href={`/user/${playlist.ownerId}`}
                      className={styles.playlistDetailPage__heroOwner}
                    >
                      <img
                        src={getUserAvatarUrl(playlist.ownerId, true, avatarTimestamp)}
                        alt={playlist.ownerName}
                        className={styles.playlistDetailPage__heroOwnerAvatar}
                        onError={handleAvatarError}
                      />
                      {playlist.ownerName}
                    </Link>
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
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handleShufflePlay}
                  leftIcon={<Shuffle size={20} />}
                  disabled={!playlistTracks || !playlistTracks.tracks || playlistTracks.tracks.length === 0}
                >
                  Aleatorio
                </Button>
                <PlaylistOptionsMenu
                  onEdit={() => setShowEditModal(true)}
                  onToggleVisibility={handleToggleVisibility}
                  onDownload={handleDownloadPlaylist}
                  onDelete={() => setShowDeleteModal(true)}
                  isPublic={playlist.public}
                />
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
                onRemoveFromPlaylist={handleRemoveTrack}
                onMoveUp={handleMoveTrackUp}
                onMoveDown={handleMoveTrackDown}
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

      {/* Edit Playlist Modal */}
      {showEditModal && playlist && (
        <EditPlaylistModal
          playlist={playlist}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleUpdatePlaylist}
          isLoading={updatePlaylistMutation.isPending}
        />
      )}

      {/* Delete Playlist Modal */}
      {showDeleteModal && playlist && (
        <DeletePlaylistModal
          playlistName={playlist.name}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeletePlaylist}
          isLoading={deletePlaylistMutation.isPending}
        />
      )}
    </div>
  );
}
