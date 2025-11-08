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
    onSuccess: () => {
      // Invalidar queries relacionadas para refrescar las imágenes
      queryClient.invalidateQueries({ queryKey: ['artists'] });
      queryClient.invalidateQueries({ queryKey: ['artist'] });
    },
  });
}
