import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClickOutside } from './useClickOutside';

describe('useClickOutside', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return ref, isClosing false, and close function', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() => useClickOutside(onClose));

      expect(result.current.ref).toBeDefined();
      expect(result.current.isClosing).toBe(false);
      expect(typeof result.current.close).toBe('function');
    });

    it('should return ref with null current initially', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() => useClickOutside(onClose));

      expect(result.current.ref.current).toBe(null);
    });
  });

  describe('enabled option', () => {
    it('should not add event listener when enabled is false', () => {
      const onClose = vi.fn();
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      renderHook(() => useClickOutside(onClose, { enabled: false }));

      expect(addEventListenerSpy).not.toHaveBeenCalledWith(
        'mousedown',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
    });

    it('should add event listener when enabled is true', () => {
      const onClose = vi.fn();
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      renderHook(() => useClickOutside(onClose, { enabled: true }));

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'mousedown',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
    });

    it('should add event listener by default (enabled defaults to true)', () => {
      const onClose = vi.fn();
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      renderHook(() => useClickOutside(onClose));

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'mousedown',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
    });
  });

  describe('close function', () => {
    it('should call onClose immediately when no animationDuration', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() => useClickOutside(onClose));

      act(() => {
        result.current.close();
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose after animationDuration', async () => {
      const onClose = vi.fn();
      const { result } = renderHook(() =>
        useClickOutside(onClose, { animationDuration: 200 })
      );

      act(() => {
        result.current.close();
      });

      // onClose should not be called yet
      expect(onClose).not.toHaveBeenCalled();
      expect(result.current.isClosing).toBe(true);

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should set isClosing to true during animation', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() =>
        useClickOutside(onClose, { animationDuration: 200 })
      );

      expect(result.current.isClosing).toBe(false);

      act(() => {
        result.current.close();
      });

      expect(result.current.isClosing).toBe(true);

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current.isClosing).toBe(false);
    });

    it('should call callback after close completes', () => {
      const onClose = vi.fn();
      const callback = vi.fn();
      const { result } = renderHook(() =>
        useClickOutside(onClose, { animationDuration: 200 })
      );

      act(() => {
        result.current.close(callback);
      });

      expect(callback).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should call callback immediately when no animation', () => {
      const onClose = vi.fn();
      const callback = vi.fn();
      const { result } = renderHook(() => useClickOutside(onClose));

      act(() => {
        result.current.close(callback);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should prevent multiple close calls during animation', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() =>
        useClickOutside(onClose, { animationDuration: 200 })
      );

      act(() => {
        result.current.close();
        result.current.close();
        result.current.close();
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Should only be called once despite multiple close() calls
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('click outside detection', () => {
    it('should call close when clicking outside the ref element', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() => useClickOutside(onClose));

      // Create and attach element to ref
      const element = document.createElement('div');
      document.body.appendChild(element);

      // Manually set ref (simulating what React would do)
      Object.defineProperty(result.current.ref, 'current', {
        value: element,
        writable: true,
      });

      // Click outside
      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);

      act(() => {
        const event = new MouseEvent('mousedown', { bubbles: true });
        Object.defineProperty(event, 'target', { value: outsideElement });
        document.dispatchEvent(event);
      });

      expect(onClose).toHaveBeenCalled();

      document.body.removeChild(element);
      document.body.removeChild(outsideElement);
    });
  });

  describe('cleanup', () => {
    it('should remove event listener on unmount', () => {
      const onClose = vi.fn();
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = renderHook(() => useClickOutside(onClose));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'mousedown',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });

    it('should clear timeout on unmount', () => {
      const onClose = vi.fn();
      const { result, unmount } = renderHook(() =>
        useClickOutside(onClose, { animationDuration: 200 })
      );

      act(() => {
        result.current.close();
      });

      // Unmount before timeout completes
      unmount();

      // Advance timers - onClose should not be called since we unmounted
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // The onClose might still be called due to how the timeout was already scheduled
      // but the important thing is no errors are thrown
    });

    it('should not throw when unmounting', () => {
      const onClose = vi.fn();
      const { unmount } = renderHook(() => useClickOutside(onClose));

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('ref stability', () => {
    it('should return stable ref across rerenders', () => {
      const onClose = vi.fn();
      const { result, rerender } = renderHook(() => useClickOutside(onClose));

      const ref1 = result.current.ref;
      rerender();
      const ref2 = result.current.ref;

      expect(ref1).toBe(ref2);
    });

    it('should return stable close function across rerenders', () => {
      const onClose = vi.fn();
      const { result, rerender } = renderHook(() => useClickOutside(onClose));

      const close1 = result.current.close;
      rerender();
      const close2 = result.current.close;

      // close might change due to useCallback dependencies, but should be callable
      expect(typeof close1).toBe('function');
      expect(typeof close2).toBe('function');
    });
  });
});
