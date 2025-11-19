import { useState, useCallback, useMemo, useEffect } from 'react';
import { Header } from '@shared/components/layout/Header';
import { Sidebar } from '@features/home/components';
import { useGridDimensions } from '@features/home/hooks';
import { usePlayer } from '@features/player/context/PlayerContext';
import {
  RadioStationCard,
  RadioSearchBar,
  RadioSearchPanel,
  CountrySelectButton,
  CountrySelectModal,
  FilterTabs
} from '../../components';
import {
  useUserCountry,
  useTopVotedStations,
  useStationsByCountry,
  useStationsByTag,
  useSearchStations,
  useFavoriteStations,
  useSaveFavoriteFromApi,
  useDeleteFavoriteStation,
  useRadioCountries
} from '../../hooks';
import { radioService } from '../../services';
import type { RadioStation, RadioBrowserStation } from '../../types';
import type { Country } from '../../components/CountrySelect/CountrySelect';
import { getCountryFlag, getCountryName } from '../../utils/country.utils';
import { Radio } from 'lucide-react';
import styles from './RadioPage.module.css';

// Países populares con banderas
const POPULAR_COUNTRIES: Country[] = [
  { code: 'ES', name: 'España', flag: '🇪🇸' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'GB', name: 'Reino Unido', flag: '🇬🇧' },
  { code: 'FR', name: 'Francia', flag: '🇫🇷' },
  { code: 'DE', name: 'Alemania', flag: '🇩🇪' },
  { code: 'IT', name: 'Italia', flag: '🇮🇹' },
  { code: 'MX', name: 'México', flag: '🇲🇽' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
  { code: 'JP', name: 'Japón', flag: '🇯🇵' },
];

// Filtros disponibles
const FILTER_TABS = [
  { id: 'top', label: 'Top' },
  { id: 'all', label: 'Todas' },
  { id: 'rock', label: 'Rock' },
  { id: 'pop', label: 'Pop' },
  { id: 'news', label: 'News' },
  { id: 'jazz', label: 'Jazz' },
  { id: 'dance', label: 'Dance' },
  { id: 'electronic', label: 'Electronic' },
];

export default function RadioPage() {
  // Player context
  const { playRadio, currentRadioStation, isPlaying, isRadioMode } = usePlayer();

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
  const [favoritesPage, setFavoritesPage] = useState(1);
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);

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

  // Initialize selected country when user country is detected
  useEffect(() => {
    if (userCountry?.countryCode && !selectedCountry) {
      setSelectedCountry(userCountry.countryCode);
    }
  }, [userCountry, selectedCountry]);

  // Search stations query
  const { data: searchResults = [], isLoading: isSearching } = useSearchStations(
    {
      name: searchQuery,
      limit: Math.max(stationsPerView * 3, 60), // 3 páginas o mínimo 60
      order: 'bitrate',
      reverse: true,
      hidebroken: true,
      removeDuplicates: true
    },
    searchQuery.length >= 2
  );

  // Determine which query to use based on filter and country
  const isAllCountries = selectedCountry === 'ALL';
  const isTopFilter = activeFilter === 'top';
  const isAllFilter = activeFilter === 'all';
  const isGenreFilter = !isTopFilter && !isAllFilter;

  // Queries for different filter combinations

  // 1. Top emisoras global (llenan exactamente 3 filas)
  const { data: topVotedStations = [], isLoading: loadingTopVoted } = useTopVotedStations(stationsPerView);

  // 2. Top emisoras por país (llenan exactamente 3 filas)
  const { data: countryTop20 = [], isLoading: loadingCountryTop } = useStationsByCountry(
    !isAllCountries && isTopFilter ? selectedCountry : '',
    stationsPerView
  );

  // 3. Todas las emisoras del país (múltiplo de stationsPerView para paginación limpia)
  const { data: allCountryStations = [], isLoading: loadingAllCountry } = useStationsByCountry(
    !isAllCountries && isAllFilter ? selectedCountry : '',
    Math.max(stationsPerView * 5, 100) // 5 páginas o mínimo 100
  );

  // 4. Todas las emisoras del mundo
  const { data: allWorldStations = [], isLoading: loadingAllWorld } = useSearchStations(
    {
      limit: Math.max(stationsPerView * 5, 100), // 5 páginas o mínimo 100
      order: 'bitrate',
      reverse: true,
      hidebroken: true,
      removeDuplicates: true
    },
    isAllCountries && isAllFilter
  );

  // 5. Filtro por género + país
  const { data: genreCountryStations = [], isLoading: loadingGenreCountry } = useSearchStations(
    {
      tag: isGenreFilter ? activeFilter : undefined,
      countrycode: !isAllCountries && isGenreFilter ? selectedCountry : undefined,
      limit: Math.max(stationsPerView * 5, 100), // 5 páginas o mínimo 100
      order: 'bitrate',
      reverse: true,
      hidebroken: true,
      removeDuplicates: true
    },
    isGenreFilter && !isAllCountries
  );

  // 6. Filtro por género global
  const { data: genreGlobalStations = [], isLoading: loadingGenreGlobal } = useStationsByTag(
    isGenreFilter && isAllCountries ? activeFilter : '',
    Math.max(stationsPerView * 5, 100) // 5 páginas o mínimo 100
  );

  // Select the appropriate stations list
  const stations = useMemo(() => {
    // Top emisoras mundial (mejor calidad/bitrate)
    if (isAllCountries && isTopFilter) return topVotedStations;

    // Top emisoras por país (mejor calidad/bitrate)
    if (!isAllCountries && isTopFilter) return countryTop20;

    // Todas del mundo
    if (isAllCountries && isAllFilter) return allWorldStations;

    // Todas del país
    if (!isAllCountries && isAllFilter) return allCountryStations;

    // Género + país
    if (isGenreFilter && !isAllCountries) return genreCountryStations;

    // Género global
    if (isGenreFilter && isAllCountries) return genreGlobalStations;

    return [];
  }, [
    isAllCountries, isTopFilter, isAllFilter, isGenreFilter,
    topVotedStations, countryTop20, allWorldStations, allCountryStations,
    genreCountryStations, genreGlobalStations
  ]);

  // Paginate stations (3 rows per page, dinámico según tamaño de pantalla)
  // Top no se pagina (solo muestra 1 página completa), el resto sí
  const shouldPaginate = !isTopFilter;
  const totalPages = shouldPaginate ? Math.ceil(stations.length / stationsPerView) : 1;
  const paginatedStations = shouldPaginate
    ? stations.slice((currentPage - 1) * stationsPerView, currentPage * stationsPerView)
    : stations;

  // Loading state
  const isLoading = loadingTopVoted || loadingCountryTop || loadingAllCountry ||
                    loadingAllWorld || loadingGenreCountry || loadingGenreGlobal;

  // Favorites pagination
  const { itemsPerPage: favoritesPerView } = useGridDimensions({
    maxRows: 2,
    headerHeight: 100,
  });
  const totalFavoritesPages = Math.ceil(favoriteStations.length / favoritesPerView);
  const paginatedFavorites = favoriteStations.slice(
    (favoritesPage - 1) * favoritesPerView,
    favoritesPage * favoritesPerView
  );

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
    // Don't close immediately - let click events fire first
    setTimeout(() => {
      // Panel will auto-close when query is cleared or user clicks result
    }, 200);
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

  const handleFavoritesPageChange = useCallback((page: number) => {
    setFavoritesPage(page);
  }, []);

  // Play station handler
  const handlePlayStation = useCallback((station: RadioBrowserStation | RadioStation) => {
    playRadio(station);
  }, [playRadio]);

  // Toggle favorite handler
  const handleToggleFavorite = useCallback(async (station: RadioBrowserStation) => {
    try {
      const isInFavorites = favoriteStations.some(
        (fav) => fav.stationUuid === station.stationuuid
      );

      if (isInFavorites) {
        const favoriteStation = favoriteStations.find(
          (fav) => fav.stationUuid === station.stationuuid
        );
        if (favoriteStation?.id) {
          await deleteFavoriteMutation.mutateAsync(favoriteStation.id);
        }
      } else {
        const dto = radioService.convertToSaveDto(station);
        await saveFavoriteMutation.mutateAsync(dto);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  }, [favoriteStations, saveFavoriteMutation, deleteFavoriteMutation]);

  // Remove favorite handler (for favoritas section)
  const handleRemoveFavorite = useCallback(async (stationId: string) => {
    try {
      await deleteFavoriteMutation.mutateAsync(stationId);
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  }, [deleteFavoriteMutation]);

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
  const isStationFavorite = useCallback((station: RadioBrowserStation) => {
    return favoriteStations.some((fav) => fav.stationUuid === station.stationuuid);
  }, [favoriteStations]);

  // Get country name for display
  const selectedCountryName = useMemo(() => {
    const country = allCountries.find(c => c.code === selectedCountry);
    return country?.name || 'tu país';
  }, [selectedCountry, allCountries]);

  // Get filter label for display
  const activeFilterLabel = useMemo(() => {
    const filter = FILTER_TABS.find(f => f.id === activeFilter);
    return filter?.label || '';
  }, [activeFilter]);

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
              onClick={() => setIsCountryModalOpen(true)}
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

        <div className={styles.radioPage__content}>

          {/* Filter tabs */}
          <div className={styles.radioPage__filters}>
            <FilterTabs
              tabs={FILTER_TABS}
              activeTab={activeFilter}
              onTabChange={handleFilterChange}
            />
          </div>

          {/* Main stations grid */}
          <div className={styles.radioPage__section}>
            <h2 className={styles.radioPage__title}>
              <Radio size={24} />
              {isAllCountries ? 'Top emisoras del mundo' :
               `Emisoras de ${selectedCountryName}`}
              {!isTopFilter && !isAllFilter && ` - ${activeFilterLabel}`}
            </h2>

            {isLoading ? (
              <div className={styles.radioPage__loading}>
                <p>Cargando emisoras...</p>
              </div>
            ) : paginatedStations.length > 0 ? (
              <>
                <div className={styles.radioPage__grid}>
                  {paginatedStations.map((station) => (
                    <RadioStationCard
                      key={station.stationuuid}
                      station={station}
                      isFavorite={isStationFavorite(station)}
                      isPlaying={isStationPlaying(station)}
                      onPlay={() => handlePlayStation(station)}
                      onToggleFavorite={() => handleToggleFavorite(station)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className={styles.radioPage__pagination}>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={styles.radioPage__paginationButton}
                    >
                      Anterior
                    </button>
                    <span className={styles.radioPage__paginationInfo}>
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={styles.radioPage__paginationButton}
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </>
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

          {/* Favorites section */}
          {favoriteStations.length > 0 && (
            <div className={styles.radioPage__section}>
              <h2 className={styles.radioPage__title}>
                <Radio size={24} />
                Mis favoritas
              </h2>

              <div className={styles.radioPage__grid}>
                {paginatedFavorites.map((station) => (
                  <RadioStationCard
                    key={station.id || station.stationUuid}
                    station={station}
                    isFavorite={true}
                    isPlaying={isStationPlaying(station)}
                    onPlay={() => handlePlayStation(station)}
                    onToggleFavorite={() => station.id && handleRemoveFavorite(station.id)}
                  />
                ))}
              </div>

              {/* Favorites pagination */}
              {totalFavoritesPages > 1 && (
                <div className={styles.radioPage__pagination}>
                  <button
                    onClick={() => handleFavoritesPageChange(favoritesPage - 1)}
                    disabled={favoritesPage === 1}
                    className={styles.radioPage__paginationButton}
                  >
                    Anterior
                  </button>
                  <span className={styles.radioPage__paginationInfo}>
                    Página {favoritesPage} de {totalFavoritesPages}
                  </span>
                  <button
                    onClick={() => handleFavoritesPageChange(favoritesPage + 1)}
                    disabled={favoritesPage === totalFavoritesPages}
                    className={styles.radioPage__paginationButton}
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Country Selection Modal */}
      <CountrySelectModal
        isOpen={isCountryModalOpen}
        onClose={() => setIsCountryModalOpen(false)}
        countries={allCountries}
        selectedCountry={selectedCountry || userCountry?.countryCode || 'ES'}
        onChange={handleCountryChange}
        userCountryCode={userCountry?.countryCode}
      />
    </div>
  );
}
