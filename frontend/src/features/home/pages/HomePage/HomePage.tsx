import { useEffect, useMemo, useState } from 'react';
import { HeroSection, AlbumGrid, PlaylistGrid, Sidebar } from '../../components';
import { HeaderWithSearch } from '@shared/components/layout/Header';
import { useFeaturedAlbum, useRecentAlbums, useTopPlayedAlbums, useGridDimensions, useAutoPlaylists, categorizeAutoPlaylists, randomSelect } from '../../hooks';
import { useAutoRefreshOnScan } from '@shared/hooks';
import type { Album } from '../../types';
import styles from './HomePage.module.css';

/**
 * HomePage Component
 * Main page after login - displays featured album, recent albums, and Wave Mix recommendations
 */
export default function HomePage() {
  // Auto-refresh when scan completes ✨
  useAutoRefreshOnScan();

  // Calculate how many albums we need for 2 rows dynamically
  const { itemsPerPage: neededAlbums } = useGridDimensions({
    maxRows: 2,
    headerHeight: 450,
  });

  // Calculate how many playlists we need for 1 row dynamically
  const { itemsPerPage: neededPlaylists } = useGridDimensions({
    maxRows: 1,
    headerHeight: 450,
  });

  const { data: featuredAlbum, isLoading: loadingFeatured } = useFeaturedAlbum();
  const { data: recentAlbums, isLoading: loadingRecent } = useRecentAlbums(
    Math.min(neededAlbums, 50) // Backend max is 50
  );
  const { data: topPlayedAlbums, isLoading: loadingTopPlayed } = useTopPlayedAlbums(10);
  const { data: autoPlaylists } = useAutoPlaylists();

  // Hero section rotation state
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  // Responsive state for mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Helper: Check if album was released recently (within N days)
  const isRecentRelease = (album: Album, days: number = 90): boolean => {
    if (!album.releaseDate) return false;
    const releaseDate = new Date(album.releaseDate);
    const now = new Date();
    const diffDays = (now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= days;
  };

  // Create adaptive hero pool based on user activity
  const featuredAlbumsPool = useMemo(() => {
    if (!recentAlbums || recentAlbums.length === 0) return [];

    const pool: Album[] = [];
    const topPlayed = topPlayedAlbums || [];
    const recent = recentAlbums || [];

    // Filter albums with recent release dates (last 3 months)
    const newReleases = recent.filter(album => isRecentRelease(album, 90));

    // Determine user activity level
    const hasHighActivity = topPlayed.length >= 5; // Active user
    const hasLowActivity = topPlayed.length > 0 && topPlayed.length < 5; // Some activity

    if (hasHighActivity) {
      // Active user: Mix of top played, new releases, and recent
      // 3 top played + 1 new release + 2 recent = 6-8 albums
      pool.push(...topPlayed.slice(0, 3));

      if (newReleases.length > 0) {
        pool.push(...randomSelect(newReleases, 1));
      }

      // Add albums from Wave Mix if available (get album IDs from tracks)
      const waveMixAlbumIds = new Set<string>();
      if (autoPlaylists) {
        const { waveMix } = categorizeAutoPlaylists(autoPlaylists);
        if (waveMix?.tracks) {
          waveMix.tracks.forEach(track => {
            if (track.album?.id) waveMixAlbumIds.add(track.album.id);
          });
        }
      }
      const waveMixAlbums = recent.filter(album => waveMixAlbumIds.has(album.id));
      pool.push(...randomSelect(waveMixAlbums, 2));

      // Fill remaining with recent albums (avoid duplicates)
      const existingIds = new Set(pool.map(a => a.id));
      const remainingRecent = recent.filter(a => !existingIds.has(a.id));
      pool.push(...randomSelect(remainingRecent, 2));

    } else if (hasLowActivity) {
      // Low activity: More weight on new content
      // 1 top played + 2 new releases + 1 wave mix + 4 recent = 6-8 albums
      pool.push(...topPlayed.slice(0, 1));
      pool.push(...randomSelect(newReleases, 2));

      // Wave Mix album
      const waveMixAlbumIds = new Set<string>();
      if (autoPlaylists) {
        const { waveMix } = categorizeAutoPlaylists(autoPlaylists);
        if (waveMix?.tracks) {
          waveMix.tracks.forEach(track => {
            if (track.album?.id) waveMixAlbumIds.add(track.album.id);
          });
        }
      }
      const waveMixAlbums = recent.filter(album => waveMixAlbumIds.has(album.id));
      pool.push(...randomSelect(waveMixAlbums, 1));

      // Fill with recent albums
      const existingIds = new Set(pool.map(a => a.id));
      const remainingRecent = recent.filter(a => !existingIds.has(a.id));
      pool.push(...randomSelect(remainingRecent, 4));

    } else {
      // New user: Show new releases and recent albums only
      // 4 new releases + 4 recent = 6-8 albums
      pool.push(...randomSelect(newReleases, 4));

      const existingIds = new Set(pool.map(a => a.id));
      const remainingRecent = recent.filter(a => !existingIds.has(a.id));
      pool.push(...randomSelect(remainingRecent, 4));
    }

    // Remove duplicates and limit to 8 albums
    const uniquePool = Array.from(new Map(pool.map(a => [a.id, a])).values());
    return uniquePool.slice(0, 8);
  }, [recentAlbums, topPlayedAlbums, autoPlaylists]);

  // Prepare Wave Mix playlists for home page
  // Wave Mix (always) + enough artist and genre playlists to fill at least one row
  const homePagePlaylists = useMemo(() => {
    if (!autoPlaylists || autoPlaylists.length === 0) return [];

    const { waveMix, artistPlaylists, genrePlaylists } = categorizeAutoPlaylists(autoPlaylists);

    // Build playlist array: Wave Mix + random artists + random genres
    const playlists = [];

    // Always add Wave Mix first (if exists)
    if (waveMix) {
      playlists.push(waveMix);
    }

    // Add random artist playlists (take more to ensure we fill a row)
    const randomArtists = randomSelect(artistPlaylists, 5);
    playlists.push(...randomArtists);

    // Add random genre playlists (take more to ensure we fill a row)
    const randomGenres = randomSelect(genrePlaylists, 5);
    playlists.push(...randomGenres);

    // Limit only on mobile (≤768px), otherwise show all
    // On mobile: limit to 1 row (~4 items), on desktop/tablet: show all
    return isMobile ? playlists.slice(0, neededPlaylists) : playlists;
  }, [autoPlaylists, neededPlaylists, isMobile]);

  // Auto-rotate hero section every 20 seconds
  useEffect(() => {
    if (featuredAlbumsPool.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % featuredAlbumsPool.length);
    }, 20000); // Change album every 20 seconds

    return () => clearInterval(interval);
  }, [featuredAlbumsPool.length]);

  // Update isMobile state on window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Display albums based on calculated grid size (2 rows that fill the screen width)
  const displayedRecentAlbums = recentAlbums?.slice(0, neededAlbums) || [];

  return (
    <div className={styles.homePage}>
      <Sidebar />

      <main className={styles.homePage__main}>
        {/* Header + SearchPanel wrapper - search panel pushes content down */}
        <HeaderWithSearch alwaysGlass />

        <div className={styles.homePage__content}>
          {/* Hero Section */}
          {loadingFeatured || loadingRecent || loadingTopPlayed ? (
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
                showViewAll={true}
                viewAllPath="/albums"
              />
              {/* Wave Mix recommendations */}
              {homePagePlaylists.length > 0 && (
                <PlaylistGrid
                  title="Wave Mix"
                  playlists={homePagePlaylists}
                  showViewAll={true}
                  viewAllPath="/wave-mix"
                />
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
