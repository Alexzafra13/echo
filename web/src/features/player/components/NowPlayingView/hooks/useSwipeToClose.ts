import { useState, useRef, useCallback } from 'react';

interface UseSwipeToCloseOptions {
  enabled: boolean;
  threshold?: number;
  maxOffset?: number;
  onClose: () => void;
}

interface UseSwipeToCloseResult {
  dragOffset: number;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
}

/**
 * Hook for swipe down to close gesture
 */
export function useSwipeToClose({
  enabled,
  threshold = 150,
  maxOffset = 300,
  onClose,
}: UseSwipeToCloseOptions): UseSwipeToCloseResult {
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartY = useRef<number>(0);
  const isDragging = useRef(false);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      touchStartY.current = e.touches[0].clientY;
      isDragging.current = false;
    },
    [enabled]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      const deltaY = e.touches[0].clientY - touchStartY.current;

      // Only allow dragging down
      if (deltaY > 0) {
        isDragging.current = true;
        setDragOffset(Math.min(deltaY, maxOffset));
      }
    },
    [enabled, maxOffset]
  );

  const handleTouchEnd = useCallback(() => {
    if (!enabled) return;
    if (dragOffset > threshold) {
      onClose();
    }
    setDragOffset(0);
    isDragging.current = false;
  }, [enabled, dragOffset, threshold, onClose]);

  return {
    dragOffset,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
