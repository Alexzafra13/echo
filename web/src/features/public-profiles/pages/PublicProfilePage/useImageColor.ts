import { useMemo, useState, useEffect } from 'react';
import { extractDominantColor } from '@shared/utils/colorExtractor';

// Colores por defecto para perfiles sin avatar
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
 * Genera un color consistente a partir de un string (userId).
 * Devuelve siempre el mismo color para la misma entrada.
 */
export const getColorFromString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir a entero de 32 bits
  }
  return DEFAULT_COLORS[Math.abs(hash) % DEFAULT_COLORS.length];
};

/**
 * Hook para extraer el color dominante de una URL de imagen.
 * Usa la utilidad compartida colorExtractor.
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
