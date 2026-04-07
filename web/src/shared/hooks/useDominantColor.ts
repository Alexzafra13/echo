import { useMemo } from 'react';
import { useColorExtraction, DEFAULT_COLOR } from './useColorExtraction';

// Extrae el color dominante de una imagen para usar en gradientes
export function useDominantColor(
  imageUrl: string | undefined | null,
  fallback: string = DEFAULT_COLOR
): string {
  const urls = useMemo(() => [imageUrl], [imageUrl]);
  const colors = useColorExtraction(urls, fallback);
  return colors[0] ?? fallback;
}
