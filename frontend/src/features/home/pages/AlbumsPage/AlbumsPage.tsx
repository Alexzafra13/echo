import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { Sidebar, AlbumGrid, AlbumsSearchPanel } from '../../components';
import { useAlbums } from '../../hooks/useAlbums';
import { useGridDimensions } from '../../hooks/useGridDimensions';
import styles from './AlbumsPage.module.css';

/**
 * AlbumsPage Component
 * Shows all albums with pagination and contextual search
 */
export default function AlbumsPage() {
  const [page, setPage] = useState(0);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);

  // Calculate dynamic grid dimensions to fill the screen
  const { itemsPerPage } = useGridDimensions({
    headerHeight: 180, // Header + page title height
  });

  const { data: response, isLoading, error } = useAlbums({
    skip: page * itemsPerPage,
    take: itemsPerPage,
  });

  const albums = response?.data || [];
  const hasMore = response?.hasMore || false;

  // Reset to first page when itemsPerPage changes (window resize)
  useEffect(() => {
    setPage(0);
  }, [itemsPerPage]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      // Open panel when query has 2+ characters
      setIsSearchPanelOpen(searchQuery.length >= 2);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search handlers
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearchPanelOpen(false);
  };

  const handleClosePanel = useCallback(() => {
    setIsSearchPanelOpen(false);
    setSearchQuery('');
  }, []);

  const handleSearchFocus = () => {
    if (searchQuery.length >= 2) {
      setIsSearchPanelOpen(true);
    }
  };

  // Pagination handlers
  const handlePreviousPage = () => {
    if (page > 0) {
      setPage(page - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextPage = () => {
    if (hasMore) {
      setPage(page + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
                  onChange={handleSearchChange}
                  onFocus={handleSearchFocus}
                  className={styles.albumsPage__searchInput}
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
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

        {/* Albums Search Panel - Expands below header */}
        <AlbumsSearchPanel
          isOpen={isSearchPanelOpen}
          query={debouncedQuery}
          onClose={handleClosePanel}
        />

        <div className={styles.albumsPage__content}>
          {/* Page Header */}
          <div className={styles.albumsPage__pageHeader}>
            <h1 className={styles.albumsPage__title}>Todos los Álbumes</h1>
            <p className={styles.albumsPage__subtitle}>
              Explora tu colección completa de música
            </p>
          </div>

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
          ) : albums && albums.length > 0 ? (
            <>
              <AlbumGrid title="" albums={albums} />

              {/* Pagination Controls */}
              <div className={styles.albumsPage__pagination}>
                <button
                  onClick={handlePreviousPage}
                  disabled={page === 0}
                  className={styles.albumsPage__pageButton}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={20} />
                  <span>Anterior</span>
                </button>

                <span className={styles.albumsPage__pageInfo}>
                  Página {page + 1}
                </span>

                <button
                  onClick={handleNextPage}
                  disabled={!hasMore}
                  className={styles.albumsPage__pageButton}
                  aria-label="Next page"
                >
                  <span>Siguiente</span>
                  <ChevronRight size={20} />
                </button>
              </div>
            </>
          ) : (
            <div className={styles.albumsPage__emptyState}>
              <p>No se encontraron álbumes</p>
              <p className={styles.albumsPage__emptyHint}>
                Agrega música a tu biblioteca para empezar
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
