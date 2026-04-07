import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDropdownMenu } from './useDropdownMenu';

// Mock useDropdownPosition
vi.mock('./useDropdownPosition', () => ({
  useDropdownPosition: vi.fn(() => ({
    top: 100,
    right: 50,
    maxHeight: 400,
    placement: 'bottom' as const,
  })),
}));

describe('useDropdownMenu', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should start with menu closed', () => {
      const { result } = renderHook(() => useDropdownMenu());

      expect(result.current.isOpen).toBe(false);
      expect(result.current.isClosing).toBe(false);
    });

    it('should provide refs for trigger and dropdown', () => {
      const { result } = renderHook(() => useDropdownMenu());

      expect(result.current.triggerRef).toBeDefined();
      expect(result.current.dropdownRef).toBeDefined();
      expect(result.current.triggerRef.current).toBe(null);
      expect(result.current.dropdownRef.current).toBe(null);
    });

    it('should provide toggle and close functions', () => {
      const { result } = renderHook(() => useDropdownMenu());

      expect(typeof result.current.toggleMenu).toBe('function');
      expect(typeof result.current.closeMenu).toBe('function');
      expect(typeof result.current.handleOptionClick).toBe('function');
    });
  });

  describe('toggleMenu', () => {
    it('should open menu when closed', () => {
      const { result } = renderHook(() => useDropdownMenu());

      const mockEvent = {
        stopPropagation: vi.fn(),
      } as unknown as React.MouseEvent;

      act(() => {
        result.current.toggleMenu(mockEvent);
      });

      expect(result.current.isOpen).toBe(true);
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should close menu when open', () => {
      const { result } = renderHook(() => useDropdownMenu());

      const mockEvent = {
        stopPropagation: vi.fn(),
      } as unknown as React.MouseEvent;

      // Open first
      act(() => {
        result.current.toggleMenu(mockEvent);
      });
      expect(result.current.isOpen).toBe(true);

      // Toggle to close
      act(() => {
        result.current.toggleMenu(mockEvent);
      });

      // Should be in closing state
      expect(result.current.isClosing).toBe(true);
    });

    it('should stop event propagation', () => {
      const { result } = renderHook(() => useDropdownMenu());

      const mockEvent = {
        stopPropagation: vi.fn(),
      } as unknown as React.MouseEvent;

      act(() => {
        result.current.toggleMenu(mockEvent);
      });

      expect(mockEvent.stopPropagation).toHaveBeenCalledTimes(1);
    });
  });

  describe('closeMenu', () => {
    it('should set isClosing to true immediately', () => {
      const { result } = renderHook(() => useDropdownMenu());

      // Open menu first
      act(() => {
        result.current.toggleMenu({ stopPropagation: vi.fn() } as unknown as React.MouseEvent);
      });

      act(() => {
        result.current.closeMenu();
      });

      expect(result.current.isClosing).toBe(true);
      expect(result.current.isOpen).toBe(true); // Still open during animation
    });

    it('should fully close after animation duration', () => {
      const { result } = renderHook(() => useDropdownMenu({ animationDuration: 150 }));

      // Open menu first
      act(() => {
        result.current.toggleMenu({ stopPropagation: vi.fn() } as unknown as React.MouseEvent);
      });

      act(() => {
        result.current.closeMenu();
      });

      // Advance timers past animation duration
      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(result.current.isOpen).toBe(false);
      expect(result.current.isClosing).toBe(false);
    });

    it('should not do anything if already closing', () => {
      const { result } = renderHook(() => useDropdownMenu());

      // Open menu
      act(() => {
        result.current.toggleMenu({ stopPropagation: vi.fn() } as unknown as React.MouseEvent);
      });

      // Start closing
      act(() => {
        result.current.closeMenu();
      });

      const isClosingBefore = result.current.isClosing;

      // Try to close again
      act(() => {
        result.current.closeMenu();
      });

      expect(result.current.isClosing).toBe(isClosingBefore);
    });

    it('should not do anything if already closed', () => {
      const { result } = renderHook(() => useDropdownMenu());

      // Should not throw or change state
      act(() => {
        result.current.closeMenu();
      });

      expect(result.current.isOpen).toBe(false);
      expect(result.current.isClosing).toBe(false);
    });
  });

  describe('handleOptionClick', () => {
    it('should call callback with provided arguments', () => {
      const { result } = renderHook(() => useDropdownMenu());
      const callback = vi.fn();

      const mockEvent = {
        stopPropagation: vi.fn(),
      } as unknown as React.MouseEvent;

      // Open menu first
      act(() => {
        result.current.toggleMenu(mockEvent);
      });

      act(() => {
        result.current.handleOptionClick(mockEvent, callback, 'arg1', 'arg2');
      });

      expect(callback).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should stop event propagation', () => {
      const { result } = renderHook(() => useDropdownMenu());

      const mockEvent = {
        stopPropagation: vi.fn(),
      } as unknown as React.MouseEvent;

      act(() => {
        result.current.handleOptionClick(mockEvent);
      });

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should close menu after clicking option', () => {
      const { result } = renderHook(() => useDropdownMenu());

      const mockEvent = {
        stopPropagation: vi.fn(),
      } as unknown as React.MouseEvent;

      // Open menu first
      act(() => {
        result.current.toggleMenu(mockEvent);
      });

      act(() => {
        result.current.handleOptionClick(mockEvent);
      });

      expect(result.current.isClosing).toBe(true);
    });

    it('should work without callback', () => {
      const { result } = renderHook(() => useDropdownMenu());

      const mockEvent = {
        stopPropagation: vi.fn(),
      } as unknown as React.MouseEvent;

      // Should not throw
      expect(() => {
        act(() => {
          result.current.handleOptionClick(mockEvent);
        });
      }).not.toThrow();
    });
  });

  describe('click outside', () => {
    it('should add mousedown listener when menu opens', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      const { result } = renderHook(() => useDropdownMenu());

      // Open menu
      act(() => {
        result.current.toggleMenu({ stopPropagation: vi.fn() } as unknown as React.MouseEvent);
      });

      expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      addEventListenerSpy.mockRestore();
    });

    it('should not add listener when menu is closed', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      renderHook(() => useDropdownMenu());

      // Check that mousedown was not added (menu is closed)
      const mousedownCalls = addEventListenerSpy.mock.calls.filter(
        call => call[0] === 'mousedown'
      );
      expect(mousedownCalls.length).toBe(0);
      addEventListenerSpy.mockRestore();
    });

    it('should remove event listener when menu closes', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { result } = renderHook(() => useDropdownMenu());

      // Open menu
      act(() => {
        result.current.toggleMenu({ stopPropagation: vi.fn() } as unknown as React.MouseEvent);
      });

      // Close and complete animation
      act(() => {
        result.current.closeMenu();
        vi.advanceTimersByTime(150);
      });

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });

    it('should cleanup on unmount when menu is open', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { result, unmount } = renderHook(() => useDropdownMenu());

      // Open menu
      act(() => {
        result.current.toggleMenu({ stopPropagation: vi.fn() } as unknown as React.MouseEvent);
      });

      // Unmount while menu is open
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('scroll behavior', () => {
    it('should close menu on scroll', () => {
      const { result } = renderHook(() => useDropdownMenu());

      // Open menu
      act(() => {
        result.current.toggleMenu({ stopPropagation: vi.fn() } as unknown as React.MouseEvent);
      });

      expect(result.current.isOpen).toBe(true);

      // Simulate scroll event
      act(() => {
        const scrollEvent = new Event('scroll', { bubbles: true });
        window.dispatchEvent(scrollEvent);
      });

      expect(result.current.isClosing).toBe(true);
    });

    it('should remove scroll listener when menu closes', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { result } = renderHook(() => useDropdownMenu());

      // Open menu
      act(() => {
        result.current.toggleMenu({ stopPropagation: vi.fn() } as unknown as React.MouseEvent);
      });

      // Close and complete animation
      act(() => {
        result.current.closeMenu();
        vi.advanceTimersByTime(150);
      });

      expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true);
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('options', () => {
    it('should use custom animation duration', () => {
      const { result } = renderHook(() => useDropdownMenu({ animationDuration: 300 }));

      // Open menu
      act(() => {
        result.current.toggleMenu({ stopPropagation: vi.fn() } as unknown as React.MouseEvent);
      });

      // Start closing
      act(() => {
        result.current.closeMenu();
      });

      // Advance by default duration (150ms) - should still be closing
      act(() => {
        vi.advanceTimersByTime(150);
      });
      expect(result.current.isClosing).toBe(true);

      // Advance to complete custom duration
      act(() => {
        vi.advanceTimersByTime(150);
      });
      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('effectivePosition', () => {
    it('should provide position when open', () => {
      const { result } = renderHook(() => useDropdownMenu());

      // Open menu
      act(() => {
        result.current.toggleMenu({ stopPropagation: vi.fn() } as unknown as React.MouseEvent);
      });

      expect(result.current.effectivePosition).toBeDefined();
      expect(result.current.effectivePosition?.top).toBe(100);
      expect(result.current.effectivePosition?.placement).toBe('bottom');
    });
  });
});
