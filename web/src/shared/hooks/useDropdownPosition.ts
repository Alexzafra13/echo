import { useState, useEffect, RefObject } from 'react';

interface DropdownPosition {
  top?: number;
  bottom?: number;
  left?: number;
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

      const spaceBelow = viewportHeight - rect.bottom - offset;
      const spaceAbove = rect.top - offset;

      const isMobile = viewportWidth <= 768;

      // Móvil abre hacia arriba por defecto, desktop hacia abajo
      let placement: 'bottom' | 'top';
      if (isMobile) {
        placement = spaceAbove >= 150 ? 'top' : 'bottom';
      } else {
        placement = spaceBelow >= 200 || spaceBelow > spaceAbove ? 'bottom' : 'top';
      }

      const availableSpace = placement === 'bottom' ? spaceBelow : spaceAbove;
      const calculatedMaxHeight = Math.min(maxHeight, Math.max(100, availableSpace));

      let left: number | undefined;
      let right: number | undefined;

      if (align === 'right') {
        right = viewportWidth - rect.right;
      } else {
        left = rect.left;
      }

      if (placement === 'bottom') {
        setPosition({
          top: rect.bottom + offset,
          left,
          right,
          maxHeight: calculatedMaxHeight,
          placement,
        });
      } else {
        setPosition({
          bottom: viewportHeight - rect.top + offset,
          left,
          right,
          maxHeight: calculatedMaxHeight,
          placement,
        });
      }
    };

    calculatePosition();

    window.addEventListener('resize', calculatePosition);

    return () => {
      window.removeEventListener('resize', calculatePosition);
    };
  }, [isOpen, triggerRef, offset, align, maxHeight]);

  return position;
}
