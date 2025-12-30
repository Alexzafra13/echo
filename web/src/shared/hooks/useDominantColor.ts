import { useState, useEffect } from 'react';
import { extractDominantColor } from '@shared/utils/colorExtractor';

/**
 * Default fallback color (dark blue) for when color extraction fails
 */
const DEFAULT_COLOR = '10, 14, 39';

/**
 * Hook para extraer el color dominante de una imagen
 *
 * Encapsula la lógica de extracción de color para evitar duplicación
 * en componentes como AlbumPage, PlaylistDetailPage, AudioPlayer, etc.
 *
 * @param imageUrl - URL de la imagen de la que extraer el color
 * @param fallback - Color de fallback en formato "r, g, b" (default: azul oscuro)
 * @returns El color dominante como string "r, g, b"
 *
 * @example
 * ```tsx
 * function AlbumPage({ album }) {
 *   const dominantColor = useDominantColor(album.coverUrl);
 *
 *   return (
 *     <div style={{ background: `linear-gradient(rgba(${dominantColor}, 0.8), #0a0e27)` }}>
 *       ...
 *     </div>
 *   );
 * }
 * ```
 */
export function useDominantColor(
  imageUrl: string | undefined | null,
  fallback: string = DEFAULT_COLOR
): string {
  const [color, setColor] = useState(fallback);

  useEffect(() => {
    // Reset to fallback when image URL changes
    setColor(fallback);

    if (!imageUrl) {
      return;
    }

    let isMounted = true;

    extractDominantColor(imageUrl)
      .then((extractedColor) => {
        if (isMounted) {
          setColor(extractedColor);
        }
      })
      .catch(() => {
        // Fallback already set, no action needed
      });

    return () => {
      isMounted = false;
    };
  }, [imageUrl, fallback]);

  return color;
}
