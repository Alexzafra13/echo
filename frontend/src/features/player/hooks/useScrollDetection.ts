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
          // Calcular si estamos cerca del final
          const scrollHeight = document.documentElement.scrollHeight;
          const scrollTop = window.scrollY || document.documentElement.scrollTop;
          const clientHeight = window.innerHeight;

          // Distancia desde el bottom
          const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

          // Si estamos a menos de threshold píxeles del bottom, activar mini mode
          // Si estamos a más de threshold + 50px, desactivar (hysteresis para evitar flickering)
          if (distanceFromBottom <= threshold && !isMiniMode) {
            setIsMiniMode(true);
          } else if (distanceFromBottom > threshold + 50 && isMiniMode) {
            setIsMiniMode(false);
          }

          ticking = false;
        });

        ticking = true;
      }
    };

    // Listener para scroll
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Check inicial
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [threshold, isMiniMode]);

  return isMiniMode;
}
