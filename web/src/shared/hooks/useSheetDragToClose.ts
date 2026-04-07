import { useRef, useEffect } from 'react';

interface UseSheetDragToCloseOptions {
  onClose: () => void;
  threshold?: number;
  enabled?: boolean;
}

/**
 * Hook for drag-down-to-close gesture on mobile bottom sheets.
 *
 * IMPORTANT: The sheet element MUST have `touch-action: none` in CSS
 * to prevent the browser compositor from intercepting touch gestures.
 * Without it, the drag gesture won't work on mobile.
 *
 * Returns refs to attach to the sheet container, the scrollable
 * content area, and optionally the overlay backdrop.
 */
export function useSheetDragToClose({
  onClose,
  threshold = 80,
  enabled = true,
}: UseSheetDragToCloseOptions) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!enabled) return;
    const sheet = sheetRef.current;
    if (!sheet) return;
    const scrollEl = scrollRef.current;

    let isDragging = false;
    let startY = 0;
    let currentY = 0;

    // Clear CSS open-animation immediately so JS transforms work.
    const clearAnimation = () => {
      sheet.style.animation = 'none';
    };
    sheet.addEventListener('animationend', clearAnimation, { once: true });
    const safetyTimer = setTimeout(clearAnimation, 400);

    const isScrollAtTop = () => {
      if (!scrollEl) return true;
      return scrollEl.scrollTop <= 1;
    };

    const handleTouchStart = (e: TouchEvent) => {
      clearAnimation();
      if (isScrollAtTop()) {
        startY = e.touches[0].clientY;
        currentY = startY;
        isDragging = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!startY) return;

      const deltaY = e.touches[0].clientY - startY;

      if (isScrollAtTop() && deltaY > 0) {
        isDragging = true;
        currentY = e.touches[0].clientY;

        const dampened = deltaY * 0.6;
        sheet.style.transform = `translateY(${dampened}px)`;
        sheet.style.transition = 'none';

        const overlay = overlayRef.current;
        if (overlay) {
          overlay.style.opacity = `${Math.max(0, 1 - deltaY / 300)}`;
          overlay.style.transition = 'none';
        }

        e.preventDefault();
      } else if (isDragging && deltaY <= 0) {
        isDragging = false;
        sheet.style.transform = '';
        sheet.style.transition = '';
        const overlay = overlayRef.current;
        if (overlay) {
          overlay.style.opacity = '';
          overlay.style.transition = '';
        }
      }
    };

    const handleTouchEnd = () => {
      if (!isDragging) {
        startY = 0;
        return;
      }

      const deltaY = currentY - startY;
      isDragging = false;
      startY = 0;
      const overlay = overlayRef.current;

      if (deltaY > threshold) {
        sheet.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
        sheet.style.transform = 'translateY(100%)';
        if (overlay) {
          overlay.style.transition = 'opacity 0.25s ease';
          overlay.style.opacity = '0';
        }
        setTimeout(() => onCloseRef.current(), 250);
      } else {
        sheet.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)';
        sheet.style.transform = 'translateY(0)';
        if (overlay) {
          overlay.style.transition = 'opacity 0.25s ease';
          overlay.style.opacity = '1';
        }
        setTimeout(() => {
          sheet.style.transform = '';
          sheet.style.transition = '';
          if (overlay) {
            overlay.style.opacity = '';
            overlay.style.transition = '';
          }
        }, 250);
      }
    };

    sheet.addEventListener('touchstart', handleTouchStart, { passive: true });
    sheet.addEventListener('touchmove', handleTouchMove, { passive: false });
    sheet.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      clearTimeout(safetyTimer);
      sheet.removeEventListener('animationend', clearAnimation);
      sheet.removeEventListener('touchstart', handleTouchStart);
      sheet.removeEventListener('touchmove', handleTouchMove);
      sheet.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, threshold]);

  return { sheetRef, scrollRef, overlayRef };
}
