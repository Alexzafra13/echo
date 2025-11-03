import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { Sidebar, AlbumGrid } from '../../components';
import { useAlbums } from '../../hooks/useAlbums';
import styles from './AlbumsPage.module.css';

/**
 * AlbumsPage Component
 * Shows all albums with pagination
 */
export default function AlbumsPage() {
  const [page, setPage] = useState(0);
  const pageSize = 24; // 4 rows of 6 albums

  const { data: response, isLoading, error } = useAlbums({
    skip: page * pageSize,
    take: pageSize,
  });

  const albums = response?.data || [];
  const hasMore = response?.hasMore || false;

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
        <Header />

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
