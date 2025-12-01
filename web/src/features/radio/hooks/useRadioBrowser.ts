import { useQuery } from '@tanstack/react-query';
import { radioService } from '../services';
import type { SearchStationsParams } from '../types';

/**
 * Hook to search stations in Radio Browser API
 */
export function useSearchStations(params: SearchStationsParams, enabled: boolean = true) {
  return useQuery({
    queryKey: ['radio', 'search', params],
    queryFn: () => radioService.searchStations(params),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook to fetch top voted stations
 */
export function useTopVotedStations(limit: number = 20) {
  return useQuery({
    queryKey: ['radio', 'top-voted', limit],
    queryFn: () => radioService.getTopVoted(limit),
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

/**
 * Hook to fetch popular stations
 */
export function usePopularStations(limit: number = 20) {
  return useQuery({
    queryKey: ['radio', 'popular', limit],
    queryFn: () => radioService.getPopular(limit),
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

/**
 * Hook to fetch stations by country
 */
export function useStationsByCountry(countryCode: string, limit: number = 50) {
  return useQuery({
    queryKey: ['radio', 'by-country', countryCode, limit],
    queryFn: () => radioService.getByCountry(countryCode, limit),
    enabled: !!countryCode,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch stations by tag (genre)
 */
export function useStationsByTag(tag: string, limit: number = 50) {
  return useQuery({
    queryKey: ['radio', 'by-tag', tag, limit],
    queryFn: () => radioService.getByTag(tag, limit),
    enabled: !!tag,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch available tags (genres)
 */
export function useRadioTags(limit: number = 100) {
  return useQuery({
    queryKey: ['radio', 'tags', limit],
    queryFn: () => radioService.getTags(limit),
    staleTime: 30 * 60 * 1000, // 30 minutos (cambia poco)
  });
}

/**
 * Hook to fetch available countries
 */
export function useRadioCountries() {
  return useQuery({
    queryKey: ['radio', 'countries'],
    queryFn: () => radioService.getCountries(),
    staleTime: 30 * 60 * 1000, // 30 minutos (cambia poco)
  });
}
