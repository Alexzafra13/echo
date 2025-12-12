import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { radioService } from '../services';
import type { SaveApiStationDto, CreateCustomStationDto } from '../types';

/**
 * Hook to fetch user's favorite stations
 * Non-blocking: won't retry on failure to avoid blocking page load
 */
export function useFavoriteStations() {
  return useQuery({
    queryKey: ['radio', 'favorites'],
    queryFn: () => radioService.getFavorites(),
    staleTime: 2 * 60 * 1000, // 2 minutos
    retry: false, // Don't retry - optional feature
    placeholderData: [], // Show empty while loading
  });
}

/**
 * Hook to save a station from Radio Browser API as favorite
 */
export function useSaveFavoriteFromApi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stationData: SaveApiStationDto) =>
      radioService.saveFavoriteFromApi(stationData),
    onSuccess: () => {
      // Invalidate favorites list to refetch
      queryClient.invalidateQueries({ queryKey: ['radio', 'favorites'] });
    },
  });
}

/**
 * Hook to create a custom radio station
 */
export function useCreateCustomStation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stationData: CreateCustomStationDto) =>
      radioService.createCustomStation(stationData),
    onSuccess: () => {
      // Invalidate favorites list to refetch
      queryClient.invalidateQueries({ queryKey: ['radio', 'favorites'] });
    },
  });
}

/**
 * Hook to delete a favorite station
 */
export function useDeleteFavoriteStation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stationId: string) => radioService.deleteFavorite(stationId),
    onSuccess: () => {
      // Invalidate favorites list to refetch
      queryClient.invalidateQueries({ queryKey: ['radio', 'favorites'] });
    },
  });
}

/**
 * Hook to check if a station is in favorites
 */
export function useIsInFavorites(stationUuid: string) {
  return useQuery({
    queryKey: ['radio', 'is-favorite', stationUuid],
    queryFn: () => radioService.isInFavorites(stationUuid),
    enabled: !!stationUuid,
    staleTime: 1 * 60 * 1000, // 1 minuto
  });
}
