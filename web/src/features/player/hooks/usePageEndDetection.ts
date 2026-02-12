import { useState, useEffect } from 'react';

// Activa mini-player cuando el usuario llega al final de la página
export function usePageEndDetection(threshold: number = 120) {
  const [isMiniMode, setIsMiniMode] = useState(false);

  useEffect(() => {
    let ticking = false;
    let currentScrollContainer: HTMLElement | null = null;

    const findScrollContainer = () => {
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
          const scrollContainer = findScrollContainer();

          let scrollHeight: number;
          let scrollTop: number;
          let clientHeight: number;

          if (scrollContainer) {
            scrollHeight = scrollContainer.scrollHeight;
            scrollTop = scrollContainer.scrollTop;
            clientHeight = scrollContainer.clientHeight;
          } else {
            scrollHeight = document.documentElement.scrollHeight;
            scrollTop = window.scrollY || document.documentElement.scrollTop;
            clientHeight = window.innerHeight;
          }

          // Evitar activación en páginas con poco contenido
          const minScrollRequired = 200;
          const hasRealScroll = scrollHeight > clientHeight + minScrollRequired;

          if (!hasRealScroll) {
            if (isMiniMode) {
              setIsMiniMode(false);
            }
            ticking = false;
            return;
          }

          const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

          // Histéresis de 100px para evitar flickering
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

    const setupListeners = () => {
      if (currentScrollContainer) {
        currentScrollContainer.removeEventListener('scroll', handleScroll);
      }

      currentScrollContainer = findScrollContainer();

      if (currentScrollContainer) {
        currentScrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      } else {
        window.addEventListener('scroll', handleScroll, { passive: true });
      }
    };

    setupListeners();

    window.addEventListener('resize', handleScroll, { passive: true });

    // MutationObserver para reconfigurar al cambiar de página
    const observer = new MutationObserver(() => {
      setupListeners();
      handleScroll();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

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
  }, [threshold, isMiniMode]);

  return isMiniMode;
}
