import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Detecta cuando el usuario esta cerca del final de la pagina.
 * Activa mini-player cuando la distancia al fondo es menor que el threshold.
 *
 * Usa scroll listener con rAF throttle en lugar de MutationObserver,
 * evitando el overhead de observar cada mutacion DOM de la app.
 */
export function usePageEndDetection(threshold: number = 120) {
  const [isMiniMode, setIsMiniMode] = useState(false);
  const tickingRef = useRef(false);
  const isMiniModeRef = useRef(false);

  // Ref sincronizado para evitar recrear el listener al cambiar isMiniMode
  isMiniModeRef.current = isMiniMode;

  const checkScroll = useCallback(() => {
    // Buscar scroll container (contenido principal de la app)
    const scrollContainer = document.querySelector('[class*="__content"]') as HTMLElement | null;

    let scrollHeight: number;
    let scrollTop: number;
    let clientHeight: number;

    if (scrollContainer && scrollContainer.scrollHeight > scrollContainer.clientHeight) {
      scrollHeight = scrollContainer.scrollHeight;
      scrollTop = scrollContainer.scrollTop;
      clientHeight = scrollContainer.clientHeight;
    } else {
      scrollHeight = document.documentElement.scrollHeight;
      scrollTop = window.scrollY || document.documentElement.scrollTop;
      clientHeight = window.innerHeight;
    }

    // Evitar activacion en paginas con poco contenido
    const minScrollRequired = 200;
    const hasRealScroll = scrollHeight > clientHeight + minScrollRequired;

    if (!hasRealScroll) {
      if (isMiniModeRef.current) setIsMiniMode(false);
      return;
    }

    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

    // Histeresis de 100px para evitar flickering
    if (distanceFromBottom <= threshold && !isMiniModeRef.current) {
      setIsMiniMode(true);
    } else if (distanceFromBottom > threshold + 100 && isMiniModeRef.current) {
      setIsMiniMode(false);
    }
  }, [threshold]);

  useEffect(() => {
    const handleScroll = () => {
      if (!tickingRef.current) {
        tickingRef.current = true;
        requestAnimationFrame(() => {
          checkScroll();
          tickingRef.current = false;
        });
      }
    };

    // Escuchar scroll tanto en window como en capture phase para containers internos
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    // Check inicial
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('resize', handleScroll);
    };
  }, [checkScroll]);

  return isMiniMode;
}
