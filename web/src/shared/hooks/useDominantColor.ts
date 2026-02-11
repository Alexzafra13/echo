import { useState, useEffect } from 'react';
import { extractDominantColor } from '@shared/utils/colorExtractor';

const DEFAULT_COLOR = '10, 14, 39';

// Extrae el color dominante de una imagen para usar en gradientes
export function useDominantColor(
  imageUrl: string | undefined | null,
  fallback: string = DEFAULT_COLOR
): string {
  const [color, setColor] = useState(fallback);

  useEffect(() => {
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
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [imageUrl, fallback]);

  return color;
}
