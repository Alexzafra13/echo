import { useMemo, useState, useEffect } from 'react';
import { extractDominantColor } from '@shared/utils/colorExtractor';

// Default colors for profiles without avatar
const DEFAULT_COLORS = [
  '#4a3470', // Purple
  '#1e3a5f', // Blue
  '#3d4f2f', // Green
  '#5c3d2e', // Brown
  '#4a4458', // Gray-purple
  '#2d4a4a', // Teal
  '#4a2d2d', // Dark red
  '#3d3d5c', // Blue-gray
];

/**
 * Generate a consistent color based on a string (userId)
 * Returns the same color for the same input
 */
export const getColorFromString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return DEFAULT_COLORS[Math.abs(hash) % DEFAULT_COLORS.length];
};

/**
 * Hook to extract dominant color from an image URL
 * Uses shared colorExtractor utility
 */
export const useImageColor = (imageUrl?: string, fallbackId?: string): string => {
  const fallbackColor = useMemo(
    () => fallbackId ? getColorFromString(fallbackId) : DEFAULT_COLORS[0],
    [fallbackId]
  );
  const [color, setColor] = useState(fallbackColor);

  useEffect(() => {
    if (!imageUrl) {
      setColor(fallbackColor);
      return;
    }

    extractDominantColor(imageUrl)
      .then(extractedColor => setColor(extractedColor))
      .catch(() => setColor(fallbackColor));
  }, [imageUrl, fallbackColor]);

  return color;
};
