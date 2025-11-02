import { HeroSection, AlbumGrid, Sidebar } from '../../components';
import { Header } from '@shared/components/layout/Header';
import { useFeaturedAlbum, useRecentAlbums } from '../../hooks';
import { useAutoRefreshOnScan } from '@shared/hooks';
import type { Album } from '../../types';
import styles from './HomePage.module.css';

/**
 * HomePage Component
 * Main page after login - displays featured album, recent albums, and daily mixes
 */
export default function HomePage() {
  // Auto-refresh cuando se completa un scan ✨
  useAutoRefreshOnScan();

  const { data: featuredAlbum, isLoading: loadingFeatured } = useFeaturedAlbum();
  const { data: recentAlbums, isLoading: loadingRecent } = useRecentAlbums();

  // Mock daily mix data (TODO: Replace with real API call)
  const dailyMix: Album[] = recentAlbums?.slice(0, 4) || [];

  return (
    <div className={styles.container}>
      <Sidebar />

      <main className={styles.main}>
        <Header />

        <div className={styles.content}>
          {/* Hero Section */}
          {loadingFeatured ? (
            <div className={styles.heroSkeleton}>
              <div className={styles.skeletonCover} />
              <div className={styles.skeletonInfo}>
                <div className={styles.skeletonTitle} />
                <div className={styles.skeletonSubtitle} />
                <div className={styles.skeletonButton} />
              </div>
            </div>
          ) : featuredAlbum ? (
            <HeroSection album={featuredAlbum} />
          ) : (
            <div className={styles.emptyState}>
              <p>No featured album available</p>
            </div>
          )}

          {/* Recently Added Albums */}
          {loadingRecent ? (
            <div className={styles.gridSkeleton}>
              <div className={styles.skeletonSectionTitle} />
              <div className={styles.skeletonGrid}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={styles.skeletonCard}>
                    <div className={styles.skeletonCardCover} />
                    <div className={styles.skeletonCardTitle} />
                    <div className={styles.skeletonCardArtist} />
                  </div>
                ))}
              </div>
            </div>
          ) : recentAlbums && recentAlbums.length > 0 ? (
            <>
              <AlbumGrid
                title="Recientemente Añadidos"
                albums={recentAlbums}
              />
              {dailyMix.length > 0 && (
                <AlbumGrid title="Daily Mix" albums={dailyMix} />
              )}
            </>
          ) : (
            <div className={styles.emptyState}>
              <p>No albums found. Start by adding some music!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
