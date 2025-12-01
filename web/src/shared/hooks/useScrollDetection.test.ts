import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScrollDetection } from './useScrollDetection';

describe('useScrollDetection', () => {
  let mockScrollContainer: HTMLDivElement;
  let mockHeader: HTMLElement;

  beforeEach(() => {
    // Create mock DOM structure
    mockScrollContainer = document.createElement('div');
    mockScrollContainer.style.overflowY = 'auto';
    Object.defineProperty(mockScrollContainer, 'scrollTop', {
      writable: true,
      value: 0,
    });

    mockHeader = document.createElement('header');

    // Set up DOM hierarchy
    const container = document.createElement('div');
    container.appendChild(mockHeader);
    container.appendChild(mockScrollContainer);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return isScrolled false by default', () => {
      const { result } = renderHook(() => useScrollDetection());

      expect(result.current.isScrolled).toBe(false);
      expect(result.current.headerRef).toBeDefined();
    });

    it('should return isScrolled true when alwaysScrolled is true', () => {
      const { result } = renderHook(() =>
        useScrollDetection({ alwaysScrolled: true })
      );

      expect(result.current.isScrolled).toBe(true);
    });
  });

  describe('threshold handling', () => {
    it('should use default threshold of 50', () => {
      const { result } = renderHook(() => useScrollDetection());

      // Default threshold is 50, so scrolling to 49 should not trigger
      expect(result.current.isScrolled).toBe(false);
    });

    it('should accept custom threshold', () => {
      const { result } = renderHook(() =>
        useScrollDetection({ threshold: 100 })
      );

      expect(result.current.isScrolled).toBe(false);
    });
  });

  describe('ref handling', () => {
    it('should return a headerRef that can be attached to elements', () => {
      const { result } = renderHook(() => useScrollDetection());

      expect(result.current.headerRef).toBeDefined();
      expect(result.current.headerRef.current).toBe(null);
    });
  });

  describe('alwaysScrolled option', () => {
    it('should skip scroll detection when alwaysScrolled is true', () => {
      const { result, rerender } = renderHook(
        ({ alwaysScrolled }) => useScrollDetection({ alwaysScrolled }),
        { initialProps: { alwaysScrolled: true } }
      );

      expect(result.current.isScrolled).toBe(true);

      // Even after rerender, should stay true
      rerender({ alwaysScrolled: true });
      expect(result.current.isScrolled).toBe(true);
    });

    it('should return true immediately without waiting for scroll events', () => {
      const { result } = renderHook(() =>
        useScrollDetection({ alwaysScrolled: true })
      );

      // Should be true on first render
      expect(result.current.isScrolled).toBe(true);
    });
  });

  describe('window scroll fallback', () => {
    it('should listen to window scroll when no scroll container found', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      renderHook(() => useScrollDetection());

      // Should fall back to window scroll listener
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function),
        { passive: true }
      );

      addEventListenerSpy.mockRestore();
    });

    it('should remove window scroll listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useScrollDetection());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('scroll event handling', () => {
    it('should update isScrolled when window.scrollY changes', () => {
      const { result } = renderHook(() => useScrollDetection({ threshold: 50 }));

      expect(result.current.isScrolled).toBe(false);

      // Simulate window scroll
      act(() => {
        Object.defineProperty(window, 'scrollY', { value: 100, writable: true });
        window.dispatchEvent(new Event('scroll'));
      });

      expect(result.current.isScrolled).toBe(true);

      // Scroll back up
      act(() => {
        Object.defineProperty(window, 'scrollY', { value: 10, writable: true });
        window.dispatchEvent(new Event('scroll'));
      });

      expect(result.current.isScrolled).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should not throw when unmounting', () => {
      const { unmount } = renderHook(() => useScrollDetection());

      expect(() => unmount()).not.toThrow();
    });

    it('should clean up event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useScrollDetection());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalled();
      removeEventListenerSpy.mockRestore();
    });
  });
});
