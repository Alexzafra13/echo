import { useState, useEffect, useMemo } from 'react';
import { HeroSection, AlbumGrid, Sidebar } from '../../components';
import { Header } from '@shared/components/layout/Header';
import { useFeaturedAlbum, useRecentAlbums, useGridDimensions } from '../../hooks';
import { useAutoRefreshOnScan } from '@shared/hooks';
import type { Album } from '../../types';
import styles from './HomePage.module.css';

/**
 * HomePage Component
 * Main page after login - displays featured album, recent albums, and daily mixes
 */
export default function HomePage() {
  // Auto-refresh when scan completes ✨
  useAutoRefreshOnScan();

  const { data: featuredAlbum, isLoading: loadingFeatured } = useFeaturedAlbum();
  // Pedir 12 álbumes (2 filas de ~6 en resoluciones estándar)
  // CSS auto-fill distribuirá responsivamente: desktop 6 cols, laptop 5 cols, tablet 4 cols, mobile 3 cols
  const { data: recentAlbums, isLoading: loadingRecent } = useRecentAlbums(12);

  // Hero section rotation state
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  // Create a pool of featured albums (random selection from recent albums)
  const featuredAlbumsPool = useMemo(() => {
    if (!recentAlbums || recentAlbums.length === 0) return [];

    // Shuffle and take up to 10 random albums for the hero rotation
    const shuffled = [...recentAlbums].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(10, recentAlbums.length));
  }, [recentAlbums]);

  // Auto-rotate hero section every 20 seconds
  useEffect(() => {
    if (featuredAlbumsPool.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % featuredAlbumsPool.length);
    }, 20000); // Change album every 20 seconds

    return () => clearInterval(interval);
  }, [featuredAlbumsPool.length]);

  // Navigation handlers
  const handleNextHero = () => {
    setCurrentHeroIndex((prev) => (prev + 1) % featuredAlbumsPool.length);
  };

  const handlePreviousHero = () => {
    setCurrentHeroIndex((prev) =>
      prev === 0 ? featuredAlbumsPool.length - 1 : prev - 1
    );
  };

  // Current hero album (from pool or fallback to API featured)
  const currentHeroAlbum = featuredAlbumsPool.length > 0
    ? featuredAlbumsPool[currentHeroIndex]
    : featuredAlbum;

  // Mostrar todos los álbumes recientes (CSS auto-fill los distribuirá)
  const displayedRecentAlbums = recentAlbums || [];
  const dailyMix: Album[] = recentAlbums?.slice(0, 4) || [];

  return (
    <div className={styles.homePage}>
      <Sidebar />

      <main className={styles.homePage__main}>
        <Header />

        <div className={styles.homePage__content}>
          {/* Hero Section */}
          {loadingFeatured || loadingRecent ? (
            <div className={styles['hero--loading']}>
              <div className={styles['hero__cover--loading']} />
              <div className={styles['hero__info--loading']}>
                <div className={styles['hero__title--loading']} />
                <div className={styles['hero__subtitle--loading']} />
                <div className={styles['hero__button--loading']} />
              </div>
            </div>
          ) : currentHeroAlbum ? (
            <HeroSection
              key={currentHeroAlbum.id}
              album={currentHeroAlbum}
              onNext={handleNextHero}
              onPrevious={handlePreviousHero}
            />
          ) : (
            <div className={styles.homePage__emptyState}>
              <p>No featured album available</p>
            </div>
          )}

          {/* Recently Added Albums */}
          {loadingRecent ? (
            <div className={styles['albumGrid--loading']}>
              <div className={styles['albumGrid__sectionTitle--loading']} />
              <div className={styles['albumGrid__grid--loading']}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={styles['albumCard--loading']}>
                    <div className={styles['albumCard__cover--loading']} />
                    <div className={styles['albumCard__title--loading']} />
                    <div className={styles['albumCard__artist--loading']} />
                  </div>
                ))}
              </div>
            </div>
          ) : displayedRecentAlbums && displayedRecentAlbums.length > 0 ? (
            <>
              <AlbumGrid
                title="Recientemente Añadidos"
                albums={displayedRecentAlbums}
              />
              {dailyMix.length > 0 && (
                <AlbumGrid title="Daily Mix" albums={dailyMix} />
              )}
            </>
          ) : (
            <div className={styles.homePage__emptyState}>
              <p>No albums found. Start by adding some music!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
