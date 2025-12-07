import { useState, useEffect } from 'react';
import { extractDominantColor } from '@shared/utils/colorExtractor';

const DEFAULT_COLOR = '10, 14, 39'; // Dark blue

/**
 * Hook para extraer el color dominante de una imagen
 * Simplifica el patrón repetido en AlbumPage, PlaylistDetailPage y AudioPlayer
 *
 * @param imageUrl - URL de la imagen (puede ser undefined/null)
 * @param fallbackColor - Color de fallback (default: dark blue)
 * @returns El color dominante como string RGB "r, g, b"
 */
export function useDominantColor(
  imageUrl: string | undefined | null,
  fallbackColor: string = DEFAULT_COLOR
): string {
  const [dominantColor, setDominantColor] = useState<string>(fallbackColor);

  useEffect(() => {
    if (!imageUrl) {
      setDominantColor(fallbackColor);
      return;
    }

    let isMounted = true;

    extractDominantColor(imageUrl)
      .then((color) => {
        if (isMounted) {
          setDominantColor(color);
        }
      })
      .catch(() => {
        if (isMounted) {
          setDominantColor(fallbackColor);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [imageUrl, fallbackColor]);

  return dominantColor;
}
