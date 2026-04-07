import { useState, useEffect } from 'react';
import { extractDominantColor } from '@shared/utils/colorExtractor';

export const DEFAULT_COLOR = '10, 14, 39';

/**
 * Internal shared hook: extracts dominant colors from one or more image URLs.
 * Returns an array of "r, g, b" strings. Used by useDominantColor and useDominantColors.
 */
export function useColorExtraction(
  imageUrls: (string | undefined | null)[],
  fallback: string = DEFAULT_COLOR
): string[] {
  const [colors, setColors] = useState<string[]>(() => imageUrls.map(() => fallback));

  // Stable key so the effect only reruns when the actual URLs change
  const urlsKey = imageUrls.filter(Boolean).join('|');

  useEffect(() => {
    const validUrls = imageUrls.filter(Boolean) as string[];
    if (validUrls.length === 0) {
      setColors([fallback]);
      return;
    }

    let isMounted = true;

    Promise.all(
      validUrls.map((url) =>
        extractDominantColor(url).catch((err) => {
          if (import.meta.env.DEV) {
            console.warn('[Color] Failed to extract dominant color:', err?.message);
          }
          return fallback;
        })
      )
    ).then((extracted) => {
      if (isMounted) {
        setColors(extracted);
      }
    });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlsKey, fallback]);

  return colors;
}
