import { useParams, Link, useLocation } from 'wouter';
import { Play, Shuffle, Music, Globe, Lock } from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { Sidebar } from '@features/home/components';
import { TrackList } from '@features/home/components';
import { usePlaylist, usePlaylistTracks, useUpdatePlaylist, useRemoveTrackFromPlaylist, useDeletePlaylist, useReorderPlaylistTracks } from '../../hooks/usePlaylists';
import { usePlayer } from '@features/player';
import { Button } from '@shared/components/ui';
import { useModal, useDominantColor, useDocumentTitle } from '@shared/hooks';
import { PlaylistCoverMosaic, PlaylistOptionsMenu, EditPlaylistModal, DeletePlaylistModal } from '../../components';
import { UpdatePlaylistDto } from '../../types';
import type { Track as SharedTrack } from '@shared/types/track.types';
import { formatDuration } from '@shared/utils/format';
import { getUserAvatarUrl, handleAvatarError } from '@shared/utils/avatar.utils';
import { toPlayerTracks } from '@shared/utils/track.utils';
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

  // Modal state management
  const imageModal = useModal();
  const editModal = useModal();
  const deleteModal = useModal();

  const { data: playlist, isLoading: loadingPlaylist, error: playlistError } = usePlaylist(id!);
  useDocumentTitle(playlist?.name);
  const { data: playlistTracks, isLoading: loadingTracks } = usePlaylistTracks(id!);
  const updatePlaylistMutation = useUpdatePlaylist();
  const deletePlaylistMutation = useDeletePlaylist();
  const removeTrackMutation = useRemoveTrackFromPlaylist();
  const reorderTracksMutation = useReorderPlaylistTracks();

  // Extract dominant color from first album cover in playlist
  const playlistCoverUrl = (() => {
    const firstAlbumId = (playlistTracks?.tracks || []).find((t) => t.albumId)?.albumId;
    return firstAlbumId ? `/api/albums/${firstAlbumId}/cover` : undefined;
  })();
  const dominantColor = useDominantColor(playlistCoverUrl);

  const handlePlayAll = () => {
    const tracks = playlistTracks?.tracks || [];
    if (tracks.length === 0) return;
    // Disable shuffle mode for ordered playback
    setShuffle(false);
    const playerTracks = toPlayerTracks(tracks);
    playQueue(playerTracks, 0);
  };

  const handleShufflePlay = () => {
    const tracks = playlistTracks?.tracks || [];
    if (tracks.length === 0) return;
    const playerTracks = toPlayerTracks(tracks);
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

  const handleTrackPlay = (track: SharedTrack) => {
    const tracks = playlistTracks?.tracks || [];
    if (tracks.length === 0) return;
    const playerTracks = toPlayerTracks(tracks);
    const trackIndex = tracks.findIndex(t => t.id === track.id);
    playQueue(playerTracks, trackIndex >= 0 ? trackIndex : 0);
  };

  const handleUpdatePlaylist = async (id: string, data: UpdatePlaylistDto) => {
    await updatePlaylistMutation.mutateAsync({ id, dto: data });
  };

  const handleRemoveTrack = async (track: SharedTrack) => {
    if (!id) return;
    try {
      await removeTrackMutation.mutateAsync({ playlistId: id, trackId: track.id });
    } catch (error) {
      logger.error('Error removing track from playlist:', error);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!id) return;
    try {
      await deletePlaylistMutation.mutateAsync(id);
      deleteModal.close();
      setLocation('/playlists');
    } catch (error) {
      logger.error('Error deleting playlist:', error);
    }
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

  const handleMoveTrackUp = async (_track: SharedTrack, index: number) => {
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

  const handleMoveTrackDown = async (_track: SharedTrack, index: number) => {
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
                  onEdit={editModal.open}
                  onToggleVisibility={handleToggleVisibility}
                  onDelete={deleteModal.open}
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
      {imageModal.isOpen && playlist.coverImageUrl && (
        <div
          className={styles.playlistDetailPage__imageModal}
          onClick={imageModal.close}
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
      {editModal.isOpen && playlist && (
        <EditPlaylistModal
          playlist={playlist}
          onClose={editModal.close}
          onSubmit={handleUpdatePlaylist}
          isLoading={updatePlaylistMutation.isPending}
        />
      )}

      {/* Delete Playlist Modal */}
      {deleteModal.isOpen && playlist && (
        <DeletePlaylistModal
          playlistName={playlist.name}
          onClose={deleteModal.close}
          onConfirm={handleDeletePlaylist}
          isLoading={deletePlaylistMutation.isPending}
        />
      )}
    </div>
  );
}
