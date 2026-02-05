import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Header } from '@shared/components/layout/Header';
import { Sidebar } from '@features/home/components';
import { Pagination } from '@shared/components/ui';
import { useGridDimensions } from '@features/home/hooks';
import { usePlayer } from '@features/player/context/PlayerContext';
import { useModal } from '@shared/hooks';
import {
  RadioStationCard,
  RadioSearchBar,
  RadioSearchPanel,
  CountrySelectButton,
  CountrySelectModal,
  GenreSelectModal,
} from '../../components';
import {
  useUserCountry,
  useSearchStations,
  useFavoriteStations,
  useSaveFavoriteFromApi,
  useDeleteFavoriteStation,
  useRadioCountries,
  useFilteredStations,
} from '../../hooks';
import { radioService } from '../../services';
import { POPULAR_COUNTRIES, GENRES } from '../../constants';
import type { RadioStation, RadioBrowserStation } from '../../types';
import type { Country } from '../../components/CountrySelect/CountrySelect';
import { getCountryFlag, getCountryName } from '../../utils/country.utils';
import { Radio, Music2 } from 'lucide-react';
import { logger } from '@shared/utils/logger';
import styles from './RadioPage.module.css';

export default function RadioPage() {
  // Player context
  const { playRadio, currentRadioStation, isPlaying, isRadioMode, radioMetadata } = usePlayer();

  // Ref for content to control scroll
  const contentRef = useRef<HTMLDivElement>(null);

  // Calculate grid dimensions for 3 rows
  const { itemsPerPage: stationsPerView } = useGridDimensions({
    maxRows: 3,
    headerHeight: 180, // Search bar + filters height
  });

  // State
  const { data: userCountry } = useUserCountry();
  const { data: apiCountries = [] } = useRadioCountries();
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('top');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);

  // Modal state management
  const countryModal = useModal();
  const genreModal = useModal();

  // Transform API countries to Country format
  const allCountries: Country[] = useMemo(() => {
    if (apiCountries.length === 0) {
      // Fallback to popular countries if API fails
      return POPULAR_COUNTRIES;
    }

    return apiCountries
      .filter(country => country.stationcount > 0) // Only countries with stations
      .map(country => ({
        code: country.iso_3166_1,
        name: getCountryName(country.iso_3166_1, country.name),
        flag: getCountryFlag(country.iso_3166_1),
        stationCount: country.stationcount
      }));
  }, [apiCountries]);

  // Favorites
  const { data: favoriteStations = [] } = useFavoriteStations();
  const saveFavoriteMutation = useSaveFavoriteFromApi();
  const deleteFavoriteMutation = useDeleteFavoriteStation();

  // Dynamic genres list - add Favorites if user has any
  const availableGenres = useMemo(() => {
    const genres = [...GENRES];

    // Add "Favoritas" option if user has favorite stations
    if (favoriteStations.length > 0) {
      // Insert after "Todas" (index 1)
      genres.splice(2, 0, {
        id: 'favorites',
        label: `Favoritas (${favoriteStations.length})`,
        icon: '💙'
      });
    }

    return genres;
  }, [favoriteStations.length]);

  // Initialize selected country when user country is detected
  useEffect(() => {
    if (userCountry?.countryCode && !selectedCountry) {
      setSelectedCountry(userCountry.countryCode);
    }
  }, [userCountry, selectedCountry]);

  // Auto-select Favorites filter on initial page load (only once)
  const hasInitializedFilter = useRef(false);
  useEffect(() => {
    // Only run once when favorites data is first loaded
    if (!hasInitializedFilter.current && favoriteStations.length > 0) {
      hasInitializedFilter.current = true;
      setActiveFilter('favorites');
    }
  }, [favoriteStations.length]);

  // Block content scroll when search panel is open
  useEffect(() => {
    if (contentRef.current) {
      if (isSearchPanelOpen) {
        contentRef.current.style.overflow = 'hidden';
      } else {
        contentRef.current.style.overflow = 'auto';
      }
    }
  }, [isSearchPanelOpen]);

  // Search stations query (trae todos los resultados, pagina localmente)
  const { data: searchResults = [], isLoading: isSearching } = useSearchStations(
    {
      name: searchQuery,
      limit: 10000, // Traer todas las emisoras que coincidan
      order: 'bitrate',
      reverse: true,
      hidebroken: true,
      removeDuplicates: true
    },
    searchQuery.length >= 2
  );

  // Filter type flags for UI display
  const isAllCountries = selectedCountry === 'ALL';
  const isTopFilter = activeFilter === 'top';
  const isAllFilter = activeFilter === 'all';
  const isFavoritesFilter = activeFilter === 'favorites';

  // Use the filtered stations hook
  const { stations, isLoading } = useFilteredStations({
    filter: activeFilter,
    country: selectedCountry,
    stationsPerView,
    favoriteStations,
  });

  // Paginate stations (3 rows per page, dynamic based on screen size)
  // Top filter doesn't paginate (shows only 1 full page), others do
  const shouldPaginate = !isTopFilter;
  const totalPages = shouldPaginate ? Math.ceil(stations.length / stationsPerView) : 1;
  const paginatedStations = shouldPaginate
    ? stations.slice((currentPage - 1) * stationsPerView, currentPage * stationsPerView)
    : stations;

  // Handlers
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    // Open panel when query has 2+ characters
    setIsSearchPanelOpen(query.length >= 2);
  }, []);

  const handleSearchFocus = useCallback(() => {
    if (searchQuery.length >= 2) {
      setIsSearchPanelOpen(true);
    }
  }, [searchQuery]);

  const handleSearchBlur = useCallback(() => {
    // Panel will auto-close when query is cleared or user clicks result
  }, []);

  const handleResultSelect = useCallback((station: RadioStation | RadioBrowserStation) => {
    playRadio(station);
    setIsSearchPanelOpen(false);
    setSearchQuery(''); // Clear search
  }, [playRadio]);

  const handleCloseSearchPanel = useCallback(() => {
    setIsSearchPanelOpen(false);
  }, []);

  const handleCountryChange = useCallback((countryCode: string) => {
    setSelectedCountry(countryCode);
    setCurrentPage(1); // Reset pagination
  }, []);

  const handleFilterChange = useCallback((filterId: string) => {
    setActiveFilter(filterId);
    setCurrentPage(1); // Reset pagination
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Play station handler
  const handlePlayStation = useCallback((station: RadioBrowserStation | RadioStation) => {
    playRadio(station);
  }, [playRadio]);

  // Toggle favorite handler
  const handleToggleFavorite = useCallback(async (station: RadioBrowserStation | RadioStation) => {
    try {
      // Get stationUuid - handle both RadioBrowserStation and RadioStation
      const stationUuid = 'stationuuid' in station ? station.stationuuid : station.stationUuid;

      const isInFavorites = favoriteStations.some(
        (fav) => fav.stationUuid === stationUuid
      );

      if (isInFavorites) {
        const favoriteStation = favoriteStations.find(
          (fav) => fav.stationUuid === stationUuid
        );
        if (favoriteStation?.id) {
          await deleteFavoriteMutation.mutateAsync(favoriteStation.id);
        }
      } else {
        // Only RadioBrowserStation can be added as favorite
        if ('stationuuid' in station) {
          const dto = radioService.convertToSaveDto(station);
          await saveFavoriteMutation.mutateAsync(dto);
          // Don't auto-switch to favorites - let user stay on current view
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.error('Failed to toggle favorite:', error);
      }
    }
  }, [favoriteStations, saveFavoriteMutation, deleteFavoriteMutation]);

  // Helper: Check if station is playing
  const isStationPlaying = useCallback((station: RadioBrowserStation | RadioStation) => {
    if (!isRadioMode || !currentRadioStation) return false;
    const stationUuid = 'stationuuid' in station ? station.stationuuid : station.stationUuid;
    const currentUuid = 'stationuuid' in currentRadioStation
      ? currentRadioStation.stationuuid
      : currentRadioStation.stationUuid;
    return isPlaying && stationUuid === currentUuid;
  }, [isRadioMode, currentRadioStation, isPlaying]);

  // Helper: Check if station is favorite
  const isStationFavorite = useCallback((station: RadioBrowserStation | RadioStation) => {
    const stationUuid = 'stationuuid' in station ? station.stationuuid : station.stationUuid;
    return favoriteStations.some((fav) => fav.stationUuid === stationUuid);
  }, [favoriteStations]);

  // Get country name for display
  const selectedCountryName = useMemo(() => {
    const country = allCountries.find(c => c.code === selectedCountry);
    return country?.name || 'tu país';
  }, [selectedCountry, allCountries]);

  // Get filter label for display
  const activeFilterLabel = useMemo(() => {
    const filter = availableGenres.find(f => f.id === activeFilter);
    return filter?.label || '';
  }, [activeFilter, availableGenres]);

  return (
    <div className={styles.radioPage}>
      <Sidebar />

      <main className={styles.radioPage__main}>
        <Header
          customSearch={
            <RadioSearchBar
              onSearch={handleSearch}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              placeholder="Buscar emisora por nombre, país o género..."
            />
          }
          customContent={
            <CountrySelectButton
              countries={allCountries}
              selectedCountry={selectedCountry || userCountry?.countryCode || 'ES'}
              onClick={countryModal.open}
            />
          }
        />

        {/* Search Results Panel - Expands below header */}
        <RadioSearchPanel
          isOpen={isSearchPanelOpen}
          searchResults={searchResults}
          isLoading={isSearching}
          query={searchQuery}
          onResultSelect={handleResultSelect}
          onClose={handleCloseSearchPanel}
        />

        <div ref={contentRef} className={styles.radioPage__content}>
          {/* Page Header */}
          <div className={styles.radioPage__pageHeader}>
            <h1 className={styles.radioPage__pageTitle}>Radio</h1>
            <p className={styles.radioPage__pageSubtitle}>
              Descubre emisoras de radio de todo el mundo
            </p>
          </div>

          {/* Genre selector button */}
          <div className={styles.radioPage__filters}>
            <button
              className={styles.radioPage__genreButton}
              onClick={genreModal.open}
            >
              <Music2 size={20} />
              <span>Género: {activeFilterLabel}</span>
              <span className={styles.radioPage__genreButtonArrow}>▼</span>
            </button>
          </div>

          {/* Main stations grid */}
          <div className={styles.radioPage__section}>
            <h2 className={styles.radioPage__title}>
              <Radio size={24} />
              {isFavoritesFilter
                ? 'Mis favoritas'
                : isAllCountries
                  ? 'Top emisoras del mundo'
                  : `Emisoras de ${selectedCountryName}`}
              {!isTopFilter && !isAllFilter && !isFavoritesFilter && ` - ${activeFilterLabel}`}
              {stations.length > 0 && (
                <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: '8px' }}>
                  ({stations.length} {stations.length === 1 ? 'emisora' : 'emisoras'})
                </span>
              )}
            </h2>

            {/* Top Pagination - Mobile Only */}
            {!isLoading && paginatedStations.length > 0 && totalPages > 1 && (
              <div className={styles.radioPage__paginationTop}>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  disabled={isLoading}
                />
              </div>
            )}

            {isLoading ? (
              <div className={styles.radioPage__loading}>
                <p>Cargando emisoras...</p>
              </div>
            ) : paginatedStations.length > 0 ? (
              <div className={styles.radioPage__gridWrapper}>
                <div className={styles.radioPage__grid}>
                  {paginatedStations.map((station) => {
                    // Get unique key - handle both RadioBrowserStation and RadioStation
                    const key = 'stationuuid' in station
                      ? station.stationuuid
                      : (station.id || station.stationUuid || station.url);

                    return (
                      <RadioStationCard
                        key={key}
                        station={station}
                        isFavorite={isStationFavorite(station)}
                        isPlaying={isStationPlaying(station)}
                        currentMetadata={isStationPlaying(station) ? radioMetadata : null}
                        onPlay={() => handlePlayStation(station)}
                        onToggleFavorite={() => handleToggleFavorite(station)}
                      />
                    );
                  })}
                </div>

                {/* Pagination */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  disabled={isLoading}
                />
              </div>
            ) : (
              <div className={styles.radioPage__empty}>
                <Radio size={48} />
                <p>No se encontraron emisoras</p>
                <p className={styles.radioPage__emptyHint}>
                  Intenta cambiar el filtro o país seleccionado
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Country Selection Modal */}
      <CountrySelectModal
        isOpen={countryModal.isOpen}
        onClose={countryModal.close}
        countries={allCountries}
        selectedCountry={selectedCountry || userCountry?.countryCode || 'ES'}
        onChange={handleCountryChange}
        userCountryCode={userCountry?.countryCode}
      />

      {/* Genre Selection Modal */}
      <GenreSelectModal
        isOpen={genreModal.isOpen}
        onClose={genreModal.close}
        genres={availableGenres}
        selectedGenre={activeFilter}
        onChange={handleFilterChange}
      />
    </div>
  );
}
