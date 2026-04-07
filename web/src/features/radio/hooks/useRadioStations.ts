import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotification } from '@shared/hooks';
import { radioService } from '../services';
import type { SaveApiStationDto, CreateCustomStationDto } from '../types';
import { logger } from '@shared/utils/logger';

export function useFavoriteStations() {
  return useQuery({
    queryKey: ['radio', 'favorites'],
    queryFn: () => radioService.getFavorites(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useSaveFavoriteFromApi() {
  const queryClient = useQueryClient();
  const { showError } = useNotification();

  return useMutation({
    mutationFn: (stationData: SaveApiStationDto) => radioService.saveFavoriteFromApi(stationData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radio', 'favorites'] });
    },
    onError: (error) => {
      logger.error('[Radio] Failed to save favorite:', error);
      showError('Error al guardar favorito');
    },
  });
}

export function useCreateCustomStation() {
  const queryClient = useQueryClient();
  const { showError } = useNotification();

  return useMutation({
    mutationFn: (stationData: CreateCustomStationDto) =>
      radioService.createCustomStation(stationData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radio', 'favorites'] });
    },
    onError: (error) => {
      logger.error('[Radio] Failed to create station:', error);
      showError('Error al crear emisora');
    },
  });
}

export function useDeleteFavoriteStation() {
  const queryClient = useQueryClient();
  const { showError } = useNotification();

  return useMutation({
    mutationFn: (stationId: string) => radioService.deleteFavorite(stationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radio', 'favorites'] });
    },
    onError: (error) => {
      logger.error('[Radio] Failed to delete favorite:', error);
      showError('Error al eliminar favorito');
    },
  });
}

export function useIsInFavorites(stationUuid: string) {
  return useQuery({
    queryKey: ['radio', 'is-favorite', stationUuid],
    queryFn: () => radioService.isInFavorites(stationUuid),
    enabled: !!stationUuid,
    staleTime: 1 * 60 * 1000,
  });
}
