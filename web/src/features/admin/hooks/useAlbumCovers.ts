import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { albumCoversApi, ApplyAlbumCoverRequest } from '../api/album-covers.api';

/**
 * Hook para buscar carátulas de álbum
 */
export function useSearchAlbumCovers(albumId: string | null) {
  return useQuery({
    queryKey: ['albumCovers', albumId],
    queryFn: () => albumCoversApi.searchCovers(albumId!),
    enabled: !!albumId,
  });
}

/**
 * Hook para aplicar una carátula seleccionada
 */
export function useApplyAlbumCover() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ApplyAlbumCoverRequest) =>
      albumCoversApi.applyCover(request),
    onSuccess: (_data, variables) => {
      // Invalidar queries relacionadas para refrescar las imágenes
      // IMPORTANTE: SSE ya emitirá un evento que invalidará automáticamente,
      // pero hacemos invalidación local inmediata para feedback instantáneo
      queryClient.invalidateQueries({ queryKey: ['albums', variables.albumId] });
      queryClient.invalidateQueries({ queryKey: ['albums'] }); // Lista de álbumes
      // También invalidar artista (los álbumes aparecen en páginas de artistas)
      // El artistId se invalida automáticamente via SSE event
    },
  });
}
