import { useMemo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { HeroSection, Sidebar } from '../../components';
import { HeaderWithSearch } from '@shared/components/layout/Header';
import { ActionCardsRow } from '@shared/components/ActionCardsRow';
import {
  useFeaturedAlbum,
  useRecentAlbums,
  useTopPlayedAlbums,
  useUserTopPlayedAlbums,
  useGridDimensions,
  useAutoPlaylists,
  useAlbumsRecentlyPlayed,
  useHomeMusicVideos,
} from '../../hooks';
import { useHeroPool } from '../../hooks/useHeroPool';
import { useHomeSections } from '../../hooks/useHomeSections';
import { useAutoRefreshOnScan, useDocumentTitle, useIsMobile } from '@shared/hooks';
import { useHomePreferences } from '@features/settings/hooks';
import { usePlaylists } from '@features/playlists';
import { useFavoriteStations, useDeleteFavoriteStation } from '@features/radio/hooks';
import { useRadio, usePlayback } from '@features/player';
import { useRandomAlbums } from '@features/explore/hooks';
import { toAlbum } from '@features/explore/utils/transform';
import { useSharedAlbumsForHome } from '@features/federation';
import {
  RecentAlbumsSection,
  ArtistMixSection,
  GenreMixSection,
  RecentlyPlayedSection,
  TopPlayedSection,
  SharedAlbumsSection,
} from './sections';
import { MyPlaylistsSection } from './MyPlaylistsSection';
import { FavoriteRadiosSection } from './FavoriteRadiosSection';
import { SurpriseMeSection } from './SurpriseMeSection';
import type { HomeSectionId } from '@features/settings/services';
import styles from './HomePage.module.css';

/**
 * Página principal tras login: álbum destacado, recientes y recomendaciones Wave Mix.
 */
export default function HomePage() {
  const { t } = useTranslation();
  useAutoRefreshOnScan();
  useDocumentTitle(t('home.pageTitle'));

  // Responsive
  const isMobile = useIsMobile();

  // Dimensiones del grid según viewport
  const { itemsPerPage: gridAlbums, columns: gridColumns } = useGridDimensions({
    maxRows: 2,
    headerHeight: 450,
  });
  const { itemsPerPage: gridPlaylists } = useGridDimensions({ maxRows: 1, headerHeight: 450 });
  const neededAlbums = isMobile ? Math.max(12, gridAlbums) : gridAlbums;
  const neededPlaylists = isMobile ? Math.max(10, gridPlaylists) : gridPlaylists;

  // Data fetching
  const { data: featuredAlbum, isLoading: loadingFeatured } = useFeaturedAlbum();
  const { data: recentAlbums, isLoading: loadingRecent } = useRecentAlbums(
    Math.min(neededAlbums, 50)
  );
  const { data: topPlayedAlbums, isLoading: loadingTopPlayed } = useTopPlayedAlbums(
    Math.min(neededAlbums, 50)
  );
  const { data: userTopPlayedAlbums } = useUserTopPlayedAlbums(Math.min(neededAlbums, 50));
  const { data: recentlyPlayedAlbums } = useAlbumsRecentlyPlayed(Math.min(neededAlbums, 50));
  const { data: autoPlaylists } = useAutoPlaylists();
  const { data: musicVideos } = useHomeMusicVideos();
  const { data: homePreferences } = useHomePreferences();
  const { data: userPlaylistsData } = usePlaylists({ take: neededPlaylists });
  const userPlaylists = userPlaylistsData?.items || [];
  const { data: favoriteStations = [] } = useFavoriteStations();
  const deleteFavoriteMutation = useDeleteFavoriteStation();
  const { playRadio, currentRadioStation, isRadioMode, radioMetadata } = useRadio();
  const { isPlaying } = usePlayback();

  // Álbumes aleatorios (sección sorpresa)
  const queryClient = useQueryClient();
  const { data: randomAlbumsData } = useRandomAlbums(neededAlbums);
  const randomAlbums = randomAlbumsData?.albums?.map(toAlbum) || [];
  const handleRefreshRandom = () =>
    queryClient.invalidateQueries({ queryKey: ['explore', 'random-albums'] });

  // Álbumes compartidos (federación)
  const { data: sharedAlbumsData } = useSharedAlbumsForHome(neededAlbums);
  const sharedAlbums = sharedAlbumsData?.albums || [];

  // Hero con rotación y crossfade
  const {
    currentItem,
    exitingItem,
    next: heroNext,
    previous: heroPrevious,
  } = useHeroPool({
    recentAlbums,
    topPlayedAlbums,
    userTopPlayedAlbums,
    recentlyPlayedAlbums,
    autoPlaylists,
    featuredAlbum,
    musicVideos,
  });

  // Categorización de playlists y truncamiento a filas completas
  const { artistMixPlaylists, genreMixPlaylists, truncateAlbums } = useHomeSections({
    autoPlaylists,
    neededAlbums,
    gridColumns,
    isMobile,
  });

  const displayedRecentAlbums = truncateAlbums(recentAlbums || []);
  const displayedTopPlayedAlbums = truncateAlbums(topPlayedAlbums || []);
  const displayedRecentlyPlayedAlbums = truncateAlbums(recentlyPlayedAlbums?.data || []);

  // Secciones habilitadas según preferencias del usuario
  const enabledSections = useMemo(() => {
    if (!homePreferences?.homeSections) {
      return [
        { id: 'recent-albums' as HomeSectionId, order: 0 },
        { id: 'artist-mix' as HomeSectionId, order: 1 },
      ];
    }
    return homePreferences.homeSections.filter((s) => s.enabled).sort((a, b) => a.order - b.order);
  }, [homePreferences]);

  // Renderiza cada sección por su ID
  const renderSection = (sectionId: HomeSectionId): ReactNode => {
    switch (sectionId) {
      case 'recent-albums':
        return <RecentAlbumsSection key="recent-albums" albums={displayedRecentAlbums} />;
      case 'artist-mix':
        return <ArtistMixSection key="artist-mix" playlists={artistMixPlaylists} />;
      case 'genre-mix':
        return <GenreMixSection key="genre-mix" playlists={genreMixPlaylists} />;
      case 'recently-played':
        return (
          <RecentlyPlayedSection key="recently-played" albums={displayedRecentlyPlayedAlbums} />
        );
      case 'top-played':
        return <TopPlayedSection key="top-played" albums={displayedTopPlayedAlbums} />;
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
        return <SharedAlbumsSection key="shared-albums" albums={sharedAlbums} />;
      default:
        return null;
    }
  };

  return (
    <div className={styles.homePage}>
      <Sidebar />
      <main className={styles.homePage__main}>
        <HeaderWithSearch alwaysGlass />
        <div className={styles.homePage__content}>
          {/* Hero con crossfade */}
          {loadingFeatured || loadingRecent || loadingTopPlayed ? (
            <div className={styles['hero--loading']}>
              <div className={styles['hero__cover--loading']} />
              <div className={styles['hero__info--loading']}>
                <div className={styles['hero__title--loading']} />
                <div className={styles['hero__subtitle--loading']} />
                <div className={styles['hero__button--loading']} />
              </div>
            </div>
          ) : currentItem ? (
            <div className={styles.heroCrossfade}>
              {exitingItem && (
                <div
                  key={`exit-${exitingItem.data.id}`}
                  className={`${styles.heroCrossfade__layer} ${styles['heroCrossfade__layer--exiting']}`}
                >
                  <HeroSection item={exitingItem} onNext={heroNext} onPrevious={heroPrevious} />
                </div>
              )}
              <div
                key={`enter-${currentItem.data.id}`}
                className={`${styles.heroCrossfade__layer} ${styles['heroCrossfade__layer--entering']}`}
              >
                <HeroSection item={currentItem} onNext={heroNext} onPrevious={heroPrevious} />
              </div>
            </div>
          ) : (
            <div className={styles.homePage__emptyState}>
              <p>{t('home.noFeaturedAlbum')}</p>
            </div>
          )}

          <ActionCardsRow />

          {/* Secciones dinámicas según preferencias */}
          {loadingRecent ? (
            <div className={styles['albumGrid--loading']}>
              <div className={styles['albumGrid__sectionTitle--loading']} />
              <div className={styles['albumGrid__grid--loading']}>
                {[...Array(6)].map((_, i) => (
                  <div key={`skeleton-${i}`} className={styles['albumCard--loading']}>
                    <div className={styles['albumCard__cover--loading']} />
                    <div className={styles['albumCard__title--loading']} />
                    <div className={styles['albumCard__artist--loading']} />
                  </div>
                ))}
              </div>
            </div>
          ) : enabledSections.length > 0 ? (
            <>{enabledSections.map((section) => renderSection(section.id))}</>
          ) : (
            <div className={styles.homePage__emptyState}>
              <p>{t('home.noAlbums')}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
