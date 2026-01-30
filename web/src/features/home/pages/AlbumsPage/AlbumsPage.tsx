import { useState, useEffect } from 'react';
import { useSearch, useLocation } from 'wouter';
import { Search, X, Library, Server } from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { Pagination, Select } from '@shared/components/ui';
import { Sidebar, AlbumGrid } from '../../components';
import {
  useRecentAlbums,
  useTopPlayedAlbums,
  useAlbumsAlphabetically,
  useAlbumsByArtist,
  useAlbumsRecentlyPlayed,
  useAlbumsFavorites,
} from '../../hooks/useAlbums';
import { useGridDimensions } from '../../hooks/useGridDimensions';
import { useSharedAlbums, useConnectedServers, SharedAlbumGrid } from '@features/federation';
import type { AlbumSortOption } from '../../types';
import styles from './AlbumsPage.module.css';

type LibrarySource = 'local' | 'shared';

/**
 * AlbumsPage Component
 * Shows all albums with pagination, inline search filtering and sort options
 * Supports both local library and shared libraries from connected servers
 */
export default function AlbumsPage() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const sourceParam = searchParams.get('source');

  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<AlbumSortOption>('recent');
  const [librarySource, setLibrarySource] = useState<LibrarySource>(
    sourceParam === 'shared' ? 'shared' : 'local'
  );
  const [selectedServerId, setSelectedServerId] = useState<string | undefined>();

  // Debounce search query for shared albums (to avoid excessive API calls to remote servers)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Calculate dynamic grid dimensions to fill the screen
  const { itemsPerPage } = useGridDimensions({
    headerHeight: 260, // Header + page title + filter selector height + source tabs
  });

  // Fetch connected servers for the dropdown
  const { data: connectedServers = [] } = useConnectedServers();

  // Shared albums query (uses debounced search for better performance)
  const sharedAlbumsQuery = useSharedAlbums({
    page,
    limit: itemsPerPage,
    search: debouncedSearchQuery || undefined,
    serverId: selectedServerId,
  });

  // Fetch data based on selected sort option
  const recentQuery = useRecentAlbums(itemsPerPage);
  const alphabeticalQuery = useAlbumsAlphabetically({ page, limit: itemsPerPage });
  const byArtistQuery = useAlbumsByArtist({ page, limit: itemsPerPage });
  const recentlyPlayedQuery = useAlbumsRecentlyPlayed(itemsPerPage);
  const topPlayedQuery = useTopPlayedAlbums(itemsPerPage);
  const favoritesQuery = useAlbumsFavorites({ page, limit: itemsPerPage });

  // Select the active query based on sortBy
  let activeQuery;
  let allAlbums;
  let totalPages = 1;

  switch (sortBy) {
    case 'alphabetical':
      activeQuery = alphabeticalQuery;
      allAlbums = alphabeticalQuery.data?.data || [];
      totalPages = alphabeticalQuery.data?.totalPages || 1;
      break;
    case 'artist':
      activeQuery = byArtistQuery;
      allAlbums = byArtistQuery.data?.data || [];
      totalPages = byArtistQuery.data?.totalPages || 1;
      break;
    case 'recently-played':
      activeQuery = recentlyPlayedQuery;
      allAlbums = recentlyPlayedQuery.data?.data || [];
      totalPages = 1; // No pagination for recently played
      break;
    case 'top-played':
      activeQuery = topPlayedQuery;
      allAlbums = topPlayedQuery.data || [];
      totalPages = 1; // No pagination for top played
      break;
    case 'favorites':
      activeQuery = favoritesQuery;
      allAlbums = favoritesQuery.data?.data || [];
      totalPages = favoritesQuery.data?.hasMore ? page + 1 : page; // Estimate based on hasMore
      break;
    case 'recent':
    default:
      activeQuery = recentQuery;
      allAlbums = recentQuery.data || [];
      totalPages = 1; // No pagination for recent
      break;
  }

  const isLoading = librarySource === 'local' ? activeQuery.isLoading : sharedAlbumsQuery.isLoading;
  const error = librarySource === 'local' ? activeQuery.error : sharedAlbumsQuery.error;

  // Filter albums by search query (client-side for local)
  const filteredAlbums = allAlbums.filter(album =>
    album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    album.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset to first page when sort option, itemsPerPage, source, or search changes
  useEffect(() => {
    setPage(1);
  }, [sortBy, itemsPerPage, librarySource, selectedServerId, debouncedSearchQuery]);

  // Update URL when source changes
  const handleSourceChange = (source: LibrarySource) => {
    setLibrarySource(source);
    setSearchQuery('');
    if (source === 'shared') {
      setLocation('/albums?source=shared');
    } else {
      setLocation('/albums');
    }
  };

  // Pagination handler
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Shared albums data
  const sharedAlbums = sharedAlbumsQuery.data?.albums || [];
  const sharedTotal = sharedAlbumsQuery.data?.total || 0;
  const sharedTotalPages = sharedAlbumsQuery.data?.totalPages || Math.ceil(sharedTotal / itemsPerPage) || 1;

  return (
    <div className={styles.albumsPage}>
      <Sidebar />

      <main className={styles.albumsPage__main}>
        <Header
          customSearch={
            <div className={styles.albumsPage__searchForm}>
              <div className={styles.albumsPage__searchWrapper}>
                <Search size={20} className={styles.albumsPage__searchIcon} />
                <input
                  type="text"
                  placeholder={librarySource === 'local' ? 'Buscar álbumes...' : 'Buscar en bibliotecas compartidas...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.albumsPage__searchInput}
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className={styles.albumsPage__searchClearButton}
                    aria-label="Limpiar búsqueda"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          }
        />

        <div className={styles.albumsPage__content}>
          {/* Page Header */}
          <div className={styles.albumsPage__pageHeader}>
            <h1 className={styles.albumsPage__title}>
              {librarySource === 'local' ? 'Todos los Álbumes' : 'Bibliotecas Compartidas'}
            </h1>
            <p className={styles.albumsPage__subtitle}>
              {librarySource === 'local'
                ? 'Explora tu colección completa de música'
                : 'Explora la música de tus amigos'
              }
            </p>
          </div>

          {/* Source Tabs */}
          {connectedServers.length > 0 && (
            <div className={styles.albumsPage__sourceTabs}>
              {/* Animated sliding indicator */}
              <div
                className={`${styles.albumsPage__sourceIndicator} ${
                  librarySource === 'shared' ? styles['albumsPage__sourceIndicator--shared'] : ''
                }`}
              />
              <button
                className={`${styles.albumsPage__sourceTab} ${librarySource === 'local' ? styles['albumsPage__sourceTab--active'] : ''}`}
                onClick={() => handleSourceChange('local')}
              >
                <Library size={18} />
                <span>Mi Biblioteca</span>
              </button>
              <button
                className={`${styles.albumsPage__sourceTab} ${librarySource === 'shared' ? styles['albumsPage__sourceTab--active'] : ''}`}
                onClick={() => handleSourceChange('shared')}
              >
                <Server size={18} />
                <span>Compartidas</span>
                <span className={styles.albumsPage__serverCount}>{connectedServers.length}</span>
              </button>
            </div>
          )}

          {/* Local Library Content */}
          {librarySource === 'local' && (
            <>
              {/* Sort Filter */}
              <Select
                label="Ordenar por:"
                value={sortBy}
                onChange={(value) => setSortBy(value as AlbumSortOption)}
                options={[
                  { value: 'recent', label: 'Añadidos recientemente' },
                  { value: 'alphabetical', label: 'Por nombre (A-Z)' },
                  { value: 'artist', label: 'Por artista (A-Z)' },
                  { value: 'recently-played', label: 'Reproducidos recientemente' },
                  { value: 'top-played', label: 'Los más reproducidos' },
                  { value: 'favorites', label: 'Mis favoritos' },
                ]}
                className={styles.albumsPage__filterWrapper}
              />

              {/* Top Pagination - Mobile Only */}
              {!isLoading && !error && filteredAlbums && filteredAlbums.length > 0 && totalPages > 1 && (
                <div className={styles.albumsPage__paginationTop}>
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    disabled={isLoading}
                  />
                </div>
              )}

              {/* Albums Grid */}
              {isLoading ? (
                <div className={styles.albumsPage__loadingState}>
                  <div className={styles.albumsPage__spinner} />
                  <p>Cargando álbumes...</p>
                </div>
              ) : error ? (
                <div className={styles.albumsPage__errorState}>
                  <p>Error al cargar los álbumes</p>
                  <button
                    onClick={() => window.location.reload()}
                    className={styles.albumsPage__retryButton}
                  >
                    Reintentar
                  </button>
                </div>
              ) : filteredAlbums && filteredAlbums.length > 0 ? (
                <div className={styles.albumsPage__gridWrapper}>
                  <AlbumGrid title="" albums={filteredAlbums} mobileLayout="grid" />

                  {/* Pagination Controls */}
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    disabled={isLoading}
                  />
                </div>
              ) : (
                <div className={styles.albumsPage__emptyState}>
                  <p>{searchQuery ? 'No se encontraron álbumes' : 'No hay álbumes en tu biblioteca'}</p>
                  {!searchQuery && (
                    <p className={styles.albumsPage__emptyHint}>
                      Agrega música a tu biblioteca para empezar
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Shared Library Content */}
          {librarySource === 'shared' && (
            <>
              {/* Server Filter - always show when there are connected servers */}
              {connectedServers.length > 0 && (
                <div className={styles.albumsPage__serverFilter}>
                  <Select
                    label="Ver biblioteca de:"
                    value={selectedServerId || ''}
                    onChange={(value) => setSelectedServerId(value || undefined)}
                    options={[
                      { value: '', label: `Todos los servidores (${connectedServers.length})` },
                      ...connectedServers.map((server) => ({
                        value: server.id,
                        label: `${server.name} (${server.remoteAlbumCount ?? '?'} álbumes)`,
                      })),
                    ]}
                    className={styles.albumsPage__filterWrapper}
                  />
                  {selectedServerId && (
                    <div className={styles.albumsPage__serverInfo}>
                      {(() => {
                        const server = connectedServers.find(s => s.id === selectedServerId);
                        return server ? (
                          <>
                            <span className={styles.albumsPage__serverStats}>
                              {server.remoteAlbumCount ?? 0} álbumes • {server.remoteTrackCount ?? 0} canciones • {server.remoteArtistCount ?? 0} artistas
                            </span>
                            <span className={`${styles.albumsPage__serverStatus} ${server.isOnline ? styles['albumsPage__serverStatus--online'] : styles['albumsPage__serverStatus--offline']}`}>
                              {server.isOnline ? 'Online' : 'Offline'}
                            </span>
                          </>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Top Pagination - Mobile Only */}
              {!isLoading && !error && sharedAlbums.length > 0 && sharedTotalPages > 1 && (
                <div className={styles.albumsPage__paginationTop}>
                  <Pagination
                    currentPage={page}
                    totalPages={sharedTotalPages}
                    onPageChange={handlePageChange}
                    disabled={isLoading}
                  />
                </div>
              )}

              {/* Shared Albums Grid */}
              {isLoading ? (
                <div className={styles.albumsPage__loadingState}>
                  <div className={styles.albumsPage__spinner} />
                  <p>Cargando bibliotecas compartidas...</p>
                </div>
              ) : error ? (
                <div className={styles.albumsPage__errorState}>
                  <p>Error al cargar las bibliotecas compartidas</p>
                  <button
                    onClick={() => sharedAlbumsQuery.refetch()}
                    className={styles.albumsPage__retryButton}
                  >
                    Reintentar
                  </button>
                </div>
              ) : sharedAlbums.length > 0 ? (
                <div className={styles.albumsPage__gridWrapper}>
                  <SharedAlbumGrid
                    albums={sharedAlbums}
                    showServerBadge={!selectedServerId}
                    mobileLayout="grid"
                  />

                  {/* Pagination Controls */}
                  <Pagination
                    currentPage={page}
                    totalPages={sharedTotalPages}
                    onPageChange={handlePageChange}
                    disabled={isLoading}
                  />
                </div>
              ) : (
                <div className={styles.albumsPage__emptyState}>
                  <Server size={48} className={styles.albumsPage__emptyIcon} />
                  <p>{searchQuery ? 'No se encontraron álbumes' : 'No hay álbumes compartidos disponibles'}</p>
                  <p className={styles.albumsPage__emptyHint}>
                    Los servidores conectados aún no comparten música o están offline
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
