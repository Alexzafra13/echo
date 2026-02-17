import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { radioService } from '../services';
import type { SaveApiStationDto, CreateCustomStationDto } from '../types';

export function useFavoriteStations() {
  return useQuery({
    queryKey: ['radio', 'favorites'],
    queryFn: () => radioService.getFavorites(),
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

export function useSaveFavoriteFromApi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stationData: SaveApiStationDto) =>
      radioService.saveFavoriteFromApi(stationData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radio', 'favorites'] });
    },
  });
}

export function useCreateCustomStation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stationData: CreateCustomStationDto) =>
      radioService.createCustomStation(stationData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radio', 'favorites'] });
    },
  });
}

export function useDeleteFavoriteStation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stationId: string) => radioService.deleteFavorite(stationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radio', 'favorites'] });
    },
  });
}

export function useIsInFavorites(stationUuid: string) {
  return useQuery({
    queryKey: ['radio', 'is-favorite', stationUuid],
    queryFn: () => radioService.isInFavorites(stationUuid),
    enabled: !!stationUuid,
    staleTime: 1 * 60 * 1000, // 1 minuto
  });
}
