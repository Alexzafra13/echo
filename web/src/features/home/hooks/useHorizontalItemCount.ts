import { useState, useEffect, useCallback, RefObject } from 'react';

interface HorizontalItemCountConfig {
  itemWidth: number; // Ancho de cada item (incluyendo padding)
  gap?: number; // Gap entre items
  minItems?: number; // Mínimo de items a mostrar
  maxItems?: number; // Máximo de items a mostrar
}

/**
 * Hook que calcula dinámicamente cuántos items caben en un contenedor horizontal.
 * Similar a useGridDimensions pero para scroll horizontal de una sola fila.
 *
 * @param containerRef Referencia al contenedor
 * @param config Configuración con itemWidth, gap, min/max items
 * @returns Número de items que caben
 */
export function useHorizontalItemCount(
  containerRef: RefObject<HTMLElement>,
  config: HorizontalItemCountConfig
): number {
  const { itemWidth, gap = 16, minItems = 3, maxItems = 20 } = config;

  const calculateItems = useCallback(() => {
    if (!containerRef.current) {
      return minItems;
    }

    const containerWidth = containerRef.current.offsetWidth;
    // Formula: cuántos items caben = (ancho + gap) / (itemWidth + gap)
    const items = Math.floor((containerWidth + gap) / (itemWidth + gap));

    return Math.max(minItems, Math.min(items, maxItems));
  }, [containerRef, itemWidth, gap, minItems, maxItems]);

  const [itemCount, setItemCount] = useState(minItems);

  useEffect(() => {
    // Calcular inicial
    const initialCount = calculateItems();
    setItemCount(initialCount);

    // Observar cambios de tamaño del contenedor
    const resizeObserver = new ResizeObserver(() => {
      const newCount = calculateItems();
      setItemCount((prev) => (prev !== newCount ? newCount : prev));
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [calculateItems, containerRef]);

  return itemCount;
}
