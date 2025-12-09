import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  artistAvatarsApi,
  ApplyArtistAvatarRequest,
  UpdateBackgroundPositionRequest,
  UploadCustomImageRequest,
  ApplyCustomImageRequest,
  DeleteCustomImageRequest,
} from '../api/artist-avatars.api';

/**
 * Hook para buscar avatares de artista
 */
export function useSearchArtistAvatars(artistId: string | null) {
  return useQuery({
    queryKey: ['artistAvatars', artistId],
    queryFn: () => artistAvatarsApi.searchAvatars(artistId!),
    enabled: !!artistId,
  });
}

/**
 * Hook para aplicar un avatar seleccionado
 */
export function useApplyArtistAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ApplyArtistAvatarRequest) =>
      artistAvatarsApi.applyAvatar(request),
    onSuccess: (_data, variables) => {
      // Invalidar queries relacionadas para refrescar las imágenes
      // IMPORTANTE: SSE ya emitirá un evento que invalidará automáticamente,
      // pero hacemos invalidación local inmediata para feedback instantáneo
      queryClient.invalidateQueries({ queryKey: ['artists', variables.artistId] });
      queryClient.invalidateQueries({ queryKey: ['artist-images', variables.artistId] });
      queryClient.invalidateQueries({ queryKey: ['artists'] }); // Lista de artistas
    },
  });
}

/**
 * Hook para actualizar la posición del fondo de un artista
 */
export function useUpdateBackgroundPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateBackgroundPositionRequest) =>
      artistAvatarsApi.updateBackgroundPosition(request),
    onSuccess: (_data, variables) => {
      // Invalidar queries para refrescar los datos del artista
      queryClient.invalidateQueries({ queryKey: ['artists', variables.artistId] });
      queryClient.invalidateQueries({ queryKey: ['artist-images', variables.artistId] });
    },
  });
}

/**
 * Hook para subir una imagen personalizada desde el PC
 */
export function useUploadCustomImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UploadCustomImageRequest) =>
      artistAvatarsApi.uploadCustomImage(request),
    onSuccess: (_data, variables) => {
      // Invalidar la lista de imágenes personalizadas para mostrar la nueva
      queryClient.invalidateQueries({ queryKey: ['customArtistImages', variables.artistId] });
    },
  });
}

/**
 * Hook para listar las imágenes personalizadas de un artista
 */
export function useListCustomImages(artistId: string | null) {
  return useQuery({
    queryKey: ['customArtistImages', artistId],
    queryFn: () => artistAvatarsApi.listCustomImages(artistId!),
    enabled: !!artistId,
  });
}

/**
 * Hook para aplicar una imagen personalizada
 */
export function useApplyCustomImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ApplyCustomImageRequest) =>
      artistAvatarsApi.applyCustomImage(request),
    onSuccess: async (_data, variables) => {
      // Invalidar queries relacionadas para refrescar las imágenes
      queryClient.invalidateQueries({ queryKey: ['artists', variables.artistId] });
      queryClient.invalidateQueries({ queryKey: ['artist-images', variables.artistId] });
      queryClient.invalidateQueries({ queryKey: ['customArtistImages', variables.artistId] });
      queryClient.invalidateQueries({ queryKey: ['artists'] });

      // Force refetch para asegurar actualización inmediata
      await queryClient.refetchQueries({
        queryKey: ['artists', variables.artistId],
        type: 'active'
      });

      await queryClient.refetchQueries({
        queryKey: ['artist-images', variables.artistId],
        type: 'active'
      });
    },
  });
}

/**
 * Hook para eliminar una imagen personalizada
 */
export function useDeleteCustomImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: DeleteCustomImageRequest) =>
      artistAvatarsApi.deleteCustomImage(request),
    onSuccess: (_data, variables) => {
      // Invalidar la lista de imágenes personalizadas
      queryClient.invalidateQueries({ queryKey: ['customArtistImages', variables.artistId] });
    },
  });
}
