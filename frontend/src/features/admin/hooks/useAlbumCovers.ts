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
    onSuccess: () => {
      // Invalidar queries relacionadas para refrescar las imágenes
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      queryClient.invalidateQueries({ queryKey: ['album'] });
    },
  });
}
