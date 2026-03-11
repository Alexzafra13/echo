import { useMutation, useQueryClient } from '@tanstack/react-query';
import { radioFaviconsApi } from '@features/admin/api/radio-favicons.api';

export function useUploadRadioFavicon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stationUuid, file }: { stationUuid: string; file: File }) =>
      radioFaviconsApi.uploadFavicon(stationUuid, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radio'] });
    },
  });
}

export function useDeleteRadioFavicon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stationUuid: string) => radioFaviconsApi.deleteFavicon(stationUuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radio'] });
    },
  });
}

export function useAutoFetchRadioFavicon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      stationUuid,
      name,
      homepage,
    }: {
      stationUuid: string;
      name: string;
      homepage?: string;
    }) => radioFaviconsApi.autoFetch(stationUuid, name, homepage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radio'] });
    },
  });
}

export function useFetchFaviconPreviews() {
  return useMutation({
    mutationFn: ({
      stationUuid,
      name,
      homepage,
    }: {
      stationUuid: string;
      name: string;
      homepage?: string;
    }) => radioFaviconsApi.fetchPreviews(stationUuid, name, homepage),
  });
}

export function useSaveFaviconPreview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      stationUuid,
      dataUrl,
      source,
      stationName,
    }: {
      stationUuid: string;
      dataUrl: string;
      source: string;
      stationName?: string;
    }) => radioFaviconsApi.savePreview(stationUuid, dataUrl, source, stationName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radio'] });
    },
  });
}
