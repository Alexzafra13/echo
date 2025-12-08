import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { Pagination } from '@shared/components/ui';
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
import type { AlbumSortOption } from '../../types';
import styles from './AlbumsPage.module.css';

/**
 * AlbumsPage Component
 * Shows all albums with pagination, inline search filtering and sort options
 */
export default function AlbumsPage() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<AlbumSortOption>('recent');

  // Calculate dynamic grid dimensions to fill the screen
  const { itemsPerPage } = useGridDimensions({
    headerHeight: 220, // Header + page title + filter selector height
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
      allAlbums = alphabeticalQuery.data?.albums || [];
      totalPages = alphabeticalQuery.data?.totalPages || 1;
      break;
    case 'artist':
      activeQuery = byArtistQuery;
      allAlbums = byArtistQuery.data?.albums || [];
      totalPages = byArtistQuery.data?.totalPages || 1;
      break;
    case 'recently-played':
      activeQuery = recentlyPlayedQuery;
      allAlbums = recentlyPlayedQuery.data?.albums || [];
      totalPages = 1; // No pagination for recently played
      break;
    case 'top-played':
      activeQuery = topPlayedQuery;
      allAlbums = topPlayedQuery.data || [];
      totalPages = 1; // No pagination for top played
      break;
    case 'favorites':
      activeQuery = favoritesQuery;
      allAlbums = favoritesQuery.data?.albums || [];
      totalPages = favoritesQuery.data?.hasMore ? page + 1 : page; // Estimate based on hasMore
      break;
    case 'recent':
    default:
      activeQuery = recentQuery;
      allAlbums = recentQuery.data || [];
      totalPages = 1; // No pagination for recent
      break;
  }

  const isLoading = activeQuery.isLoading;
  const error = activeQuery.error;

  // Filter albums by search query (client-side)
  const filteredAlbums = allAlbums.filter(album =>
    album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    album.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset to first page when sort option or itemsPerPage changes
  useEffect(() => {
    setPage(1);
  }, [sortBy, itemsPerPage]);

  // Pagination handler
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
                  placeholder="Buscar álbumes..."
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
            <h1 className={styles.albumsPage__title}>Todos los Álbumes</h1>
            <p className={styles.albumsPage__subtitle}>
              Explora tu colección completa de música
            </p>
          </div>

          {/* Sort Filter */}
          <div className={styles.albumsPage__filterWrapper}>
            <label htmlFor="album-sort" className={styles.albumsPage__filterLabel}>
              Ordenar por:
            </label>
            <select
              id="album-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as AlbumSortOption)}
              className={styles.albumsPage__filterSelect}
            >
              <option value="recent">Añadidos recientemente</option>
              <option value="alphabetical">Por nombre (A-Z)</option>
              <option value="artist">Por artista (A-Z)</option>
              <option value="recently-played">Reproducidos recientemente</option>
              <option value="top-played">Los más reproducidos</option>
              <option value="favorites">Mis favoritos</option>
            </select>
          </div>

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
              <AlbumGrid title="" albums={filteredAlbums} />

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
        </div>
      </main>
    </div>
  );
}
