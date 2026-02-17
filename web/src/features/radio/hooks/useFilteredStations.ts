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

// Encapsula las combinaciones de queries según filtro/país activo
export function useFilteredStations({
  filter,
  country,
  stationsPerView,
  favoriteStations,
}: UseFilteredStationsOptions): UseFilteredStationsReturn {
  const isAllCountries = country === 'ALL';
  const isTopFilter = filter === 'top';
  const isAllFilter = filter === 'all';
  const isFavoritesFilter = filter === 'favorites';
  const isGenreFilter = !isTopFilter && !isAllFilter && !isFavoritesFilter;

  const { data: topVotedStations = [], isLoading: loadingTopVoted } = useTopVotedStations(
    isAllCountries && isTopFilter ? stationsPerView : 0
  );

  const { data: countryTopStations = [], isLoading: loadingCountryTop } = useStationsByCountry(
    !isAllCountries && isTopFilter ? country : '',
    stationsPerView
  );

  const { data: allCountryStations = [], isLoading: loadingAllCountry } = useStationsByCountry(
    !isAllCountries && isAllFilter ? country : '',
    10000
  );

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

  const { data: genreGlobalStations = [], isLoading: loadingGenreGlobal } = useStationsByTag(
    isGenreFilter && isAllCountries ? filter : '',
    10000
  );

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

  const isLoading =
    loadingTopVoted ||
    loadingCountryTop ||
    loadingAllCountry ||
    loadingAllWorld ||
    loadingGenreCountry ||
    loadingGenreGlobal;

  return { stations, isLoading };
}
