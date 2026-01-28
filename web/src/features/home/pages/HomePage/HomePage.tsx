import { useEffect, useMemo, useState, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { HeroSection, AlbumGrid, PlaylistGrid, Sidebar } from '../../components';
import { HeaderWithSearch } from '@shared/components/layout/Header';
import { ActionCardsRow } from '@shared/components/ActionCardsRow';
import { useFeaturedAlbum, useRecentAlbums, useTopPlayedAlbums, useGridDimensions, useAutoPlaylists, categorizeAutoPlaylists, randomSelect, useAlbumsRecentlyPlayed } from '../../hooks';
import { useAutoRefreshOnScan } from '@shared/hooks';
import { useHomePreferences } from '@features/settings/hooks';
import { usePlaylists } from '@features/playlists/hooks/usePlaylists';
import { useFavoriteStations, useDeleteFavoriteStation } from '@features/radio/hooks';
import { usePlayer } from '@features/player/context/PlayerContext';
import { useRandomAlbums } from '@features/explore/hooks';
import { toAlbum } from '@features/explore/utils/transform';
import { useSharedAlbumsForHome, SharedAlbumGrid } from '@features/federation';
import { MyPlaylistsSection } from './MyPlaylistsSection';
import { FavoriteRadiosSection } from './FavoriteRadiosSection';
import { SurpriseMeSection } from './SurpriseMeSection';
import type { HomeSectionId } from '@features/settings/services';
import type { Album, HeroItem } from '../../types';
import styles from './HomePage.module.css';

/**
 * HomePage Component
 * Main page after login - displays featured album, recent albums, and Wave Mix recommendations
 */
export default function HomePage() {
  // Auto-refresh when scan completes
  useAutoRefreshOnScan();

  // Responsive state for mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Calculate how many albums we need for 2 rows dynamically
  const { itemsPerPage: gridAlbums } = useGridDimensions({
    maxRows: 2,
    headerHeight: 450,
  });

  // Calculate how many playlists we need for 1 row dynamically
  const { itemsPerPage: gridPlaylists } = useGridDimensions({
    maxRows: 1,
    headerHeight: 450,
  });

  // On mobile, use more items for horizontal scroll (minimum 12)
  const neededAlbums = isMobile ? Math.max(12, gridAlbums) : gridAlbums;
  const neededPlaylists = isMobile ? Math.max(10, gridPlaylists) : gridPlaylists;

  const { data: featuredAlbum, isLoading: loadingFeatured } = useFeaturedAlbum();
  const { data: recentAlbums, isLoading: loadingRecent } = useRecentAlbums(
    Math.min(neededAlbums, 50) // Backend max is 50
  );
  const { data: topPlayedAlbums, isLoading: loadingTopPlayed } = useTopPlayedAlbums(Math.min(neededAlbums, 50));
  const { data: recentlyPlayedAlbums } = useAlbumsRecentlyPlayed(Math.min(neededAlbums, 50));
  const { data: autoPlaylists } = useAutoPlaylists();
  const { data: homePreferences } = useHomePreferences();

  // User playlists for my-playlists section
  const { data: userPlaylistsData } = usePlaylists({ take: neededPlaylists });
  const userPlaylists = userPlaylistsData?.items || [];

  // Favorite radio stations for favorite-radios section
  const { data: favoriteStations = [] } = useFavoriteStations();
  const deleteFavoriteMutation = useDeleteFavoriteStation();
  const { playRadio, currentRadioStation, isPlaying, isRadioMode, radioMetadata } = usePlayer();

  // Random albums for surprise-me section
  const queryClient = useQueryClient();
  const { data: randomAlbumsData } = useRandomAlbums(neededAlbums);
  const randomAlbums = randomAlbumsData?.albums?.map(toAlbum) || [];
  const handleRefreshRandom = () => {
    queryClient.invalidateQueries({ queryKey: ['explore', 'random-albums'] });
  };

  // Shared albums from connected servers
  const { data: sharedAlbumsData } = useSharedAlbumsForHome(neededAlbums);
  const sharedAlbums = sharedAlbumsData?.albums || [];

  // Get enabled sections sorted by order
  const enabledSections = useMemo(() => {
    if (!homePreferences?.homeSections) {
      // Default: recent-albums and artist-mix enabled
      return [
        { id: 'recent-albums' as HomeSectionId, order: 0 },
        { id: 'artist-mix' as HomeSectionId, order: 1 },
      ];
    }
    return homePreferences.homeSections
      .filter(s => s.enabled)
      .sort((a, b) => a.order - b.order);
  }, [homePreferences]);

  // Hero section rotation state
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  // Refresh key to force re-randomization on each page visit
  const [refreshKey, setRefreshKey] = useState(() => Date.now());

  // Re-randomize pool when component mounts (page visit)
  useEffect(() => {
    setRefreshKey(Date.now());
    setCurrentHeroIndex(0); // Reset to first item
  }, []);

  // Helper: Check if album was released recently (within N days)
  const isRecentRelease = (album: Album, days: number = 90): boolean => {
    if (!album.releaseDate) return false;
    const releaseDate = new Date(album.releaseDate);
    const now = new Date();
    const diffDays = (now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= days;
  };

  // Create adaptive hero pool based on user activity
  // Now includes both albums and artist playlists
  const featuredHeroPool = useMemo((): HeroItem[] => {
    if (!recentAlbums || recentAlbums.length === 0) return [];

    const pool: HeroItem[] = [];
    const topPlayed = topPlayedAlbums || [];
    const recent = recentAlbums || [];

    // Filter albums with recent release dates (last 3 months)
    const newReleases = recent.filter(album => isRecentRelease(album, 90));

    // Get artist playlists from Wave Mix (sorted by plays - first is most played)
    const { artistPlaylists } = autoPlaylists ? categorizeAutoPlaylists(autoPlaylists) : { artistPlaylists: [] };

    // Determine user activity level
    const hasHighActivity = topPlayed.length >= 5; // Active user
    const hasLowActivity = topPlayed.length > 0 && topPlayed.length < 5; // Some activity

    if (hasHighActivity) {
      // Active user: Mix of top played, new releases, artist playlists, and recent
      pool.push(...topPlayed.slice(0, 3).map(album => ({ type: 'album' as const, data: album })));

      if (newReleases.length > 0) {
        pool.push(...randomSelect(newReleases, 1).map(album => ({ type: 'album' as const, data: album })));
      }

      // Add artist playlists: 1 most played + 1 less played (from the end)
      if (artistPlaylists.length >= 2) {
        pool.push({ type: 'playlist' as const, data: artistPlaylists[0] });
        const lessPlayedArtists = artistPlaylists.slice(Math.floor(artistPlaylists.length / 2));
        const randomLessPlayed = randomSelect(lessPlayedArtists, 1);
        if (randomLessPlayed.length > 0) {
          pool.push({ type: 'playlist' as const, data: randomLessPlayed[0] });
        }
      } else if (artistPlaylists.length === 1) {
        pool.push({ type: 'playlist' as const, data: artistPlaylists[0] });
      }

      // Fill remaining with recent albums (avoid duplicates)
      const existingAlbumIds = new Set(
        pool.filter(item => item.type === 'album').map(item => item.data.id)
      );
      const remainingRecent = recent.filter(a => !existingAlbumIds.has(a.id));
      pool.push(...randomSelect(remainingRecent, 2).map(album => ({ type: 'album' as const, data: album })));

    } else if (hasLowActivity) {
      // Low activity: More weight on new content
      pool.push(...topPlayed.slice(0, 1).map(album => ({ type: 'album' as const, data: album })));
      pool.push(...randomSelect(newReleases, 2).map(album => ({ type: 'album' as const, data: album })));

      // Add 1 artist playlist (random)
      if (artistPlaylists.length > 0) {
        const randomArtist = randomSelect(artistPlaylists, 1);
        pool.push({ type: 'playlist' as const, data: randomArtist[0] });
      }

      // Fill with recent albums
      const existingAlbumIds = new Set(
        pool.filter(item => item.type === 'album').map(item => item.data.id)
      );
      const remainingRecent = recent.filter(a => !existingAlbumIds.has(a.id));
      pool.push(...randomSelect(remainingRecent, 4).map(album => ({ type: 'album' as const, data: album })));

    } else {
      // New user: Show new releases and recent albums only (no playlists yet)
      pool.push(...randomSelect(newReleases, 4).map(album => ({ type: 'album' as const, data: album })));

      const existingAlbumIds = new Set(
        pool.filter(item => item.type === 'album').map(item => item.data.id)
      );
      const remainingRecent = recent.filter(a => !existingAlbumIds.has(a.id));
      pool.push(...randomSelect(remainingRecent, 4).map(album => ({ type: 'album' as const, data: album })));
    }

    // Remove duplicates and limit to 8 items
    const uniquePool = Array.from(new Map(pool.map(item => [item.data.id, item])).values());
    return uniquePool.slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentAlbums, topPlayedAlbums, autoPlaylists, refreshKey]);

  // Prepare separate playlists for artist-mix and genre-mix sections
  const { artistMixPlaylists, genreMixPlaylists } = useMemo(() => {
    if (!autoPlaylists || autoPlaylists.length === 0) {
      return { artistMixPlaylists: [], genreMixPlaylists: [] };
    }

    const { waveMix, artistPlaylists, genrePlaylists } = categorizeAutoPlaylists(autoPlaylists);

    // Artist Mix: Wave Mix (if exists) + artist playlists
    const artistMix = [];
    if (waveMix) {
      artistMix.push(waveMix);
    }
    const artistCount = neededAlbums - (waveMix ? 1 : 0);
    const randomArtists = randomSelect(artistPlaylists, artistCount);
    artistMix.push(...randomArtists);

    // Genre Mix: genre playlists only (same count as albums - 2 rows)
    const randomGenres = randomSelect(genrePlaylists, neededAlbums);

    return {
      artistMixPlaylists: artistMix.slice(0, neededAlbums),
      genreMixPlaylists: randomGenres.slice(0, neededAlbums),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlaylists, neededAlbums, isMobile, refreshKey]);

  // Auto-rotate hero section every 20 seconds
  useEffect(() => {
    if (featuredHeroPool.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % featuredHeroPool.length);
    }, 20000);

    return () => clearInterval(interval);
  }, [featuredHeroPool.length]);

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
    setCurrentHeroIndex((prev) => (prev + 1) % featuredHeroPool.length);
  };

  const handlePreviousHero = () => {
    setCurrentHeroIndex((prev) =>
      prev === 0 ? featuredHeroPool.length - 1 : prev - 1
    );
  };

  // Current hero item (from pool or fallback to API featured album)
  const currentHeroItem: HeroItem | null = featuredHeroPool.length > 0
    ? featuredHeroPool[currentHeroIndex]
    : featuredAlbum
      ? { type: 'album', data: featuredAlbum }
      : null;

  // Display albums based on calculated grid size (2 rows that fill the screen width)
  const displayedRecentAlbums = recentAlbums?.slice(0, neededAlbums) || [];
  const displayedTopPlayedAlbums = topPlayedAlbums?.slice(0, neededAlbums) || [];
  const displayedRecentlyPlayedAlbums = recentlyPlayedAlbums?.data?.slice(0, neededAlbums) || [];

  // Render a section by ID
  const renderSection = (sectionId: HomeSectionId): ReactNode => {
    switch (sectionId) {
      case 'recent-albums':
        if (displayedRecentAlbums.length === 0) return null;
        return (
          <AlbumGrid
            key="recent-albums"
            title="Recientemente Añadidos"
            albums={displayedRecentAlbums}
            showViewAll={true}
            viewAllPath="/albums"
          />
        );
      case 'artist-mix':
        if (artistMixPlaylists.length === 0) return null;
        return (
          <PlaylistGrid
            key="artist-mix"
            title="Mix por Artista"
            playlists={artistMixPlaylists}
            showViewAll={true}
            viewAllPath="/wave-mix"
          />
        );
      case 'genre-mix':
        if (genreMixPlaylists.length === 0) return null;
        return (
          <PlaylistGrid
            key="genre-mix"
            title="Mix por Género"
            playlists={genreMixPlaylists}
            showViewAll={true}
            viewAllPath="/wave-mix"
          />
        );
      case 'recently-played':
        if (displayedRecentlyPlayedAlbums.length === 0) return null;
        return (
          <AlbumGrid
            key="recently-played"
            title="Escuchados Recientemente"
            albums={displayedRecentlyPlayedAlbums}
            showViewAll={false}
          />
        );
      case 'top-played':
        if (displayedTopPlayedAlbums.length === 0) return null;
        return (
          <AlbumGrid
            key="top-played"
            title="Más Escuchados"
            albums={displayedTopPlayedAlbums}
            showViewAll={false}
          />
        );
      case 'my-playlists':
        return (
          <MyPlaylistsSection
            key="my-playlists"
            playlists={userPlaylists}
            maxItems={neededPlaylists}
          />
        );
      case 'favorite-radios':
        return (
          <FavoriteRadiosSection
            key="favorite-radios"
            stations={favoriteStations}
            maxItems={neededPlaylists}
            currentRadioStation={currentRadioStation}
            isPlaying={isPlaying}
            isRadioMode={isRadioMode}
            radioMetadata={radioMetadata}
            onPlay={playRadio}
            onRemoveFavorite={(id) => deleteFavoriteMutation.mutate(id)}
          />
        );
      case 'surprise-me':
        return (
          <SurpriseMeSection
            key="surprise-me"
            albums={randomAlbums}
            onRefresh={handleRefreshRandom}
          />
        );
      case 'shared-albums':
        return (
          <SharedAlbumGrid
            key="shared-albums"
            title="Bibliotecas Compartidas"
            albums={sharedAlbums}
            showViewAll={sharedAlbums.length > 0}
            viewAllPath="/albums?source=shared"
            showEmptyState={true}
          />
        );
      default:
        return null;
    }
  };

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
          ) : currentHeroItem ? (
            <HeroSection
              key={currentHeroItem.data.id}
              item={currentHeroItem}
              onNext={handleNextHero}
              onPrevious={handlePreviousHero}
            />
          ) : (
            <div className={styles.homePage__emptyState}>
              <p>No featured album available</p>
            </div>
          )}

          {/* Action Cards Row */}
          <ActionCardsRow />

          {/* Dynamic Sections - rendered based on user preferences */}
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
          ) : enabledSections.length > 0 ? (
            <>
              {enabledSections.map(section => renderSection(section.id))}
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
