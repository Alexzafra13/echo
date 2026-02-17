import { useQuery } from '@tanstack/react-query';
import { radioService } from '../services';
import type { SearchStationsParams } from '../types';

export function useSearchStations(params: SearchStationsParams, enabled: boolean = true) {
  return useQuery({
    queryKey: ['radio', 'search', params],
    queryFn: () => radioService.searchStations(params),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useTopVotedStations(limit: number = 20) {
  return useQuery({
    queryKey: ['radio', 'top-voted', limit],
    queryFn: () => radioService.getTopVoted(limit),
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function usePopularStations(limit: number = 20) {
  return useQuery({
    queryKey: ['radio', 'popular', limit],
    queryFn: () => radioService.getPopular(limit),
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function useStationsByCountry(countryCode: string, limit: number = 50) {
  return useQuery({
    queryKey: ['radio', 'by-country', countryCode, limit],
    queryFn: () => radioService.getByCountry(countryCode, limit),
    enabled: !!countryCode,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStationsByTag(tag: string, limit: number = 50) {
  return useQuery({
    queryKey: ['radio', 'by-tag', tag, limit],
    queryFn: () => radioService.getByTag(tag, limit),
    enabled: !!tag,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRadioTags(limit: number = 100) {
  return useQuery({
    queryKey: ['radio', 'tags', limit],
    queryFn: () => radioService.getTags(limit),
    staleTime: 30 * 60 * 1000, // 30 minutos (cambia poco)
  });
}

export function useRadioCountries() {
  return useQuery({
    queryKey: ['radio', 'countries'],
    queryFn: () => radioService.getCountries(),
    staleTime: 30 * 60 * 1000, // 30 minutos (cambia poco)
  });
}
