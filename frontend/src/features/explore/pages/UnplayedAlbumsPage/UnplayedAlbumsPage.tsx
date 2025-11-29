import { useLocation } from 'wouter';
import { Disc, ChevronLeft } from 'lucide-react';
import { Sidebar, AlbumGrid } from '@features/home/components';
import { Header } from '@shared/components/layout/Header';
import { useUnplayedAlbums } from '../../hooks/useExplore';
import { useGridDimensions } from '@features/home/hooks';
import type { Album } from '@features/home/types';
import type { ExploreAlbum } from '../../services/explore.service';
import styles from './UnplayedAlbumsPage.module.css';

/**
 * Transform ExploreAlbum to Album type for AlbumGrid compatibility
 */
function toAlbum(exploreAlbum: ExploreAlbum): Album {
  return {
    id: exploreAlbum.id,
    title: exploreAlbum.name,
    artist: exploreAlbum.artistName || 'Artista desconocido',
    artistId: exploreAlbum.artistId || '',
    coverImage: `/api/images/albums/${exploreAlbum.id}/cover`,
    year: exploreAlbum.year || 0,
    totalTracks: exploreAlbum.songCount,
    duration: exploreAlbum.duration,
    addedAt: new Date(),
  };
}

/**
 * UnplayedAlbumsPage Component
 * Full page listing all albums the user has never played
 */
export default function UnplayedAlbumsPage() {
  const [, setLocation] = useLocation();

  // Calculate items per page based on screen size (multiple rows)
  const { itemsPerPage } = useGridDimensions({ maxRows: 6 });

  const { data, isLoading } = useUnplayedAlbums(Math.min(itemsPerPage, 100));

  const handleBack = () => {
    setLocation('/explore');
  };

  // Transform to Album type
  const albums = data?.albums?.map(toAlbum) || [];

  return (
    <div className={styles.unplayedPage}>
      <Sidebar />

      <main className={styles.unplayedPage__main}>
        <Header disableSearch />

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
          ) : albums.length > 0 ? (
            <AlbumGrid title="" albums={albums} />
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
