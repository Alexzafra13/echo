import { useState, useEffect } from 'react';
import { Plus, Music, Trash2, Edit2, Search, X, ListMusic, Disc3, Check, Play, Clock } from 'lucide-react';
import { useLocation, useSearch } from 'wouter';
import { Sidebar } from '@features/home/components';
import { useGridDimensions } from '@features/home/hooks';
import { Header } from '@shared/components/layout/Header';
import { Button, Pagination } from '@shared/components/ui';
import { formatDuration } from '@shared/utils/format';
import { usePlaylists, useDeletePlaylist, useCreatePlaylist, useUpdatePlaylist, useAddTrackToPlaylist } from '../../hooks/usePlaylists';
import { useDjSessions, useDeleteDjSession, useCreateDjSession } from '@features/dj/hooks/useDjSessions';
import { PlaylistCoverMosaic, CreatePlaylistModal, DeletePlaylistModal, EditPlaylistModal } from '../../components';
import { Playlist, UpdatePlaylistDto } from '../../types';
import { logger } from '@shared/utils/logger';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import { usePlayer } from '@features/player';
import styles from './PlaylistsPage.module.css';

type PlaylistMode = 'playlists' | 'dj';

/**
 * PlaylistsPage Component
 * Displays user's playlists and DJ sessions with tab navigation
 */
export default function PlaylistsPage() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const modeParam = searchParams.get('mode');

  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateDjModal, setShowCreateDjModal] = useState(false);
  const [deletePlaylistId, setDeletePlaylistId] = useState<string | null>(null);
  const [deletePlaylistName, setDeletePlaylistName] = useState('');
  const [deleteDjSessionId, setDeleteDjSessionId] = useState<string | null>(null);
  const [deleteDjSessionName, setDeleteDjSessionName] = useState('');
  const [editPlaylist, setEditPlaylist] = useState<Playlist | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [playlistMode, setPlaylistMode] = useState<PlaylistMode>(
    modeParam === 'dj' ? 'dj' : 'playlists'
  );

  const { playQueue } = usePlayer();

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

  // DJ Sessions hooks
  const { data: djSessionsData, isLoading: isDjLoading } = useDjSessions();
  const deleteDjSessionMutation = useDeleteDjSession();
  const createDjSessionMutation = useCreateDjSession();
  const djSessions = djSessionsData?.sessions || [];

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

  // Reset to first page when itemsPerPage or mode changes
  useEffect(() => {
    setPage(1);
  }, [itemsPerPage, playlistMode]);

  // Update URL when mode changes
  const handleModeChange = (mode: PlaylistMode) => {
    setPlaylistMode(mode);
    setSearchQuery('');
    if (mode === 'dj') {
      setLocation('/playlists?mode=dj');
    } else {
      setLocation('/playlists');
    }
  };

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

  const handleCreateDjSession = async (name: string, trackIds: string[]) => {
    // Create the DJ session with tracks
    await createDjSessionMutation.mutateAsync({
      name,
      trackIds,
    });
  };

  const handleDeleteClick = (playlistId: string, playlistName: string) => {
    setDeletePlaylistId(playlistId);
    setDeletePlaylistName(playlistName);
  };

  const handleDeleteConfirm = async () => {
    if (!deletePlaylistId) return;

    try {
      await deletePlaylistMutation.mutateAsync(deletePlaylistId);
    } catch (err) {
      if (import.meta.env.DEV) {
        logger.error('Error deleting playlist:', err);
      }
      alert(getApiErrorMessage(err, 'Error al eliminar la playlist'));
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
            <h1 className={styles.playlistsPage__title}>
              {playlistMode === 'playlists' ? 'Mis Playlists' : 'Sesiones DJ'}
            </h1>
            <p className={styles.playlistsPage__subtitle}>
              {playlistMode === 'playlists'
                ? `${total} ${total === 1 ? 'playlist' : 'playlists'}`
                : 'Crea sesiones con mezcla armónica automática'
              }
            </p>
            {playlistMode === 'playlists' && (
              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={20} />
                Nueva Playlist
              </Button>
            )}
          </div>

          {/* Source Tabs */}
          <div className={styles.playlistsPage__sourceTabs}>
            <div
              className={`${styles.playlistsPage__sourceIndicator} ${
                playlistMode === 'dj' ? styles['playlistsPage__sourceIndicator--dj'] : ''
              }`}
            />
            <button
              className={`${styles.playlistsPage__sourceTab} ${
                playlistMode === 'playlists' ? styles['playlistsPage__sourceTab--active'] : ''
              }`}
              onClick={() => handleModeChange('playlists')}
            >
              <ListMusic size={18} />
              <span>Playlists</span>
            </button>
            <button
              className={`${styles.playlistsPage__sourceTab} ${
                playlistMode === 'dj' ? styles['playlistsPage__sourceTab--active'] : ''
              }`}
              onClick={() => handleModeChange('dj')}
            >
              <Disc3 size={18} />
              <span>Sesiones DJ</span>
            </button>
          </div>

          {/* Playlists Content */}
          {playlistMode === 'playlists' && (
            <>
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
            </>
          )}

          {/* DJ Sessions Content */}
          {playlistMode === 'dj' && (
            <>
              {isDjLoading ? (
                <div className={styles.playlistsPage__loading}>
                  <p>Cargando sesiones DJ...</p>
                </div>
              ) : djSessions.length === 0 ? (
                <div className={styles.playlistsPage__djEmptyState}>
                  <div className={styles.playlistsPage__djIcon}>
                    <Disc3 size={40} />
                  </div>
                  <h2 className={styles.playlistsPage__djTitle}>Sesiones DJ</h2>
                  <p className={styles.playlistsPage__djDescription}>
                    Crea sesiones que se ordenan automáticamente para lograr mezclas armónicas perfectas
                  </p>
                  <div className={styles.playlistsPage__djFeatures}>
                    <div className={styles.playlistsPage__djFeature}>
                      <Check size={16} />
                      <span>Ordenación automática por compatibilidad armónica</span>
                    </div>
                    <div className={styles.playlistsPage__djFeature}>
                      <Check size={16} />
                      <span>Análisis de BPM, tonalidad y energía</span>
                    </div>
                    <div className={styles.playlistsPage__djFeature}>
                      <Check size={16} />
                      <span>Sugerencias de transiciones suaves</span>
                    </div>
                  </div>
                  <button
                    className={styles.playlistsPage__djButton}
                    onClick={() => setShowCreateDjModal(true)}
                  >
                    <Plus size={20} />
                    Crear Sesión DJ
                  </button>
                </div>
              ) : (
                <div className={styles.playlistsPage__gridWrapper}>
                  <div className={styles.playlistsPage__djHeader}>
                    <Button
                      variant="primary"
                      onClick={() => setShowCreateDjModal(true)}
                    >
                      <Plus size={20} />
                      Nueva Sesión DJ
                    </Button>
                  </div>
                  <div className={styles.playlistsPage__grid}>
                    {djSessions.map((session) => (
                      <div
                        key={session.id}
                        className={styles.djSessionCard}
                        onClick={() => {
                          // Play the session directly when clicking on the card
                          if (session.tracks.length > 0) {
                            const playerTracks = session.tracks.map(t => ({
                              id: t.trackId,
                              title: t.title || 'Unknown',
                              artist: t.artist || 'Unknown',
                              albumId: t.albumId,
                              duration: t.duration,
                              coverImage: t.albumId ? `/api/images/albums/${t.albumId}/cover` : undefined,
                            }));
                            playQueue(playerTracks, 0);
                          }
                        }}
                      >
                        <div className={styles.djSessionCard__cover}>
                          <Disc3 size={48} />
                        </div>

                        <div className={styles.djSessionCard__info}>
                          <h3 className={styles.djSessionCard__title}>{session.name}</h3>
                          <div className={styles.djSessionCard__meta}>
                            <span>
                              {session.trackCount} {session.trackCount === 1 ? 'track' : 'tracks'}
                            </span>
                            {session.totalDuration && session.totalDuration > 0 && (
                              <>
                                <span className={styles.djSessionCard__separator}>•</span>
                                <Clock size={12} />
                                <span>{formatDuration(session.totalDuration)}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className={styles.djSessionCard__actions}>
                          <button
                            className={styles.djSessionCard__playButton}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (session.tracks.length > 0) {
                                const playerTracks = session.tracks.map(t => ({
                                  id: t.trackId,
                                  title: t.title || 'Unknown',
                                  artist: t.artist || 'Unknown',
                                  albumId: t.albumId,
                                  duration: t.duration,
                                  coverImage: t.albumId ? `/api/images/albums/${t.albumId}/cover` : undefined,
                                }));
                                playQueue(playerTracks, 0);
                              }
                            }}
                            title="Reproducir sesión"
                          >
                            <Play size={16} fill="currentColor" />
                          </button>
                          <button
                            className={styles.djSessionCard__actionButton}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteDjSessionId(session.id);
                              setDeleteDjSessionName(session.name);
                            }}
                            title="Eliminar sesión"
                            disabled={deleteDjSessionMutation.isPending}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
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

      {/* Delete DJ Session Modal */}
      {deleteDjSessionId && (
        <DeletePlaylistModal
          playlistName={deleteDjSessionName}
          onClose={() => {
            setDeleteDjSessionId(null);
            setDeleteDjSessionName('');
          }}
          onConfirm={async () => {
            try {
              await deleteDjSessionMutation.mutateAsync(deleteDjSessionId);
              setDeleteDjSessionId(null);
              setDeleteDjSessionName('');
            } catch (err) {
              if (import.meta.env.DEV) {
                logger.error('Error deleting DJ session:', err);
              }
              alert(getApiErrorMessage(err, 'Error al eliminar la sesión DJ'));
            }
          }}
          isLoading={deleteDjSessionMutation.isPending}
        />
      )}

      {/* Create DJ Session Modal */}
      {showCreateDjModal && (
        <CreatePlaylistModal
          onClose={() => setShowCreateDjModal(false)}
          onSubmit={handleCreateDjSession}
          isLoading={createDjSessionMutation.isPending}
          isDjSession={true}
        />
      )}
    </div>
  );
}
