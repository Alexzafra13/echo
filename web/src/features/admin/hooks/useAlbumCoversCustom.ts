import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { albumCoversApi } from '../api/album-covers-custom.api';
import type {
  UploadCustomCoverRequest,
  ApplyCustomCoverRequest,
  DeleteCustomCoverRequest,
} from '../api/album-covers-custom.api';

/**
 * Hook to upload a custom cover for an album
 */
export function useUploadCustomCover() {
  return useMutation({
    mutationFn: (request: UploadCustomCoverRequest) =>
      albumCoversApi.uploadCustomCover(request),
  });
}

/**
 * Hook to list all custom covers for an album
 */
export function useListCustomCovers(albumId: string) {
  return useQuery({
    queryKey: ['customAlbumCovers', albumId],
    queryFn: () => albumCoversApi.listCustomCovers(albumId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to apply a custom cover as the active cover
 */
export function useApplyCustomCover() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ApplyCustomCoverRequest) =>
      albumCoversApi.applyCustomCover(request),
    onSuccess: async (_data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['albums', variables.albumId] });
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      queryClient.invalidateQueries({ queryKey: ['customAlbumCovers', variables.albumId] });

      // Force refetch for immediate update
      await queryClient.refetchQueries({
        queryKey: ['albums', variables.albumId],
        type: 'active',
      });
    },
  });
}

/**
 * Hook to delete a custom cover
 */
export function useDeleteCustomCover() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: DeleteCustomCoverRequest) =>
      albumCoversApi.deleteCustomCover(request),
    onSuccess: (_data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['customAlbumCovers', variables.albumId] });
      queryClient.invalidateQueries({ queryKey: ['albums', variables.albumId] });
    },
  });
}
