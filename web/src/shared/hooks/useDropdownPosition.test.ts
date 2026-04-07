import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDropdownPosition } from './useDropdownPosition';
import { RefObject } from 'react';

describe('useDropdownPosition', () => {
  let triggerRef: RefObject<HTMLElement>;
  let triggerElement: HTMLElement;

  beforeEach(() => {
    // Create a mock trigger element
    triggerElement = document.createElement('button');
    document.body.appendChild(triggerElement);

    // Mock getBoundingClientRect
    triggerElement.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 100,
      bottom: 140,
      left: 200,
      right: 300,
      width: 100,
      height: 40,
    });

    triggerRef = { current: triggerElement };

    // Mock window dimensions
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
  });

  afterEach(() => {
    document.body.removeChild(triggerElement);
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should return null when not open', () => {
      const { result } = renderHook(() =>
        useDropdownPosition({
          isOpen: false,
          triggerRef,
        })
      );

      expect(result.current).toBeNull();
    });

    it('should return null when triggerRef is null', () => {
      const nullRef = { current: null };
      const { result } = renderHook(() =>
        useDropdownPosition({
          isOpen: true,
          triggerRef: nullRef,
        })
      );

      expect(result.current).toBeNull();
    });
  });

  describe('position calculation', () => {
    it('should calculate position when open', () => {
      const { result } = renderHook(() =>
        useDropdownPosition({
          isOpen: true,
          triggerRef,
        })
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.placement).toBeDefined();
      expect(result.current?.maxHeight).toBeDefined();
    });

    it('should place dropdown below trigger by default on desktop', () => {
      const { result } = renderHook(() =>
        useDropdownPosition({
          isOpen: true,
          triggerRef,
          offset: 8,
        })
      );

      expect(result.current?.placement).toBe('bottom');
      expect(result.current?.top).toBe(148); // rect.bottom (140) + offset (8)
    });

    it('should use right alignment by default', () => {
      const { result } = renderHook(() =>
        useDropdownPosition({
          isOpen: true,
          triggerRef,
        })
      );

      expect(result.current?.right).toBe(900); // viewportWidth (1200) - rect.right (300)
      expect(result.current?.left).toBeUndefined();
    });

    it('should use left alignment when specified', () => {
      const { result } = renderHook(() =>
        useDropdownPosition({
          isOpen: true,
          triggerRef,
          align: 'left',
        })
      );

      expect(result.current?.left).toBe(200); // rect.left
      expect(result.current?.right).toBeUndefined();
    });
  });

  describe('placement logic', () => {
    it('should place dropdown above when not enough space below', () => {
      // Position trigger near bottom of viewport
      triggerElement.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 700,
        bottom: 740,
        left: 200,
        right: 300,
        width: 100,
        height: 40,
      });

      const { result } = renderHook(() =>
        useDropdownPosition({
          isOpen: true,
          triggerRef,
          offset: 8,
        })
      );

      // Space below = 800 - 740 - 8 = 52 (less than 200)
      // Space above = 700 - 8 = 692 (more than space below)
      expect(result.current?.placement).toBe('top');
      expect(result.current?.bottom).toBeDefined();
      expect(result.current?.top).toBeUndefined();
    });

    it('should calculate bottom position when placement is top', () => {
      triggerElement.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 700,
        bottom: 740,
        left: 200,
        right: 300,
        width: 100,
        height: 40,
      });

      const { result } = renderHook(() =>
        useDropdownPosition({
          isOpen: true,
          triggerRef,
          offset: 8,
        })
      );

      expect(result.current?.placement).toBe('top');
      // bottom = viewportHeight (800) - rect.top (700) + offset (8) = 108
      expect(result.current?.bottom).toBe(108);
    });
  });

  describe('mobile behavior', () => {
    it('should prefer top placement on mobile when space available', () => {
      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 600, writable: true });

      // Position trigger in middle of screen
      triggerElement.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 400,
        bottom: 440,
        left: 50,
        right: 150,
        width: 100,
        height: 40,
      });

      const { result } = renderHook(() =>
        useDropdownPosition({
          isOpen: true,
          triggerRef,
          offset: 8,
        })
      );

      // Space above = 400 - 8 = 392 (>= 150, so opens upward on mobile)
      expect(result.current?.placement).toBe('top');
    });

    it('should use bottom placement on mobile when not enough space above', () => {
      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 600, writable: true });

      // Position trigger near top of screen
      triggerElement.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 50,
        bottom: 90,
        left: 50,
        right: 150,
        width: 100,
        height: 40,
      });

      const { result } = renderHook(() =>
        useDropdownPosition({
          isOpen: true,
          triggerRef,
          offset: 8,
        })
      );

      // Space above = 50 - 8 = 42 (< 150, so opens downward)
      expect(result.current?.placement).toBe('bottom');
    });
  });

  describe('maxHeight calculation', () => {
    it('should use provided maxHeight when enough space', () => {
      const { result } = renderHook(() =>
        useDropdownPosition({
          isOpen: true,
          triggerRef,
          maxHeight: 300,
        })
      );

      expect(result.current?.maxHeight).toBe(300);
    });

    it('should limit maxHeight to available space', () => {
      // Position trigger so there's limited space below
      triggerElement.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 500,
        bottom: 540,
        left: 200,
        right: 300,
        width: 100,
        height: 40,
      });

      const { result } = renderHook(() =>
        useDropdownPosition({
          isOpen: true,
          triggerRef,
          maxHeight: 400,
          offset: 8,
        })
      );

      // Space below = 800 - 540 - 8 = 252
      // maxHeight should be min(400, max(100, 252)) = 252
      expect(result.current?.maxHeight).toBe(252);
    });

    it('should ensure minimum maxHeight of 100', () => {
      // Position trigger very close to bottom
      triggerElement.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 750,
        bottom: 790,
        left: 200,
        right: 300,
        width: 100,
        height: 40,
      });

      // With not enough space below, it should flip to top
      // But if both spaces are small, ensure min 100
      const { result } = renderHook(() =>
        useDropdownPosition({
          isOpen: true,
          triggerRef,
          maxHeight: 400,
          offset: 8,
        })
      );

      expect(result.current?.maxHeight).toBeGreaterThanOrEqual(100);
    });
  });

  describe('offset', () => {
    it('should apply custom offset', () => {
      const { result } = renderHook(() =>
        useDropdownPosition({
          isOpen: true,
          triggerRef,
          offset: 16,
        })
      );

      expect(result.current?.top).toBe(156); // rect.bottom (140) + offset (16)
    });

    it('should use default offset of 8', () => {
      const { result } = renderHook(() =>
        useDropdownPosition({
          isOpen: true,
          triggerRef,
        })
      );

      expect(result.current?.top).toBe(148); // rect.bottom (140) + default offset (8)
    });
  });

  describe('resize handling', () => {
    it('should add resize listener when open', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      renderHook(() =>
        useDropdownPosition({
          isOpen: true,
          triggerRef,
        })
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('should remove resize listener on cleanup', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() =>
        useDropdownPosition({
          isOpen: true,
          triggerRef,
        })
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('should recalculate position on resize', () => {
      const { result } = renderHook(() =>
        useDropdownPosition({
          isOpen: true,
          triggerRef,
        })
      );

      const initialRight = result.current?.right;

      // Change viewport width
      Object.defineProperty(window, 'innerWidth', { value: 1400, writable: true });

      // Trigger resize event
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      // Right position should be recalculated
      expect(result.current?.right).toBe(1100); // 1400 - 300
      expect(result.current?.right).not.toBe(initialRight);
    });
  });

  describe('state updates', () => {
    it('should update position when isOpen changes to true', () => {
      const { result, rerender } = renderHook(
        ({ isOpen }) =>
          useDropdownPosition({
            isOpen,
            triggerRef,
          }),
        { initialProps: { isOpen: false } }
      );

      expect(result.current).toBeNull();

      rerender({ isOpen: true });

      expect(result.current).not.toBeNull();
      expect(result.current?.placement).toBe('bottom');
    });

    it('should clear position when isOpen changes to false', () => {
      const { result, rerender } = renderHook(
        ({ isOpen }) =>
          useDropdownPosition({
            isOpen,
            triggerRef,
          }),
        { initialProps: { isOpen: true } }
      );

      expect(result.current).not.toBeNull();

      rerender({ isOpen: false });

      expect(result.current).toBeNull();
    });
  });
});
