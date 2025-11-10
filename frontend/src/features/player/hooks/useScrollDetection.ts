import { useState, useEffect } from 'react';

/**
 * Hook para detectar cuando el usuario llega al final de la página
 * y convertir el player en mini-player en el sidebar
 *
 * Calcula el scroll REAL del contenido, excluyendo el padding-bottom
 * del body para evitar loops y parpadeo en páginas con poco contenido.
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

          // Obtener el padding-bottom del body para excluirlo del cálculo
          const bodyPaddingBottom = parseInt(
            getComputedStyle(document.body).paddingBottom || '0',
            10
          );

          // Altura real del contenido sin el padding artificial
          const realContentHeight = scrollHeight - bodyPaddingBottom;

          // Verificar si hay scroll REAL disponible
          // El contenido real debe ser al menos 200px más alto que el viewport
          // para evitar activación en páginas con poco contenido
          const minScrollRequired = 200;
          const hasRealScroll = realContentHeight > clientHeight + minScrollRequired;

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
