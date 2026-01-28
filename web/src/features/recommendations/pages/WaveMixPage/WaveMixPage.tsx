import { useLocation } from 'wouter';
import { Waves, RefreshCw, Sparkles, Search, X, Calendar } from 'lucide-react';
import { Sidebar } from '@features/home/components';
import { Header } from '@shared/components/layout/Header';
import { Button } from '@shared/components/ui';
import { ActionCard } from '@shared/components/ActionCard';
import { PlaylistCover } from '../../components/PlaylistCover';
import { useAuthStore } from '@shared/store';
import { useGridDimensions } from '@features/home/hooks';
import { useWaveMixPlaylists, getPlaylistCoverUrl } from './useWaveMixPlaylists';
import styles from './WaveMixPage.module.css';

/**
 * WaveMixPage Component
 * Displays a grid of auto-generated playlists (Wave Mix + Artist playlists)
 */
export function WaveMixPage() {
  const [, setLocation] = useLocation();
  const user = useAuthStore((state) => state.user);

  const {
    playlists,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    clearSearch,
    dailyPlaylists,
    artistPlaylists,
    genrePlaylists,
    handleRefresh,
    handlePlaylistClick,
  } = useWaveMixPlaylists();

  const { itemsPerPage: gridItems, columns } = useGridDimensions({
    maxRows: 2,
    headerHeight: 450,
  });
  const neededItems = Math.max(gridItems, 10);

  const getPlaceholdersCount = (itemsCount: number): number => {
    if (columns <= 0) return 0;
    const itemsInLastRow = itemsCount % columns;
    if (itemsInLastRow === 0) return 0;
    return columns - itemsInLastRow;
  };

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
                    onClick={clearSearch}
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
                Empieza a escuchar música para que podamos generar playlists personalizadas para ti
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
                  <div className={styles.waveMixPage__dailyCards}>
                    {dailyPlaylists.map((playlist) => (
                      <ActionCard
                        key={playlist.id}
                        icon={<Calendar size={22} />}
                        title={playlist.name}
                        onClick={() => handlePlaylistClick(playlist)}
                        customGradient={['#2d1f3d', '#1a1a2e']}
                        backgroundCoverUrl={getPlaylistCoverUrl(playlist)}
                      />
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
                          <p className={styles.playlistCard__description}>{playlist.description}</p>
                          <div className={styles.playlistCard__meta}>
                            <span>{playlist.metadata.totalTracks} canciones</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {Array.from({
                      length: getPlaceholdersCount(Math.min(artistPlaylists.length, neededItems)),
                    }).map((_, idx) => (
                      <div
                        key={`placeholder-artist-${idx}`}
                        className={styles.playlistCard__placeholder}
                        aria-hidden="true"
                      />
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
                          <p className={styles.playlistCard__description}>{playlist.description}</p>
                          <div className={styles.playlistCard__meta}>
                            <span>{playlist.metadata.totalTracks} canciones</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {Array.from({
                      length: getPlaceholdersCount(Math.min(genrePlaylists.length, neededItems)),
                    }).map((_, idx) => (
                      <div
                        key={`placeholder-genre-${idx}`}
                        className={styles.playlistCard__placeholder}
                        aria-hidden="true"
                      />
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
