import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Waves, RefreshCw, Sparkles, Search, X, Calendar, Music } from 'lucide-react';
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
 * Muestra una cuadrícula de playlists auto-generadas (Wave Mix + playlists de artista)
 */
export function WaveMixPage() {
  const [, setLocation] = useLocation();
  const user = useAuthStore((state) => state.user);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Recopilar URLs únicas de portadas de álbum en dos filas para el mosaico animado.
  // Limitado a MAX_HERO_COVERS para no descargar docenas de imágenes grandes
  // para miniaturas de ~127px del mosaico de fondo.
  const heroCoverRows = useMemo(() => {
    const MAX_HERO_COVERS = 40; // 20 per row is plenty for a seamless loop
    const albumIds = new Set<string>();
    const urls: string[] = [];
    const allPlaylists = [...dailyPlaylists, ...artistPlaylists, ...genrePlaylists];
    for (const playlist of allPlaylists) {
      if (urls.length >= MAX_HERO_COVERS) break;
      for (const scoredTrack of playlist.tracks || []) {
        const albumId = scoredTrack.track?.albumId;
        if (albumId && !albumIds.has(albumId)) {
          albumIds.add(albumId);
          urls.push(`/api/images/albums/${albumId}/cover?size=thumb`);
          if (urls.length >= MAX_HERO_COVERS) break;
        }
      }
    }
    // Se necesitan al menos 8 portadas (4 por fila) para un mosaico decente
    if (urls.length < 8) return { row1: [], row2: [] };
    const mid = Math.ceil(urls.length / 2);
    return { row1: urls.slice(0, mid), row2: urls.slice(mid) };
  }, [dailyPlaylists, artistPlaylists, genrePlaylists]);

  const { itemsPerPage: gridItems, columns } = useGridDimensions({
    maxRows: 2,
    headerHeight: 450,
  });
  // En móvil usar mínimo 12 para scroll horizontal; en desktop usar conteo exacto del grid
  const neededItems = isMobile ? Math.max(gridItems, 12) : gridItems;

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
          <div className={`${styles.hero} ${heroCoverRows.row1.length === 0 ? styles['hero--fallback'] : ''}`}>
            {/* Animated cover art mosaic — two rows scrolling opposite directions */}
            {(heroCoverRows.row1.length > 0 || heroCoverRows.row2.length > 0) && (
              <div className={styles.hero__mosaic}>
                <div className={styles.hero__row}>
                  <div className={styles.hero__track} data-direction="left">
                    {/* Double for seamless loop — 50% translate keeps it gap-free */}
                    {[...heroCoverRows.row1, ...heroCoverRows.row1].map((url, i) => (
                      <img key={i} src={url} alt="" className={styles.hero__coverImg} loading="eager" decoding="async" fetchPriority="low" />
                    ))}
                  </div>
                </div>
                <div className={styles.hero__row}>
                  <div className={styles.hero__track} data-direction="right">
                    {[...heroCoverRows.row2, ...heroCoverRows.row2].map((url, i) => (
                      <img key={i} src={url} alt="" className={styles.hero__coverImg} loading="eager" decoding="async" fetchPriority="low" />
                    ))}
                  </div>
                </div>
              </div>
            )}
            {/* Fade overlay for text readability */}
            <div className={styles.hero__fade} />

            {/* Content pinned bottom-left */}
            <div className={styles.hero__content}>
              <div className={styles.hero__info}>
                <h1 className={styles.hero__title}>Wave Mix</h1>
                <p className={styles.hero__subtitle}>
                  Tu música, mezclada para{' '}
                  <span className={styles.hero__username}>
                    {user?.name || user?.username || 'ti'}
                  </span>
                </p>
              </div>

              <div className={styles.hero__right}>
                {playlists.length > 0 && (
                  <div className={styles.hero__stats}>
                    <div className={styles.hero__stat}>
                      <Music size={16} />
                      <span className={styles.hero__statValue}>{playlists.reduce((acc, p) => acc + (p.metadata.totalTracks || 0), 0)}</span>
                      <span className={styles.hero__statLabel}>canciones</span>
                    </div>
                    <div className={styles.hero__statDivider} />
                    <div className={styles.hero__stat}>
                      <Sparkles size={16} />
                      <span className={styles.hero__statValue}>{artistPlaylists.length}</span>
                      <span className={styles.hero__statLabel}>artistas</span>
                    </div>
                    <div className={styles.hero__statDivider} />
                    <div className={styles.hero__stat}>
                      <Waves size={16} />
                      <span className={styles.hero__statValue}>{genrePlaylists.length}</span>
                      <span className={styles.hero__statLabel}>géneros</span>
                    </div>
                  </div>
                )}
                <Button
                  variant="secondary"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className={styles.hero__refreshBtn}
                >
                  <RefreshCw size={16} className={isLoading ? styles.spinning : ''} />
                  <span className={styles.hero__refreshBtnText}>
                    {isLoading ? 'Actualizando...' : 'Actualizar'}
                  </span>
                </Button>
              </div>
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
