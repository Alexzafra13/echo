import { useState, useEffect, RefObject } from 'react';

interface DropdownPosition {
  top: number;
  left: number;
  right?: number;
  maxHeight: number;
  placement: 'bottom' | 'top';
}

interface UseDropdownPositionOptions {
  isOpen: boolean;
  triggerRef: RefObject<HTMLElement>;
  offset?: number;
  align?: 'left' | 'right';
  maxHeight?: number;
}

/**
 * Custom hook to calculate dropdown position for portal-rendered dropdowns
 * Automatically flips dropdown to top when there's not enough space at bottom
 */
export function useDropdownPosition({
  isOpen,
  triggerRef,
  offset = 8,
  align = 'right',
  maxHeight = 400,
}: UseDropdownPositionOptions): DropdownPosition | null {
  const [position, setPosition] = useState<DropdownPosition | null>(null);

  useEffect(() => {
    if (!isOpen || !triggerRef.current) {
      setPosition(null);
      return;
    }

    const calculatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Calculate available space below and above
      const spaceBelow = viewportHeight - rect.bottom - offset;
      const spaceAbove = rect.top - offset;

      // Check if mobile (viewport width <= 768px)
      const isMobile = viewportWidth <= 768;

      // Determine placement:
      // - Mobile: prefer top (opens upward) unless not enough space
      // - Desktop: prefer bottom (opens downward) unless not enough space
      let placement: 'bottom' | 'top';
      if (isMobile) {
        // Mobile: open upward by default
        placement = spaceAbove >= 150 ? 'top' : 'bottom';
      } else {
        // Desktop: open downward by default
        placement = spaceBelow >= 200 || spaceBelow > spaceAbove ? 'bottom' : 'top';
      }

      // Calculate vertical position
      const top = placement === 'bottom' ? rect.bottom + offset : rect.top - offset;

      // Calculate max height based on available space
      const availableSpace = placement === 'bottom' ? spaceBelow : spaceAbove;
      const calculatedMaxHeight = Math.min(maxHeight, Math.max(100, availableSpace));

      // Calculate horizontal position based on alignment
      let left: number | undefined;
      let right: number | undefined;

      if (align === 'right') {
        // Align dropdown's right edge with trigger's right edge
        right = viewportWidth - rect.right;
      } else {
        // Align dropdown's left edge with trigger's left edge
        left = rect.left;
      }

      setPosition({
        top: placement === 'bottom' ? top : top - calculatedMaxHeight,
        left: left!,
        right,
        maxHeight: calculatedMaxHeight,
        placement,
      });
    };

    calculatePosition();

    // Recalculate on scroll or resize
    const handleUpdate = () => calculatePosition();
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isOpen, triggerRef, offset, align, maxHeight]);

  return position;
}
