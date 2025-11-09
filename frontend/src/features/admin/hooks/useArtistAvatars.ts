import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { artistAvatarsApi, ApplyArtistAvatarRequest } from '../api/artist-avatars.api';

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
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas para refrescar las imágenes
      // IMPORTANTE: WebSocket ya emitirá un evento que invalidará automáticamente,
      // pero hacemos invalidación local inmediata para feedback instantáneo
      queryClient.invalidateQueries({ queryKey: ['artists', variables.artistId] });
      queryClient.invalidateQueries({ queryKey: ['artist-images', variables.artistId] });
      queryClient.invalidateQueries({ queryKey: ['artists'] }); // Lista de artistas
    },
  });
}
