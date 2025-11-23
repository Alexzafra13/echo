import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { HeroSection, AlbumGrid, PlaylistGrid, Sidebar } from '../../components';
import { Header, SearchPanel } from '@shared/components/layout/Header';
import { useFeaturedAlbum, useRecentAlbums, useGridDimensions, useAutoPlaylists, categorizeAutoPlaylists, randomSelect } from '../../hooks';
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

  const { data: featuredAlbum, isLoading: loadingFeatured } = useFeaturedAlbum();
  const { data: recentAlbums, isLoading: loadingRecent } = useRecentAlbums(
    Math.min(neededAlbums, 50) // Backend max is 50
  );
  const { data: autoPlaylists, isLoading: loadingPlaylists } = useAutoPlaylists();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);

  // Hero section rotation state
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  // Create a pool of featured albums (random selection from recent albums)
  const featuredAlbumsPool = useMemo(() => {
    if (!recentAlbums || recentAlbums.length === 0) return [];

    // Shuffle and take up to 10 random albums for the hero rotation
    const shuffled = [...recentAlbums].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(10, recentAlbums.length));
  }, [recentAlbums]);

  // Prepare Wave Mix playlists for home page
  // Wave Mix (always) + random 2-3 artist playlists + random 2-3 genre playlists
  const homePagePlaylists = useMemo(() => {
    if (!autoPlaylists || autoPlaylists.length === 0) return [];

    const { waveMix, artistPlaylists, genrePlaylists } = categorizeAutoPlaylists(autoPlaylists);

    // Build playlist array: Wave Mix + random artists + random genres
    const playlists = [];

    // Always add Wave Mix first (if exists)
    if (waveMix) {
      playlists.push(waveMix);
    }

    // Add 2-3 random artist playlists
    const randomArtists = randomSelect(artistPlaylists, 3);
    playlists.push(...randomArtists);

    // Add 2-3 random genre playlists
    const randomGenres = randomSelect(genrePlaylists, 3);
    playlists.push(...randomGenres);

    return playlists;
  }, [autoPlaylists]);

  // Auto-rotate hero section every 20 seconds
  useEffect(() => {
    if (featuredAlbumsPool.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % featuredAlbumsPool.length);
    }, 20000); // Change album every 20 seconds

    return () => clearInterval(interval);
  }, [featuredAlbumsPool.length]);

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
        <Header
          alwaysGlass
          customSearch={
            <div className={styles.homePage__searchForm}>
              <div className={styles.homePage__searchWrapper}>
                <Search size={20} className={styles.homePage__searchIcon} />
                <input
                  type="text"
                  placeholder="Busca Artistas, Canciones, Álbumes..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={handleSearchFocus}
                  className={styles.homePage__searchInput}
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className={styles.homePage__searchClearButton}
                    aria-label="Limpiar búsqueda"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          }
        />

        {/* Search Panel - Expands below header */}
        <SearchPanel
          isOpen={isSearchPanelOpen}
          query={debouncedQuery}
          onClose={handleClosePanel}
        />

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
