/**
 * Hook para gestos de swipe en el reproductor movil.
 * Swipe izquierda = siguiente track, derecha = anterior.
 */

import { useState, useRef, useEffect, useCallback } from 'react';

const SWIPE_THRESHOLD = 60;

interface UseSwipeNavigationParams {
  isMobile: boolean;
  isRadioMode: boolean;
  playNext: () => void;
  playPrevious: () => void;
}

export function useSwipeNavigation({
  isMobile,
  isRadioMode,
  playNext,
  playPrevious,
}: UseSwipeNavigationParams) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isSwiping = useRef(false);
  const swipeTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (swipeTimeoutRef.current) clearTimeout(swipeTimeoutRef.current);
    };
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile || isRadioMode) return;
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isSwiping.current = false;
    },
    [isMobile, isRadioMode]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile || isRadioMode) return;

      const deltaX = e.touches[0].clientX - touchStartX.current;
      const deltaY = e.touches[0].clientY - touchStartY.current;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        isSwiping.current = true;
        const limitedOffset = Math.max(-100, Math.min(100, deltaX));
        setSwipeOffset(limitedOffset);
      }
    },
    [isMobile, isRadioMode]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isMobile || isRadioMode || !isSwiping.current) {
      setSwipeOffset(0);
      return;
    }

    const deltaX = swipeOffset;

    if (Math.abs(deltaX) >= SWIPE_THRESHOLD) {
      if (swipeTimeoutRef.current) clearTimeout(swipeTimeoutRef.current);

      if (deltaX < 0) {
        setSwipeDirection('left');
        swipeTimeoutRef.current = setTimeout(() => {
          playNext();
          setSwipeDirection(null);
          setSwipeOffset(0);
        }, 200);
      } else {
        setSwipeDirection('right');
        swipeTimeoutRef.current = setTimeout(() => {
          playPrevious();
          setSwipeDirection(null);
          setSwipeOffset(0);
        }, 200);
      }
    } else {
      setSwipeOffset(0);
    }

    isSwiping.current = false;
  }, [isMobile, isRadioMode, swipeOffset, playNext, playPrevious]);

  /** Estilos CSS para la animacion de swipe en la caratula */
  const coverSwipeStyles: React.CSSProperties | undefined =
    isMobile && !isRadioMode
      ? {
          opacity: swipeDirection ? 0 : 1,
          transition: 'opacity 0.2s ease-out',
        }
      : undefined;

  /** Estilos CSS para la animacion de swipe en el texto */
  const textSwipeStyles: React.CSSProperties | undefined =
    isMobile && !isRadioMode
      ? {
          transform: swipeDirection
            ? `translateX(${swipeDirection === 'left' ? '-120%' : '120%'})`
            : swipeOffset !== 0
              ? `translateX(${swipeOffset * 1.2}px)`
              : undefined,
          opacity: swipeDirection ? 0 : 1 - Math.abs(swipeOffset) / 250,
          transition:
            swipeDirection || swipeOffset === 0
              ? 'transform 0.2s ease-out, opacity 0.2s ease-out'
              : 'none',
        }
      : undefined;

  return {
    swipeOffset,
    swipeDirection,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    coverSwipeStyles,
    textSwipeStyles,
  };
}
