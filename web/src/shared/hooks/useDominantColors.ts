import { useColorExtraction, DEFAULT_COLOR } from './useColorExtraction';

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
  return useColorExtraction(imageUrls, fallback);
}
