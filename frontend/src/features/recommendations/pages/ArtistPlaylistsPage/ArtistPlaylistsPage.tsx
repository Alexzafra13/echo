import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Mic2, RefreshCw, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { Sidebar } from '@features/home/components';
import { Header } from '@shared/components/layout/Header';
import { Button } from '@shared/components/ui';
import { PlaylistCover } from '../../components/PlaylistCover';
import { getArtistPlaylistsPaginated, type AutoPlaylist } from '@shared/services/recommendations.service';
import { useAuthStore } from '@shared/store';
import styles from './ArtistPlaylistsPage.module.css';

/**
 * ArtistPlaylistsPage Component
 * Displays paginated grid of artist-based playlists
 */
export function ArtistPlaylistsPage() {
  const [, setLocation] = useLocation();
  const user = useAuthStore((state) => state.user);

  const [playlists, setPlaylists] = useState<AutoPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const ITEMS_PER_PAGE = 12;

  const loadPlaylists = async (page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const skip = (page - 1) * ITEMS_PER_PAGE;
      const data = await getArtistPlaylistsPaginated(skip, ITEMS_PER_PAGE);

      setPlaylists(data.playlists);
      setTotal(data.total);
      setHasMore(data.hasMore);
      setCurrentPage(page);
    } catch (err: any) {
      console.error('[ArtistPlaylists] Failed to load:', err);
      setError(err.response?.data?.message || 'Error al cargar las playlists de artistas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlaylists(1);
  }, []);

  const handlePlaylistClick = (playlist: AutoPlaylist) => {
    sessionStorage.setItem('currentPlaylist', JSON.stringify(playlist));
    setLocation(`/wave-mix/${playlist.id}`);
  };

  const handlePageChange = (newPage: number) => {
    loadPlaylists(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className={styles.artistPlaylistsPage}>
      <Sidebar />

      <main className={styles.artistPlaylistsPage__main}>
        <Header />

        <div className={styles.artistPlaylistsPage__content}>
          {/* Hero Section */}
          <div className={styles.artistPlaylistsPage__hero}>
            <div className={styles.artistPlaylistsPage__heroIcon}>
              <Mic2 size={48} />
            </div>
            <div className={styles.artistPlaylistsPage__heroText}>
              <h1 className={styles.artistPlaylistsPage__heroTitle}>
                Playlists de Artistas
              </h1>
              <p className={styles.artistPlaylistsPage__heroDescription}>
                Lo mejor de tus artistas favoritos, {user?.name || user?.username || 'personalizado para ti'}
              </p>
              {total > 0 && (
                <p className={styles.artistPlaylistsPage__heroMeta}>
                  {total} {total === 1 ? 'artista' : 'artistas'} encontrados
                </p>
              )}
            </div>
            <Button
              variant="secondary"
              onClick={() => loadPlaylists(currentPage)}
              disabled={isLoading}
              className={styles.artistPlaylistsPage__refreshButton}
            >
              <RefreshCw size={18} className={isLoading ? styles.spinning : ''} />
              Actualizar
            </Button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className={styles.artistPlaylistsPage__loading}>
              <div className={styles.artistPlaylistsPage__loadingSpinner}>
                <Sparkles size={48} className={styles.spinning} />
              </div>
              <p>Cargando playlists de artistas...</p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className={styles.artistPlaylistsPage__error}>
              <p>{error}</p>
              <Button variant="secondary" onClick={() => loadPlaylists(currentPage)}>
                Intentar de nuevo
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && playlists.length === 0 && (
            <div className={styles.artistPlaylistsPage__emptyState}>
              <Mic2 size={64} />
              <h2>No hay playlists de artistas aún</h2>
              <p>
                Empieza a escuchar música de diferentes artistas para que
                podamos generar playlists personalizadas
              </p>
            </div>
          )}

          {/* Playlists Grid */}
          {!isLoading && !error && playlists.length > 0 && (
            <>
              <div className={styles.artistPlaylistsPage__grid}>
                {playlists.map((playlist) => (
                  <div
                    key={playlist.id}
                    className={styles.playlistCard}
                    onClick={() => handlePlaylistClick(playlist)}
                  >
                    <PlaylistCover
                      type={playlist.type}
                      name={playlist.name}
                      coverColor={playlist.coverColor}
                      coverImageUrl={playlist.coverImageUrl}
                      artistName={playlist.metadata.artistName}
                      size="large"
                    />
                    <div className={styles.playlistCard__info}>
                      <h3 className={styles.playlistCard__name}>{playlist.name}</h3>
                      <p className={styles.playlistCard__description}>
                        {playlist.description}
                      </p>
                      <div className={styles.playlistCard__meta}>
                        <span>{playlist.metadata.totalTracks} canciones</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className={styles.artistPlaylistsPage__pagination}>
                  <Button
                    variant="secondary"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={styles.paginationButton}
                  >
                    <ChevronLeft size={20} />
                    Anterior
                  </Button>

                  <div className={styles.paginationInfo}>
                    Página {currentPage} de {totalPages}
                  </div>

                  <Button
                    variant="secondary"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!hasMore}
                    className={styles.paginationButton}
                  >
                    Siguiente
                    <ChevronRight size={20} />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
