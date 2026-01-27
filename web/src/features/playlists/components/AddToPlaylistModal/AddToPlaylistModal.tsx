import { useState } from 'react';
import { ListPlus, Plus, X, Loader2, Music } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { usePlaylists, useCreatePlaylist, useAddTrackToPlaylist } from '../../hooks/usePlaylists';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import { PlaylistCoverMosaic } from '../PlaylistCoverMosaic/PlaylistCoverMosaic';
import type { Track } from '@features/home/types';
import styles from './AddToPlaylistModal.module.css';

interface AddToPlaylistModalProps {
  track: Track;
  onClose: () => void;
}

export function AddToPlaylistModal({ track, onClose }: AddToPlaylistModalProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [error, setError] = useState('');

  const { data: playlistsData, isLoading: loadingPlaylists } = usePlaylists();
  const createPlaylistMutation = useCreatePlaylist();
  const addTrackMutation = useAddTrackToPlaylist();

  const handleAddToPlaylist = async (playlistId: string) => {
    try {
      await addTrackMutation.mutateAsync({
        playlistId,
        dto: { trackId: track.id },
      });
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error al agregar la canción'));
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPlaylistName.trim()) {
      setError('El nombre de la playlist es obligatorio');
      return;
    }

    try {
      const newPlaylist = await createPlaylistMutation.mutateAsync({
        name: newPlaylistName.trim(),
        public: false,
      });

      await addTrackMutation.mutateAsync({
        playlistId: newPlaylist.id,
        dto: { trackId: track.id },
      });

      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error al crear la playlist'));
      setTimeout(() => setError(''), 3000);
    }
  };

  const playlists = playlistsData?.items || [];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.iconContainer}>
              <ListPlus size={24} />
            </div>
            <div>
              <h2 className={styles.title}>Agregar a playlist</h2>
              <p className={styles.subtitle}>{track.title}</p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Error message */}
        {error && <div className={styles.errorBox}>{error}</div>}

        {/* Create new playlist form */}
        {showCreateForm ? (
          <form onSubmit={handleCreateAndAdd} className={styles.createForm}>
            <input
              type="text"
              className={styles.input}
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="Nombre de la playlist..."
              autoFocus
            />
            <div className={styles.createActions}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewPlaylistName('');
                }}
                disabled={createPlaylistMutation.isPending || addTrackMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={createPlaylistMutation.isPending || addTrackMutation.isPending}
              >
                {createPlaylistMutation.isPending || addTrackMutation.isPending ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} />
                    Creando...
                  </>
                ) : (
                  'Crear y agregar'
                )}
              </Button>
            </div>
          </form>
        ) : (
          <>
            {/* Create new playlist button */}
            <button
              className={styles.createButton}
              onClick={() => setShowCreateForm(true)}
              disabled={addTrackMutation.isPending}
            >
              <Plus size={20} />
              <span>Crear nueva playlist</span>
            </button>

            {/* Playlists list */}
            <div className={styles.playlistsList}>
              {loadingPlaylists ? (
                <div className={styles.loading}>
                  <Loader2 size={24} className={styles.spinner} />
                  <span>Cargando playlists...</span>
                </div>
              ) : playlists.length === 0 ? (
                <div className={styles.emptyState}>
                  <Music size={48} />
                  <p>No tienes playlists todavía</p>
                  <p className={styles.emptyHint}>Crea una para empezar</p>
                </div>
              ) : (
                playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    className={styles.playlistItem}
                    onClick={() => handleAddToPlaylist(playlist.id)}
                    disabled={addTrackMutation.isPending}
                  >
                    <div className={styles.playlistCover}>
                      <PlaylistCoverMosaic
                        albumIds={playlist.albumIds || []}
                        playlistName={playlist.name}
                      />
                    </div>
                    <div className={styles.playlistInfo}>
                      <p className={styles.playlistName}>{playlist.name}</p>
                      <p className={styles.playlistMeta}>
                        {playlist.songCount} {playlist.songCount === 1 ? 'canción' : 'canciones'}
                      </p>
                    </div>
                    {addTrackMutation.isPending && (
                      <Loader2 size={16} className={styles.spinner} />
                    )}
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
