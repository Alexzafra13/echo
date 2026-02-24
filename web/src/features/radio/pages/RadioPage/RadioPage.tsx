import { useCallback, useMemo, useEffect, useRef, useReducer } from 'react';
import { Header } from '@shared/components/layout/Header';
import headerStyles from '@shared/components/layout/Header/Header.module.css';
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

// Unified state for all interdependent radio page UI state.
// Using a reducer prevents impossible state combinations (e.g. search open
// with empty query) and ensures page resets when filters/country change.
interface RadioPageState {
  selectedCountry: string;
  activeFilter: string;
  searchQuery: string;
  currentPage: number;
  isSearchPanelOpen: boolean;
}

type RadioPageAction =
  | { type: 'SET_COUNTRY'; country: string }
  | { type: 'SET_FILTER'; filter: string }
  | { type: 'SEARCH'; query: string }
  | { type: 'SEARCH_FOCUS' }
  | { type: 'SELECT_RESULT' }
  | { type: 'CLOSE_SEARCH' }
  | { type: 'SET_PAGE'; page: number };

function radioPageReducer(state: RadioPageState, action: RadioPageAction): RadioPageState {
  switch (action.type) {
    case 'SET_COUNTRY':
      return { ...state, selectedCountry: action.country, currentPage: 1 };
    case 'SET_FILTER':
      return { ...state, activeFilter: action.filter, currentPage: 1 };
    case 'SEARCH':
      return { ...state, searchQuery: action.query, isSearchPanelOpen: action.query.length >= 2 };
    case 'SEARCH_FOCUS':
      return state.searchQuery.length >= 2 ? { ...state, isSearchPanelOpen: true } : state;
    case 'SELECT_RESULT':
      return { ...state, isSearchPanelOpen: false, searchQuery: '' };
    case 'CLOSE_SEARCH':
      return { ...state, isSearchPanelOpen: false };
    case 'SET_PAGE':
      return { ...state, currentPage: action.page };
  }
}

const initialRadioState: RadioPageState = {
  selectedCountry: '',
  activeFilter: 'top',
  searchQuery: '',
  currentPage: 1,
  isSearchPanelOpen: false,
};

export default function RadioPage() {
  const { playRadio, currentRadioStation, isPlaying, isRadioMode, radioMetadata } = usePlayer();

  const contentRef = useRef<HTMLDivElement>(null);

  const { itemsPerPage: stationsPerView } = useGridDimensions({
    maxRows: 3,
    headerHeight: 180,
  });

  const { data: userCountry } = useUserCountry();
  const { data: apiCountries = [] } = useRadioCountries();
  const [state, dispatch] = useReducer(radioPageReducer, initialRadioState);
  const { selectedCountry, activeFilter, searchQuery, currentPage, isSearchPanelOpen } = state;

  const countryModal = useModal();
  const genreModal = useModal();

  const allCountries: Country[] = useMemo(() => {
    if (apiCountries.length === 0) {
      return POPULAR_COUNTRIES;
    }

    return apiCountries
      .filter(country => country.stationcount > 0)
      .map(country => ({
        code: country.iso_3166_1,
        name: getCountryName(country.iso_3166_1, country.name),
        flag: getCountryFlag(country.iso_3166_1),
        stationCount: country.stationcount
      }));
  }, [apiCountries]);

  const { data: favoriteStations = [] } = useFavoriteStations();
  const saveFavoriteMutation = useSaveFavoriteFromApi();
  const deleteFavoriteMutation = useDeleteFavoriteStation();

  // Agrega "Favoritas" dinámicamente si el usuario tiene estaciones guardadas
  const availableGenres = useMemo(() => {
    const genres = [...GENRES];

    if (favoriteStations.length > 0) {
      genres.splice(2, 0, {
        id: 'favorites',
        label: `Favoritas (${favoriteStations.length})`,
        icon: '💙'
      });
    }

    return genres;
  }, [favoriteStations.length]);

  useEffect(() => {
    if (userCountry?.countryCode && !selectedCountry) {
      dispatch({ type: 'SET_COUNTRY', country: userCountry.countryCode });
    }
  }, [userCountry, selectedCountry]);

  // Selecciona "Favoritas" automáticamente en la primera carga si existen
  const hasInitializedFilter = useRef(false);
  useEffect(() => {
    if (!hasInitializedFilter.current && favoriteStations.length > 0) {
      hasInitializedFilter.current = true;
      dispatch({ type: 'SET_FILTER', filter: 'favorites' });
    }
  }, [favoriteStations.length]);

  useEffect(() => {
    if (contentRef.current) {
      if (isSearchPanelOpen) {
        contentRef.current.style.overflow = 'hidden';
      } else {
        contentRef.current.style.overflow = 'auto';
      }
    }
  }, [isSearchPanelOpen]);

  const { data: searchResults = [], isLoading: isSearching } = useSearchStations(
    {
      name: searchQuery,
      limit: 10000,
      order: 'bitrate',
      reverse: true,
      hidebroken: true,
      removeDuplicates: true
    },
    searchQuery.length >= 2
  );

  const isAllCountries = selectedCountry === 'ALL';
  const isTopFilter = activeFilter === 'top';
  const isAllFilter = activeFilter === 'all';
  const isFavoritesFilter = activeFilter === 'favorites';

  const { stations, isLoading } = useFilteredStations({
    filter: activeFilter,
    country: selectedCountry,
    stationsPerView,
    favoriteStations,
  });

  // Top no pagina (muestra solo 1 página), los demás sí
  const shouldPaginate = !isTopFilter;
  const totalPages = shouldPaginate ? Math.ceil(stations.length / stationsPerView) : 1;
  const paginatedStations = shouldPaginate
    ? stations.slice((currentPage - 1) * stationsPerView, currentPage * stationsPerView)
    : stations;

  const handleSearch = useCallback((query: string) => {
    dispatch({ type: 'SEARCH', query });
  }, []);

  const handleSearchFocus = useCallback(() => {
    dispatch({ type: 'SEARCH_FOCUS' });
  }, []);

  const handleSearchBlur = useCallback(() => {
  }, []);

  const handleResultSelect = useCallback((station: RadioStation | RadioBrowserStation) => {
    playRadio(station);
    dispatch({ type: 'SELECT_RESULT' });
  }, [playRadio]);

  const handleCloseSearchPanel = useCallback(() => {
    dispatch({ type: 'CLOSE_SEARCH' });
  }, []);

  const handleCountryChange = useCallback((countryCode: string) => {
    dispatch({ type: 'SET_COUNTRY', country: countryCode });
  }, []);

  const handleFilterChange = useCallback((filterId: string) => {
    dispatch({ type: 'SET_FILTER', filter: filterId });
  }, []);

  const handlePageChange = useCallback((page: number) => {
    dispatch({ type: 'SET_PAGE', page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handlePlayStation = useCallback((station: RadioBrowserStation | RadioStation) => {
    playRadio(station);
  }, [playRadio]);

  const handleToggleFavorite = useCallback(async (station: RadioBrowserStation | RadioStation) => {
    try {
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
        if ('stationuuid' in station) {
          const dto = radioService.convertToSaveDto(station);
          await saveFavoriteMutation.mutateAsync(dto);
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.error('Failed to toggle favorite:', error);
      }
    }
  }, [favoriteStations, saveFavoriteMutation, deleteFavoriteMutation]);

  const isStationPlaying = useCallback((station: RadioBrowserStation | RadioStation) => {
    if (!isRadioMode || !currentRadioStation) return false;
    const stationUuid = 'stationuuid' in station ? station.stationuuid : station.stationUuid;
    const currentUuid = 'stationuuid' in currentRadioStation
      ? currentRadioStation.stationuuid
      : currentRadioStation.stationUuid;
    return isPlaying && stationUuid === currentUuid;
  }, [isRadioMode, currentRadioStation, isPlaying]);

  const isStationFavorite = useCallback((station: RadioBrowserStation | RadioStation) => {
    const stationUuid = 'stationuuid' in station ? station.stationuuid : station.stationUuid;
    return favoriteStations.some((fav) => fav.stationUuid === stationUuid);
  }, [favoriteStations]);

  const selectedCountryName = useMemo(() => {
    const country = allCountries.find(c => c.code === selectedCountry);
    return country?.name || 'tu país';
  }, [selectedCountry, allCountries]);

  const activeFilterLabel = useMemo(() => {
    const filter = availableGenres.find(f => f.id === activeFilter);
    return filter?.label || '';
  }, [activeFilter, availableGenres]);

  return (
    <div className={styles.radioPage}>
      <Sidebar />

      <main className={styles.radioPage__main}>
        <div className={headerStyles.headerWrapper}>
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

          <RadioSearchPanel
            isOpen={isSearchPanelOpen}
            searchResults={searchResults}
            isLoading={isSearching}
            query={searchQuery}
            onResultSelect={handleResultSelect}
            onClose={handleCloseSearchPanel}
          />
        </div>

        <div ref={contentRef} className={styles.radioPage__content}>
          <div className={styles.radioPage__pageHeader}>
            <h1 className={styles.radioPage__pageTitle}>Radio</h1>
            <p className={styles.radioPage__pageSubtitle}>
              Descubre emisoras de radio de todo el mundo
            </p>
          </div>

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

      <CountrySelectModal
        isOpen={countryModal.isOpen}
        onClose={countryModal.close}
        countries={allCountries}
        selectedCountry={selectedCountry || userCountry?.countryCode || 'ES'}
        onChange={handleCountryChange}
        userCountryCode={userCountry?.countryCode}
      />

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
