import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Waves, RefreshCw, Sparkles, Search, X } from 'lucide-react';
import { Sidebar } from '@features/home/components';
import { Header } from '@shared/components/layout/Header';
import { Button } from '@shared/components/ui';
import { PlaylistCover } from '../../components/PlaylistCover';
import { getAutoPlaylists, refreshWaveMix, type AutoPlaylist } from '@shared/services/recommendations.service';
import { useAuthStore } from '@shared/store';
import { useGridDimensions } from '@features/home/hooks';
import { logger } from '@shared/utils/logger';
import styles from './WaveMixPage.module.css';

/**
 * WaveMixPage Component
 * Displays a grid of auto-generated playlists (Wave Mix + Artist playlists)
 */
export function WaveMixPage() {
  const [, setLocation] = useLocation();
  const user = useAuthStore((state) => state.user);
  const [playlists, setPlaylists] = useState<AutoPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate items for 2 rows based on screen size (same as HomePage)
  const { itemsPerPage: neededItems } = useGridDimensions({
    maxRows: 2,
    headerHeight: 450,
  });

  const loadPlaylists = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAutoPlaylists();
      logger.debug('[WaveMix] Received playlists:', data);
      setPlaylists(data);
    } catch (err: any) {
      logger.error('[WaveMix] Failed to load:', err);
      setError(err.response?.data?.message || 'Error al cargar las playlists');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlaylists();
  }, []);

  const handlePlaylistClick = (playlist: AutoPlaylist) => {
    // Navigate to individual playlist page with state
    // Note: wouter doesn't support state in navigation, so we'll store in sessionStorage
    sessionStorage.setItem('currentPlaylist', JSON.stringify(playlist));
    sessionStorage.setItem('playlistReturnPath', '/wave-mix');
    setLocation(`/wave-mix/${playlist.id}`);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await refreshWaveMix();
      logger.debug('[WaveMix] Playlists refreshed:', data);
      setPlaylists(data);
    } catch (err: any) {
      logger.error('[WaveMix] Failed to refresh:', err);
      setError(err.response?.data?.message || 'Error al actualizar las playlists');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter playlists based on search query
  const filteredPlaylists = searchQuery.trim()
    ? playlists.filter(playlist =>
        playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        playlist.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        playlist.metadata.artistName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : playlists;

  // Separate playlists by type
  const dailyPlaylists = filteredPlaylists.filter(p => p.type === 'wave-mix');
  const artistPlaylists = filteredPlaylists.filter(p => p.type === 'artist');
  const genrePlaylists = filteredPlaylists.filter(p => p.type === 'genre');

  return (
    <div className={styles.waveMixPage}>
      <Sidebar />

      <main className={styles.waveMixPage__main}>
        <Header
          customSearch={
            <div className={styles.waveMixPage__searchForm}>
              <div className={styles.waveMixPage__searchWrapper}>
                <Search size={20} className={styles.waveMixPage__searchIcon} />
                <input
                  type="text"
                  placeholder="Buscar playlists de Wave Mix..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.waveMixPage__searchInput}
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className={styles.waveMixPage__searchClearButton}
                    aria-label="Limpiar búsqueda"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          }
        />

        <div className={styles.waveMixPage__content}>
          {/* Hero Section */}
          <div className={styles.waveMixPage__hero}>
            <div className={styles.waveMixPage__heroContent}>
              <h1 className={styles.waveMixPage__heroTitle}>Wave Mix</h1>
              <p className={styles.waveMixPage__heroDescription}>
                Recomendaciones personalizadas para {user?.name || user?.username || 'ti'}
              </p>
              <Button
                variant="secondary"
                onClick={handleRefresh}
                disabled={isLoading}
                className={styles.waveMixPage__refreshButton}
              >
                <RefreshCw size={18} className={isLoading ? styles.spinning : ''} />
                {isLoading ? 'Actualizando...' : 'Actualizar'}
              </Button>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className={styles.waveMixPage__loading}>
              <div className={styles.waveMixPage__loadingSpinner}>
                <Sparkles size={48} className={styles.spinning} />
              </div>
              <p>Generando tus playlists personalizadas...</p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className={styles.waveMixPage__error}>
              <p>{error}</p>
              <Button variant="secondary" onClick={handleRefresh}>
                Intentar de nuevo
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && playlists.length === 0 && (
            <div className={styles.waveMixPage__emptyState}>
              <Waves size={64} />
              <h2>Aún no hay playlists</h2>
              <p>
                Empieza a escuchar música para que podamos generar
                playlists personalizadas para ti
              </p>
            </div>
          )}

          {/* Playlists Sections */}
          {!isLoading && !error && playlists.length > 0 && (
            <>
              {/* Daily Recommendations Section */}
              {dailyPlaylists.length > 0 && (
                <div className={styles.waveMixPage__section}>
                  <h2 className={styles.waveMixPage__sectionTitle}>Recomendaciones Diarias</h2>
                  <div className={styles.waveMixPage__grid}>
                    {dailyPlaylists.map((playlist) => (
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
                            <span className={styles.separator}>•</span>
                            <span>Actualizado hoy</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Artist Recommendations Section */}
              {artistPlaylists.length > 0 && (
                <div className={styles.waveMixPage__section}>
                  <h2 className={styles.waveMixPage__sectionTitle}>Recomendaciones por Artista</h2>
                  <div className={styles.waveMixPage__viewAllButtonWrapper}>
                    <button
                      onClick={() => setLocation('/artist-playlists')}
                      className={styles.waveMixPage__viewAllButton}
                    >
                      Ver todas →
                    </button>
                  </div>
                  <div className={styles.waveMixPage__grid}>
                    {artistPlaylists.slice(0, neededItems).map((playlist) => (
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
                </div>
              )}

              {/* Genre Recommendations Section */}
              {genrePlaylists.length > 0 && (
                <div className={styles.waveMixPage__section}>
                  <h2 className={styles.waveMixPage__sectionTitle}>Recomendaciones por Género</h2>
                  <div className={styles.waveMixPage__viewAllButtonWrapper}>
                    <button
                      onClick={() => setLocation('/genre-playlists')}
                      className={styles.waveMixPage__viewAllButton}
                    >
                      Ver todas →
                    </button>
                  </div>
                  <div className={styles.waveMixPage__grid}>
                    {genrePlaylists.slice(0, neededItems).map((playlist) => (
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
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
