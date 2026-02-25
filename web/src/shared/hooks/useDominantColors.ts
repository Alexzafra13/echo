import { useState, useEffect } from 'react';
import { extractDominantColor } from '@shared/utils/colorExtractor';

const DEFAULT_COLOR = '10, 14, 39';

/**
 * Extract dominant colors from multiple images.
 * Useful for playlists where the background should reflect
 * colors from several album covers.
 *
 * Returns an array of "r, g, b" strings (one per image URL).
 * Falls back to the default dark color for any that fail.
 */
export function useDominantColors(
  imageUrls: (string | undefined | null)[],
  fallback: string = DEFAULT_COLOR
): string[] {
  const [colors, setColors] = useState<string[]>(() => imageUrls.map(() => fallback));

  // Stable key for the dependency array
  const urlsKey = imageUrls.filter(Boolean).join('|');

  useEffect(() => {
    const validUrls = imageUrls.filter(Boolean) as string[];
    if (validUrls.length === 0) {
      setColors([fallback]);
      return;
    }

    let isMounted = true;

    Promise.all(validUrls.map((url) => extractDominantColor(url).catch(() => fallback))).then(
      (extracted) => {
        if (isMounted) {
          setColors(extracted);
        }
      }
    );

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlsKey, fallback]);

  return colors;
}
