import { useRef, useEffect } from 'react';

interface UseSheetDragToCloseOptions {
  onClose: () => void;
  threshold?: number;
  enabled?: boolean;
}

/**
 * Hook for drag-down-to-close gesture on mobile bottom sheets.
 * When the user drags the sheet down past the threshold (and the
 * scrollable content is already at the top), the sheet slides off
 * and onClose is called.
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

    let isDragging = false;
    let startY = 0;
    let currentY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      const scrollEl = scrollRef.current;
      const atTop = !scrollEl || scrollEl.scrollTop <= 0;
      if (atTop) {
        startY = e.touches[0].clientY;
        currentY = startY;
        isDragging = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const scrollEl = scrollRef.current;
      const atTop = !scrollEl || scrollEl.scrollTop <= 0;
      const deltaY = e.touches[0].clientY - startY;

      if (atTop && deltaY > 0) {
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
      if (!isDragging) return;

      const deltaY = currentY - startY;
      isDragging = false;
      const overlay = overlayRef.current;

      if (deltaY > threshold) {
        // Close: slide sheet off-screen
        sheet.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
        sheet.style.transform = 'translateY(100%)';
        if (overlay) {
          overlay.style.transition = 'opacity 0.25s ease';
          overlay.style.opacity = '0';
        }
        setTimeout(() => onCloseRef.current(), 250);
      } else {
        // Snap back
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
      sheet.removeEventListener('touchstart', handleTouchStart);
      sheet.removeEventListener('touchmove', handleTouchMove);
      sheet.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, threshold]);

  return { sheetRef, scrollRef, overlayRef };
}
