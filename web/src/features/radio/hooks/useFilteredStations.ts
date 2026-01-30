import { useMemo } from 'react';
import {
  useTopVotedStations,
  useStationsByCountry,
  useStationsByTag,
  useSearchStations,
} from './useRadioBrowser';
import type { RadioStation, RadioBrowserStation } from '../types';

export type RadioFilter = 'top' | 'all' | 'favorites' | string;

interface UseFilteredStationsOptions {
  filter: RadioFilter;
  country: string;
  stationsPerView: number;
  favoriteStations: RadioStation[];
}

interface UseFilteredStationsReturn {
  stations: (RadioStation | RadioBrowserStation)[];
  isLoading: boolean;
}

/**
 * Hook that handles radio station filtering logic
 * Encapsulates all the query combinations for different filter/country states
 */
export function useFilteredStations({
  filter,
  country,
  stationsPerView,
  favoriteStations,
}: UseFilteredStationsOptions): UseFilteredStationsReturn {
  // Determine filter types
  const isAllCountries = country === 'ALL';
  const isTopFilter = filter === 'top';
  const isAllFilter = filter === 'all';
  const isFavoritesFilter = filter === 'favorites';
  const isGenreFilter = !isTopFilter && !isAllFilter && !isFavoritesFilter;

  // 1. Top stations global
  const { data: topVotedStations = [], isLoading: loadingTopVoted } = useTopVotedStations(
    isAllCountries && isTopFilter ? stationsPerView : 0
  );

  // 2. Top stations by country
  const { data: countryTopStations = [], isLoading: loadingCountryTop } = useStationsByCountry(
    !isAllCountries && isTopFilter ? country : '',
    stationsPerView
  );

  // 3. All stations from country
  const { data: allCountryStations = [], isLoading: loadingAllCountry } = useStationsByCountry(
    !isAllCountries && isAllFilter ? country : '',
    10000
  );

  // 4. All stations worldwide
  const { data: allWorldStations = [], isLoading: loadingAllWorld } = useSearchStations(
    {
      limit: 10000,
      order: 'bitrate',
      reverse: true,
      hidebroken: true,
      removeDuplicates: true,
    },
    isAllCountries && isAllFilter
  );

  // 5. Genre + country filter
  const { data: genreCountryStations = [], isLoading: loadingGenreCountry } = useSearchStations(
    {
      tag: isGenreFilter ? filter : undefined,
      countrycode: !isAllCountries && isGenreFilter ? country : undefined,
      limit: 10000,
      order: 'bitrate',
      reverse: true,
      hidebroken: true,
      removeDuplicates: true,
    },
    isGenreFilter && !isAllCountries
  );

  // 6. Genre global filter
  const { data: genreGlobalStations = [], isLoading: loadingGenreGlobal } = useStationsByTag(
    isGenreFilter && isAllCountries ? filter : '',
    10000
  );

  // Select the appropriate stations list
  const stations = useMemo(() => {
    if (isFavoritesFilter) return favoriteStations;
    if (isAllCountries && isTopFilter) return topVotedStations;
    if (!isAllCountries && isTopFilter) return countryTopStations;
    if (isAllCountries && isAllFilter) return allWorldStations;
    if (!isAllCountries && isAllFilter) return allCountryStations;
    if (isGenreFilter && !isAllCountries) return genreCountryStations;
    if (isGenreFilter && isAllCountries) return genreGlobalStations;
    return [];
  }, [
    isAllCountries,
    isTopFilter,
    isAllFilter,
    isFavoritesFilter,
    isGenreFilter,
    topVotedStations,
    countryTopStations,
    allWorldStations,
    allCountryStations,
    genreCountryStations,
    genreGlobalStations,
    favoriteStations,
  ]);

  // Combined loading state
  const isLoading =
    loadingTopVoted ||
    loadingCountryTop ||
    loadingAllCountry ||
    loadingAllWorld ||
    loadingGenreCountry ||
    loadingGenreGlobal;

  return { stations, isLoading };
}
