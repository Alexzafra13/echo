import { useLocation } from 'wouter';
import { Disc, ChevronLeft } from 'lucide-react';
import { Sidebar } from '@features/home/components';
import { Header } from '@shared/components/layout/Header';
import { AlbumCard } from '@features/home/components/AlbumCard';
import { useUnplayedAlbums } from '../../hooks/useExplore';
import { useGridDimensions } from '@features/home/hooks';
import { getCoverUrl } from '@shared/utils/cover.utils';
import styles from './UnplayedAlbumsPage.module.css';

/**
 * UnplayedAlbumsPage Component
 * Full page listing all albums the user has never played
 */
export default function UnplayedAlbumsPage() {
  const [, setLocation] = useLocation();

  // Calculate items per page based on screen size (multiple rows)
  const { itemsPerPage } = useGridDimensions({ maxRows: 4 });

  const { data, isLoading } = useUnplayedAlbums(Math.min(itemsPerPage * 3, 100));

  const navigateToAlbum = (albumId: string) => {
    setLocation(`/album/${albumId}`);
  };

  const handleBack = () => {
    setLocation('/explore');
  };

  return (
    <div className={styles.unplayedPage}>
      <Sidebar />

      <main className={styles.unplayedPage__main}>
        <Header />

        <div className={styles.unplayedPage__content}>
          {/* Back Button */}
          <button className={styles.unplayedPage__backButton} onClick={handleBack}>
            <ChevronLeft size={20} />
            <span>Explorar</span>
          </button>

          {/* Page Header */}
          <div className={styles.unplayedPage__header}>
            <div className={styles.unplayedPage__titleRow}>
              <Disc size={32} className={styles.unplayedPage__icon} />
              <h1 className={styles.unplayedPage__title}>Sin escuchar</h1>
            </div>
            <p className={styles.unplayedPage__subtitle}>
              {data?.total ?? 0} albums en tu biblioteca que aún no has reproducido
            </p>
          </div>

          {/* Albums Grid */}
          {isLoading ? (
            <div className={styles.unplayedPage__loading}>Cargando...</div>
          ) : data?.albums && data.albums.length > 0 ? (
            <div className={styles.unplayedPage__grid}>
              {data.albums.map((album) => (
                <AlbumCard
                  key={album.id}
                  cover={getCoverUrl(album.coverArtPath)}
                  title={album.name}
                  artist={album.artistName || 'Artista desconocido'}
                  onClick={() => navigateToAlbum(album.id)}
                />
              ))}
            </div>
          ) : (
            <div className={styles.unplayedPage__empty}>
              <Disc size={48} />
              <p>¡Has escuchado todos tus albums!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
