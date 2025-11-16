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

    // Buscar el contenedor scrolleable correcto
    const findScrollContainer = () => {
      // Buscar elementos con clase que termina en __content y tiene overflow-y: auto
      const contentElements = document.querySelectorAll('[class*="__content"]');

      for (const element of contentElements) {
        const htmlElement = element as HTMLElement;
        const styles = window.getComputedStyle(htmlElement);
        const hasScroll = styles.overflowY === 'auto' || styles.overflowY === 'scroll';

        if (hasScroll) {
          return htmlElement;
        }
      }

      return null;
    };

    const scrollContainer = findScrollContainer();

    const handleScroll = (e?: Event) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          let scrollHeight: number;
          let scrollTop: number;
          let clientHeight: number;

          if (scrollContainer) {
            // Usar el contenedor scrolleable específico de la página
            scrollHeight = scrollContainer.scrollHeight;
            scrollTop = scrollContainer.scrollTop;
            clientHeight = scrollContainer.clientHeight;
          } else {
            // Fallback a window scroll (para páginas legacy)
            scrollHeight = document.documentElement.scrollHeight;
            scrollTop = window.scrollY || document.documentElement.scrollTop;
            clientHeight = window.innerHeight;
          }

          // Verificar si hay scroll REAL disponible
          // El contenido debe ser al menos 200px más alto que el viewport
          // para evitar activación en páginas con poco contenido
          const minScrollRequired = 200;
          const hasRealScroll = scrollHeight > clientHeight + minScrollRequired;

          if (!hasRealScroll) {
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

    // Listener para scroll en el contenedor específico o window
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    } else {
      window.addEventListener('scroll', handleScroll, { passive: true });
    }

    // También escuchar cambios de tamaño por si el contenido cambia dinámicamente
    window.addEventListener('resize', handleScroll, { passive: true });

    // Check inicial
    handleScroll();

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      } else {
        window.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('resize', handleScroll);
    };
  }, [threshold, isMiniMode]);

  return isMiniMode;
}
