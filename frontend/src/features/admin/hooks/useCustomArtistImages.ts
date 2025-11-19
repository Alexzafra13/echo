import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  customArtistImagesApi,
  UploadCustomImageRequest,
  ApplyCustomImageRequest,
  DeleteCustomImageRequest,
} from '../api/custom-artist-images.api';

/**
 * Hook to list custom images for an artist
 */
export function useListCustomArtistImages(artistId: string | null) {
  return useQuery({
    queryKey: ['custom-artist-images', artistId],
    queryFn: () => customArtistImagesApi.listImages(artistId!),
    enabled: !!artistId,
  });
}

/**
 * Hook to upload a custom artist image
 */
export function useUploadCustomArtistImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UploadCustomImageRequest) =>
      customArtistImagesApi.uploadImage(request),
    onSuccess: (_data, variables) => {
      // Invalidate queries to refresh the image lists
      queryClient.invalidateQueries({ queryKey: ['custom-artist-images', variables.artistId] });
      queryClient.invalidateQueries({ queryKey: ['artistAvatars', variables.artistId] });
    },
  });
}

/**
 * Hook to apply (activate) a custom image
 */
export function useApplyCustomArtistImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ApplyCustomImageRequest) =>
      customArtistImagesApi.applyImage(request),
    onSuccess: (_data, variables) => {
      // Invalidate queries to refresh artist data and images
      queryClient.invalidateQueries({ queryKey: ['artists', variables.artistId] });
      queryClient.invalidateQueries({ queryKey: ['artist-images', variables.artistId] });
      queryClient.invalidateQueries({ queryKey: ['custom-artist-images', variables.artistId] });
    },
  });
}

/**
 * Hook to delete a custom image
 */
export function useDeleteCustomArtistImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: DeleteCustomImageRequest) =>
      customArtistImagesApi.deleteImage(request),
    onSuccess: (_data, variables) => {
      // Invalidate queries to refresh the image lists
      queryClient.invalidateQueries({ queryKey: ['custom-artist-images', variables.artistId] });
      queryClient.invalidateQueries({ queryKey: ['artists', variables.artistId] });
      queryClient.invalidateQueries({ queryKey: ['artist-images', variables.artistId] });
    },
  });
}
