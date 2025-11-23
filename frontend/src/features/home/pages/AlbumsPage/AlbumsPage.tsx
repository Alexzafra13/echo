import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { Pagination } from '@shared/components/ui';
import { Sidebar, AlbumGrid } from '../../components';
import { useAlbums } from '../../hooks/useAlbums';
import { useGridDimensions } from '../../hooks/useGridDimensions';
import styles from './AlbumsPage.module.css';

/**
 * AlbumsPage Component
 * Shows all albums with pagination and inline search filtering
 */
export default function AlbumsPage() {
  const [page, setPage] = useState(1); // Changed to 1-based
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate dynamic grid dimensions to fill the screen
  const { itemsPerPage } = useGridDimensions({
    headerHeight: 180, // Header + page title height
  });

  const { data: response, isLoading, error } = useAlbums({
    skip: (page - 1) * itemsPerPage, // Adjust for 1-based
    take: itemsPerPage,
  });

  const allAlbums = response?.data || [];
  const total = response?.total || 0;
  const totalPages = Math.ceil(total / itemsPerPage);

  // Filter albums by search query (client-side)
  const filteredAlbums = allAlbums.filter(album =>
    album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    album.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset to first page when itemsPerPage changes (window resize)
  useEffect(() => {
    setPage(1);
  }, [itemsPerPage]);

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
            <>
              <AlbumGrid title="" albums={filteredAlbums} />

              {/* Pagination Controls */}
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                disabled={isLoading}
              />
            </>
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
