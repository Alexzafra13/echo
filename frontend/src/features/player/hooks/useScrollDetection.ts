import { useState, useEffect } from 'react';

/**
 * Hook para detectar cuando el usuario llega al final de la página
 * y convertir el player en mini-player en el sidebar
 *
 * @param threshold Píxeles desde el bottom para considerar "final de página" (default: 120px para el player height)
 * @returns boolean indicando si el mini-player debe estar activo
 */
export function useScrollDetection(threshold: number = 120) {
  const [isMiniMode, setIsMiniMode] = useState(false);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Calcular dimensiones
          const scrollHeight = document.documentElement.scrollHeight;
          const scrollTop = window.scrollY || document.documentElement.scrollTop;
          const clientHeight = window.innerHeight;

          // Verificar si hay scroll disponible (contenido más alto que viewport)
          // Agregar margen de 50px para evitar activar en páginas con scroll mínimo
          const hasScroll = scrollHeight > clientHeight + 50;

          if (!hasScroll) {
            // Si no hay scroll suficiente, nunca activar mini mode
            if (isMiniMode) {
              setIsMiniMode(false);
            }
            ticking = false;
            return;
          }

          // Distancia desde el bottom
          const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

          // Si estamos a menos de threshold píxeles del bottom, activar mini mode
          // Si estamos a más de threshold + 100px, desactivar (hysteresis para evitar flickering)
          if (distanceFromBottom <= threshold && !isMiniMode) {
            setIsMiniMode(true);
          } else if (distanceFromBottom > threshold + 100 && isMiniMode) {
            setIsMiniMode(false);
          }

          ticking = false;
        });

        ticking = true;
      }
    };

    // Listener para scroll
    window.addEventListener('scroll', handleScroll, { passive: true });

    // También escuchar cambios de tamaño por si el contenido cambia dinámicamente
    window.addEventListener('resize', handleScroll, { passive: true });

    // Check inicial
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [threshold, isMiniMode]);

  return isMiniMode;
}
