/**
 * Hook para extraer el color dominante de la caratula actual.
 * Usado para el fondo dinamico del reproductor.
 */

import { useMemo } from 'react';
import { useDominantColor } from '@shared/hooks';
import { getCoverUrl } from '@shared/utils/cover.utils';
import type { Track, RadioStation } from '../types';

interface UsePlayerDominantColorParams {
  isRadioMode: boolean;
  currentRadioStation: RadioStation | null;
  currentTrack: Track | null;
}

export function usePlayerDominantColor({
  isRadioMode,
  currentRadioStation,
  currentTrack,
}: UsePlayerDominantColorParams): string {
  const colorSourceUrl = useMemo(() => {
    if (isRadioMode)
      return currentRadioStation?.customFaviconUrl || currentRadioStation?.favicon || undefined;
    if (currentTrack) {
      const rawUrl =
        currentTrack.album?.cover ||
        currentTrack.coverImage ||
        (currentTrack.albumId ? `/api/images/albums/${currentTrack.albumId}/cover` : undefined);
      return rawUrl ? getCoverUrl(rawUrl) : undefined;
    }
    return undefined;
  }, [
    isRadioMode,
    currentRadioStation?.customFaviconUrl,
    currentRadioStation?.favicon,
    currentTrack,
  ]);

  return useDominantColor(colorSourceUrl, '0, 0, 0');
}
