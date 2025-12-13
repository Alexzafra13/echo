import { useState, useEffect, useRef } from 'react';

/**
 * Hook para detectar cuando el usuario llega al final de la página
 * y convertir el player en mini-player en el sidebar
 *
 * @param threshold Píxeles desde el bottom para considerar "final de página" (default: 120px para el player height)
 * @returns boolean indicando si el mini-player debe estar activo
 */
export function usePageEndDetection(threshold: number = 120) {
  const [isMiniMode, setIsMiniMode] = useState(false);
  // Use ref to track current state without triggering effect re-runs
  const isMiniModeRef = useRef(isMiniMode);
  isMiniModeRef.current = isMiniMode;

  useEffect(() => {
    let ticking = false;
    let currentScrollContainer: HTMLElement | null = null;

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

    const handleScroll = (_e?: Event) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Re-detectar el contenedor en cada scroll por si cambió de página
          const scrollContainer = findScrollContainer();

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
            if (isMiniModeRef.current) {
              setIsMiniMode(false);
            }
            ticking = false;
            return;
          }

          // Distancia desde el bottom
          const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

          // Si estamos a menos de threshold píxeles del bottom, activar mini mode
          // Si estamos a más de threshold + 100px, desactivar (hysteresis para evitar flickering)
          if (distanceFromBottom <= threshold && !isMiniModeRef.current) {
            setIsMiniMode(true);
          } else if (distanceFromBottom > threshold + 100 && isMiniModeRef.current) {
            setIsMiniMode(false);
          }

          ticking = false;
        });

        ticking = true;
      }
    };

    // Setup: encontrar el contenedor inicial y añadir listeners
    const setupListeners = () => {
      // Limpiar listener anterior si existe
      if (currentScrollContainer) {
        currentScrollContainer.removeEventListener('scroll', handleScroll);
      }

      // Buscar nuevo contenedor
      currentScrollContainer = findScrollContainer();

      // Añadir listener al nuevo contenedor o window
      if (currentScrollContainer) {
        currentScrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      } else {
        window.addEventListener('scroll', handleScroll, { passive: true });
      }
    };

    setupListeners();

    // También escuchar cambios de tamaño por si el contenido cambia dinámicamente
    window.addEventListener('resize', handleScroll, { passive: true });

    // MutationObserver para detectar cuando cambia el DOM (cambio de página)
    const observer = new MutationObserver(() => {
      // Re-configurar listeners cuando cambia el DOM
      setupListeners();
      handleScroll();
    });

    // Observar cambios en el body (cuando se monta/desmonta contenido de páginas)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Check inicial
    handleScroll();

    return () => {
      if (currentScrollContainer) {
        currentScrollContainer.removeEventListener('scroll', handleScroll);
      } else {
        window.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('resize', handleScroll);
      observer.disconnect();
    };
  }, [threshold]); // Note: isMiniMode removed - using ref instead to prevent effect re-runs

  return isMiniMode;
}
