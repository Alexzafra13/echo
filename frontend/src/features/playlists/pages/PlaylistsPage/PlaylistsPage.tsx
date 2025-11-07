import { useState } from 'react';
import { Plus, Music, Trash2, Edit2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { Sidebar } from '@features/home/components';
import { Header } from '@shared/components/layout/Header';
import { Button } from '@shared/components/ui';
import { usePlaylists, useDeletePlaylist, useCreatePlaylist } from '../../hooks/usePlaylists';
import styles from './PlaylistsPage.module.css';

/**
 * PlaylistsPage Component
 * Displays user's playlists and allows creating new ones
 */
export default function PlaylistsPage() {
  const [, setLocation] = useLocation();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [error, setError] = useState('');

  const { data: playlistsData, isLoading } = usePlaylists();
  const createPlaylistMutation = useCreatePlaylist();
  const deletePlaylistMutation = useDeletePlaylist();

  const playlists = playlistsData?.items || [];

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPlaylistName.trim()) {
      setError('El nombre de la playlist es obligatorio');
      return;
    }

    try {
      await createPlaylistMutation.mutateAsync({
        name: newPlaylistName.trim(),
        public: false,
      });
      setNewPlaylistName('');
      setShowCreateForm(false);
      setError('');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Error al crear la playlist');
    }
  };

  const handleDeletePlaylist = async (playlistId: string, playlistName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${playlistName}"?`)) {
      return;
    }

    try {
      await deletePlaylistMutation.mutateAsync(playlistId);
    } catch (error: any) {
      console.error('Error deleting playlist:', error);
      alert('Error al eliminar la playlist');
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

  return (
    <div className={styles.playlistsPage}>
      <Sidebar />

      <main className={styles.playlistsPage__main}>
        <Header />

        <div className={styles.playlistsPage__content}>
          {/* Header Section */}
          <div className={styles.playlistsPage__header}>
            <div className={styles.playlistsPage__headerLeft}>
              <h1 className={styles.playlistsPage__title}>Mis Playlists</h1>
              <p className={styles.playlistsPage__subtitle}>
                {playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => setShowCreateForm(!showCreateForm)}
              disabled={createPlaylistMutation.isPending}
            >
              <Plus size={20} />
              Nueva Playlist
            </Button>
          </div>

          {/* Create Playlist Form */}
          {showCreateForm && (
            <div className={styles.playlistsPage__createForm}>
              <form onSubmit={handleCreatePlaylist}>
                <input
                  type="text"
                  className={styles.playlistsPage__input}
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="Nombre de la playlist..."
                  autoFocus
                />
                <div className={styles.playlistsPage__formActions}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewPlaylistName('');
                      setError('');
                    }}
                    disabled={createPlaylistMutation.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={createPlaylistMutation.isPending}
                  >
                    {createPlaylistMutation.isPending ? 'Creando...' : 'Crear'}
                  </Button>
                </div>
                {error && <p className={styles.playlistsPage__error}>{error}</p>}
              </form>
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
            <div className={styles.playlistsPage__grid}>
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  className={styles.playlistCard}
                  onClick={() => setLocation(`/playlists/${playlist.id}`)}
                >
                  <div className={styles.playlistCard__cover}>
                    {playlist.coverImageUrl ? (
                      <img src={playlist.coverImageUrl} alt={playlist.name} />
                    ) : (
                      <div className={styles.playlistCard__coverPlaceholder}>
                        <Music size={48} />
                      </div>
                    )}
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
                        // TODO: Implement edit
                        console.log('Edit playlist:', playlist.id);
                      }}
                      title="Editar playlist"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className={styles.playlistCard__actionButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlaylist(playlist.id, playlist.name);
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
          )}
        </div>
      </main>
    </div>
  );
}
