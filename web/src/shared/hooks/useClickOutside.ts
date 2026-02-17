import { useEffect, useRef, useCallback, useState } from 'react';

export interface UseClickOutsideOptions {
  enabled?: boolean;
  animationDuration?: number;
  closeOnScroll?: boolean;
  scrollCloseDelay?: number;
  scrollThreshold?: number;
}

export interface UseClickOutsideReturn<T extends HTMLElement> {
  ref: React.RefObject<T>;
  isClosing: boolean;
  close: (callback?: () => void) => void;
}

// Detecta clics fuera de un elemento, con soporte para animación de cierre
export function useClickOutside<T extends HTMLElement = HTMLDivElement>(
  onClose: () => void,
  options: UseClickOutsideOptions = {}
): UseClickOutsideReturn<T> {
  const {
    enabled = true,
    animationDuration = 0,
    closeOnScroll = true,
    scrollCloseDelay = 100,
    scrollThreshold = 20,
  } = options;

  const ref = useRef<T>(null);
  const isClosingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCallbackRef = useRef<(() => void) | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (enabled) {
      isClosingRef.current = false;
      setIsClosing(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      pendingCallbackRef.current = null;
    }
  }, [enabled]);

  // Ejecutar callbacks pendientes al cerrar externamente
  useEffect(() => {
    if (!enabled && pendingCallbackRef.current) {
      const callback = pendingCallbackRef.current;
      pendingCallbackRef.current = null;
      setTimeout(callback, 0);
    }
  }, [enabled]);

  const close = useCallback((callback?: () => void) => {
    if (callback) {
      pendingCallbackRef.current = callback;
    }

    if (isClosingRef.current) {
      return;
    }

    if (animationDuration > 0) {
      isClosingRef.current = true;
      setIsClosing(true);

      timeoutRef.current = setTimeout(() => {
        onClose();
        if (pendingCallbackRef.current) {
          pendingCallbackRef.current();
          pendingCallbackRef.current = null;
        }
        isClosingRef.current = false;
        setIsClosing(false);
      }, animationDuration);
    } else {
      onClose();
      if (pendingCallbackRef.current) {
        pendingCallbackRef.current();
        pendingCallbackRef.current = null;
      }
    }
  }, [onClose, animationDuration]);

  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        close();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [enabled, close]);

  // Cerrar al hacer scroll con umbral mínimo
  useEffect(() => {
    if (!enabled || !closeOnScroll) return;

    let scrollStartY = window.scrollY;
    let accumulatedScroll = 0;
    let scrollTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = Math.abs(currentScrollY - scrollStartY);
      accumulatedScroll += scrollDelta;
      scrollStartY = currentScrollY;

      if (accumulatedScroll >= scrollThreshold) {
        if (scrollTimeoutId) {
          clearTimeout(scrollTimeoutId);
        }
        scrollTimeoutId = setTimeout(() => {
          close();
        }, scrollCloseDelay);
      }
    };

    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      if (scrollTimeoutId) {
        clearTimeout(scrollTimeoutId);
      }
    };
  }, [enabled, closeOnScroll, close, scrollCloseDelay, scrollThreshold]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      pendingCallbackRef.current = null;
    };
  }, []);

  return { ref, isClosing, close };
}
