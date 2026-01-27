import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { RefreshCw, Sparkles, Search, X, ArrowLeft, Mic2 } from 'lucide-react';
import { Sidebar } from '@features/home/components';
import { Header } from '@shared/components/layout/Header';
import { Button, Pagination } from '@shared/components/ui';
import { PlaylistCover } from '../../components/PlaylistCover';
import { getArtistPlaylistsPaginated, type AutoPlaylist } from '@shared/services/recommendations.service';
import { useAuthStore } from '@shared/store';
import { logger } from '@shared/utils/logger';
import { safeSessionStorage } from '@shared/utils/safeSessionStorage';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import styles from './ArtistPlaylistsPage.module.css';

/**
 * ArtistPlaylistsPage Component
 * Displays paginated grid of artist-based playlists
 */
export function ArtistPlaylistsPage() {
  const [, setLocation] = useLocation();
  const user = useAuthStore((state) => state.user);

  const [playlists, setPlaylists] = useState<AutoPlaylist[]>([]);
  const [allPlaylists, setAllPlaylists] = useState<AutoPlaylist[]>([]); // Store all playlists for search
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const ITEMS_PER_PAGE = 12;

  const loadPlaylists = async (page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const skip = (page - 1) * ITEMS_PER_PAGE;
      const data = await getArtistPlaylistsPaginated(skip, ITEMS_PER_PAGE);

      setPlaylists(data.playlists);
      setAllPlaylists(data.playlists);
      setTotal(data.total);
      setCurrentPage(page);
    } catch (err) {
      logger.error('[ArtistPlaylists] Failed to load:', err);
      setError(getApiErrorMessage(err, 'Error al cargar las playlists de artistas'));
    } finally {
      setIsLoading(false);
    }
  };

  // Filter playlists based on search query
  const filteredPlaylists = searchQuery.trim()
    ? allPlaylists.filter(playlist =>
        playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        playlist.metadata.artistName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : playlists;

  useEffect(() => {
    loadPlaylists(1);
  }, []);

  const handlePlaylistClick = (playlist: AutoPlaylist) => {
    safeSessionStorage.setItem('currentPlaylist', JSON.stringify(playlist));
    safeSessionStorage.setItem('playlistReturnPath', '/artist-playlists');
    setLocation(`/wave-mix/${playlist.id}`);
  };

  const handlePageChange = (newPage: number) => {
    loadPlaylists(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setLocation('/wave-mix');
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className={styles.artistPlaylistsPage}>
      <Sidebar />

      <main className={styles.artistPlaylistsPage__main}>
        <Header
          customSearch={
            <div className={styles.artistPlaylistsPage__searchForm}>
              <div className={styles.artistPlaylistsPage__searchWrapper}>
                <Search size={20} className={styles.artistPlaylistsPage__searchIcon} />
                <input
                  type="text"
                  placeholder="Buscar playlists de artistas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.artistPlaylistsPage__searchInput}
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className={styles.artistPlaylistsPage__searchClearButton}
                    aria-label="Limpiar búsqueda"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          }
        />

        <div className={styles.artistPlaylistsPage__content}>
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={handleBack}
            className={styles.backButton}
          >
            <ArrowLeft size={20} />
            Volver
          </Button>

          {/* Hero Section */}
          <div className={styles.artistPlaylistsPage__hero}>
            <div className={styles.artistPlaylistsPage__heroContent}>
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

          {/* Top Pagination - Mobile Only */}
          {!isLoading && !error && playlists.length > 0 && totalPages > 1 && (
            <div className={styles.artistPlaylistsPage__paginationTop}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                disabled={isLoading}
              />
            </div>
          )}

          {/* Playlists Grid */}
          {!isLoading && !error && filteredPlaylists.length > 0 && (
            <div className={styles.artistPlaylistsPage__gridWrapper}>
              <div className={styles.artistPlaylistsPage__grid}>
                {filteredPlaylists.map((playlist) => (
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
                      size="responsive"
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
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                disabled={isLoading}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
