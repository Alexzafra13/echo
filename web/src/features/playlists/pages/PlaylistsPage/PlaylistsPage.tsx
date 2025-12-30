import { useState, useEffect } from 'react';
import { Plus, Music, Trash2, Edit2, Search, X } from 'lucide-react';
import { useLocation } from 'wouter';
import { Sidebar } from '@features/home/components';
import { useGridDimensions } from '@features/home/hooks';
import { Header } from '@shared/components/layout/Header';
import { Button, Pagination } from '@shared/components/ui';
import { formatDuration } from '@shared/utils/format';
import { usePlaylists, useDeletePlaylist, useCreatePlaylist, useUpdatePlaylist, useAddTrackToPlaylist } from '../../hooks/usePlaylists';
import { PlaylistCoverMosaic, CreatePlaylistModal, DeletePlaylistModal, EditPlaylistModal } from '../../components';
import { Playlist, UpdatePlaylistDto } from '../../types';
import { logger } from '@shared/utils/logger';
import styles from './PlaylistsPage.module.css';

/**
 * PlaylistsPage Component
 * Displays user's playlists and allows creating new ones
 */
export default function PlaylistsPage() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletePlaylistId, setDeletePlaylistId] = useState<string | null>(null);
  const [deletePlaylistName, setDeletePlaylistName] = useState('');
  const [editPlaylist, setEditPlaylist] = useState<Playlist | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate dynamic grid dimensions to fill the screen
  const { itemsPerPage } = useGridDimensions({
    headerHeight: 220, // Header + page title + button height
  });

  const { data: playlistsData, isLoading } = usePlaylists({
    skip: (page - 1) * itemsPerPage,
    take: itemsPerPage,
  });
  const createPlaylistMutation = useCreatePlaylist();
  const deletePlaylistMutation = useDeletePlaylist();
  const updatePlaylistMutation = useUpdatePlaylist();
  const addTrackMutation = useAddTrackToPlaylist();

  const allPlaylists = playlistsData?.items || [];
  const total = playlistsData?.total || 0;
  const totalPages = Math.ceil(total / itemsPerPage) || 1;

  // Filter playlists based on search query (client-side for current page)
  const playlists = searchQuery.trim()
    ? allPlaylists.filter(playlist =>
        playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        playlist.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allPlaylists;

  // Reset to first page when itemsPerPage changes
  useEffect(() => {
    setPage(1);
  }, [itemsPerPage]);

  // Pagination handler
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreatePlaylist = async (name: string, trackIds: string[]) => {
    // Create the playlist
    const newPlaylist = await createPlaylistMutation.mutateAsync({
      name,
      public: false,
    });

    // Add all selected tracks to the new playlist
    for (const trackId of trackIds) {
      await addTrackMutation.mutateAsync({
        playlistId: newPlaylist.id,
        dto: { trackId },
      });
    }
  };

  const handleDeleteClick = (playlistId: string, playlistName: string) => {
    setDeletePlaylistId(playlistId);
    setDeletePlaylistName(playlistName);
  };

  const handleDeleteConfirm = async () => {
    if (!deletePlaylistId) return;

    try {
      await deletePlaylistMutation.mutateAsync(deletePlaylistId);
    } catch (error: any) {
      if (import.meta.env.DEV) {
        logger.error('Error deleting playlist:', error);
      }
      alert('Error al eliminar la playlist');
    }
  };

  const handleDeleteCancel = () => {
    setDeletePlaylistId(null);
    setDeletePlaylistName('');
  };

  const handleUpdatePlaylist = async (id: string, data: UpdatePlaylistDto) => {
    await updatePlaylistMutation.mutateAsync({ id, dto: data });
  };

  return (
    <div className={styles.playlistsPage}>
      <Sidebar />

      <main className={styles.playlistsPage__main}>
        <Header
          customSearch={
            <div className={styles.playlistsPage__searchForm}>
              <div className={styles.playlistsPage__searchWrapper}>
                <Search size={20} className={styles.playlistsPage__searchIcon} />
                <input
                  type="text"
                  placeholder="Buscar playlists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.playlistsPage__searchInput}
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className={styles.playlistsPage__searchClearButton}
                    aria-label="Limpiar búsqueda"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          }
        />

        <div className={styles.playlistsPage__content}>
          {/* Header Section */}
          <div className={styles.playlistsPage__header}>
            <h1 className={styles.playlistsPage__title}>Mis Playlists</h1>
            <p className={styles.playlistsPage__subtitle}>
              {total} {total === 1 ? 'playlist' : 'playlists'}
            </p>
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={20} />
              Nueva Playlist
            </Button>
          </div>

          {/* Top Pagination - Mobile Only */}
          {!isLoading && playlists.length > 0 && totalPages > 1 && (
            <div className={styles.playlistsPage__paginationTop}>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                disabled={isLoading}
              />
            </div>
          )}

          {/* Playlists Grid */}
          {isLoading ? (
            <div className={styles.playlistsPage__loading}>
              <p>Cargando playlists...</p>
            </div>
          ) : playlists.length === 0 ? (
            <div className={styles.playlistsPage__emptyState}>
              <Music size={64} />
              <h2>No tienes playlists todavía</h2>
              <p>Crea tu primera playlist para organizar tu música</p>
            </div>
          ) : (
            <div className={styles.playlistsPage__gridWrapper}>
              <div className={styles.playlistsPage__grid}>
                {playlists.map((playlist) => (
                  <div
                    key={playlist.id}
                    className={styles.playlistCard}
                    onClick={() => setLocation(`/playlists/${playlist.id}`)}
                  >
                    <div className={styles.playlistCard__cover}>
                      <PlaylistCoverMosaic
                        albumIds={playlist.albumIds || []}
                        playlistName={playlist.name}
                      />
                    </div>

                    <div className={styles.playlistCard__info}>
                      <h3 className={styles.playlistCard__title}>{playlist.name}</h3>
                      {playlist.description && (
                        <p className={styles.playlistCard__description}>
                          {playlist.description}
                        </p>
                      )}
                      <div className={styles.playlistCard__meta}>
                        <span>
                          {playlist.songCount} {playlist.songCount === 1 ? 'canción' : 'canciones'}
                        </span>
                        {playlist.duration > 0 && (
                          <>
                            <span className={styles.playlistCard__separator}>•</span>
                            <span>{formatDuration(playlist.duration)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className={styles.playlistCard__actions}>
                      <button
                        className={styles.playlistCard__actionButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditPlaylist(playlist);
                        }}
                        title="Editar playlist"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className={styles.playlistCard__actionButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(playlist.id, playlist.name);
                        }}
                        title="Eliminar playlist"
                        disabled={deletePlaylistMutation.isPending}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                disabled={isLoading}
              />
            </div>
          )}
        </div>
      </main>

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <CreatePlaylistModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreatePlaylist}
          isLoading={createPlaylistMutation.isPending || addTrackMutation.isPending}
        />
      )}

      {/* Delete Playlist Modal */}
      {deletePlaylistId && (
        <DeletePlaylistModal
          playlistName={deletePlaylistName}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          isLoading={deletePlaylistMutation.isPending}
        />
      )}

      {/* Edit Playlist Modal */}
      {editPlaylist && (
        <EditPlaylistModal
          playlist={editPlaylist}
          onClose={() => setEditPlaylist(null)}
          onSubmit={handleUpdatePlaylist}
          isLoading={updatePlaylistMutation.isPending}
        />
      )}
    </div>
  );
}
