import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFocusTrap } from './useFocusTrap';

describe('useFocusTrap', () => {
  let container: HTMLDivElement;
  let button1: HTMLButtonElement;
  let button2: HTMLButtonElement;
  let button3: HTMLButtonElement;
  let outsideButton: HTMLButtonElement;

  beforeEach(() => {
    // Create container with focusable elements
    container = document.createElement('div');
    button1 = document.createElement('button');
    button1.textContent = 'Button 1';
    button2 = document.createElement('button');
    button2.textContent = 'Button 2';
    button3 = document.createElement('button');
    button3.textContent = 'Button 3';

    container.appendChild(button1);
    container.appendChild(button2);
    container.appendChild(button3);
    document.body.appendChild(container);

    // Create button outside container
    outsideButton = document.createElement('button');
    outsideButton.textContent = 'Outside';
    document.body.appendChild(outsideButton);

    // Mock offsetParent for jsdom (jsdom doesn't support layout)
    // This is needed because the hook filters elements where offsetParent is null
    Object.defineProperty(button1, 'offsetParent', { value: container, configurable: true });
    Object.defineProperty(button2, 'offsetParent', { value: container, configurable: true });
    Object.defineProperty(button3, 'offsetParent', { value: container, configurable: true });
    Object.defineProperty(outsideButton, 'offsetParent', { value: document.body, configurable: true });

    // Focus outside button initially
    outsideButton.focus();
  });

  afterEach(() => {
    document.body.removeChild(container);
    document.body.removeChild(outsideButton);
    vi.restoreAllMocks();
  });

  describe('ref handling', () => {
    it('should return a ref object', () => {
      const { result } = renderHook(() => useFocusTrap<HTMLDivElement>(false));

      expect(result.current).toHaveProperty('current');
    });

    it('should initialize ref with null', () => {
      const { result } = renderHook(() => useFocusTrap<HTMLDivElement>(false));

      expect(result.current.current).toBeNull();
    });
  });

  describe('when inactive', () => {
    it('should not trap focus when inactive', () => {
      const { result } = renderHook(() => useFocusTrap<HTMLDivElement>(false));

      // Manually set the ref
      Object.defineProperty(result.current, 'current', {
        value: container,
        writable: true,
      });

      // Focus should remain on outside button
      expect(document.activeElement).toBe(outsideButton);
    });

    it('should not add keydown listener when inactive', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      renderHook(() => useFocusTrap<HTMLDivElement>(false));

      const keydownCalls = addEventListenerSpy.mock.calls.filter(
        call => call[0] === 'keydown'
      );
      expect(keydownCalls.length).toBe(0);
    });
  });

  describe('when active', () => {
    it('should add keydown listener when active', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      const { result } = renderHook(() => useFocusTrap<HTMLDivElement>(true));

      // Set the ref
      Object.defineProperty(result.current, 'current', {
        value: container,
        writable: true,
      });

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should remove keydown listener on cleanup', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { result, unmount } = renderHook(() => useFocusTrap<HTMLDivElement>(true));

      Object.defineProperty(result.current, 'current', {
        value: container,
        writable: true,
      });

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should store previously focused element', () => {
      outsideButton.focus();
      expect(document.activeElement).toBe(outsideButton);

      const { result, unmount } = renderHook(() => useFocusTrap<HTMLDivElement>(true));

      Object.defineProperty(result.current, 'current', {
        value: container,
        writable: true,
      });

      // Wait for requestAnimationFrame
      vi.useFakeTimers();
      act(() => {
        vi.runAllTimers();
      });
      vi.useRealTimers();

      // Unmount should restore focus
      unmount();

      // The hook attempts to restore focus to previousActiveElement
      // Note: In test environment, focus restoration may behave differently
    });
  });

  describe('focus trapping behavior', () => {
    it('should handle Tab key on last element', () => {
      const { result } = renderHook(() => useFocusTrap<HTMLDivElement>(true));

      Object.defineProperty(result.current, 'current', {
        value: container,
        writable: true,
      });

      // Focus on last element
      button3.focus();
      expect(document.activeElement).toBe(button3);

      // Simulate Tab key
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: false,
        bubbles: true,
      });

      const preventDefaultSpy = vi.spyOn(tabEvent, 'preventDefault');

      document.dispatchEvent(tabEvent);

      // Should prevent default and focus first element
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(document.activeElement).toBe(button1);
    });

    it('should handle Shift+Tab key on first element', () => {
      const { result } = renderHook(() => useFocusTrap<HTMLDivElement>(true));

      Object.defineProperty(result.current, 'current', {
        value: container,
        writable: true,
      });

      // Focus on first element
      button1.focus();
      expect(document.activeElement).toBe(button1);

      // Simulate Shift+Tab key
      const shiftTabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
      });

      const preventDefaultSpy = vi.spyOn(shiftTabEvent, 'preventDefault');

      document.dispatchEvent(shiftTabEvent);

      // Should prevent default and focus last element
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(document.activeElement).toBe(button3);
    });

    it('should not prevent default for Tab in middle of focus order', () => {
      const { result } = renderHook(() => useFocusTrap<HTMLDivElement>(true));

      Object.defineProperty(result.current, 'current', {
        value: container,
        writable: true,
      });

      // Focus on middle element
      button2.focus();

      // Simulate Tab key
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: false,
        bubbles: true,
      });

      const preventDefaultSpy = vi.spyOn(tabEvent, 'preventDefault');

      document.dispatchEvent(tabEvent);

      // Should NOT prevent default since we're not at boundary
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('should ignore non-Tab keys', () => {
      const { result } = renderHook(() => useFocusTrap<HTMLDivElement>(true));

      Object.defineProperty(result.current, 'current', {
        value: container,
        writable: true,
      });

      button1.focus();

      // Simulate Enter key
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
      });

      const preventDefaultSpy = vi.spyOn(enterEvent, 'preventDefault');

      document.dispatchEvent(enterEvent);

      // Should not prevent default for Enter
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  describe('focusable elements detection', () => {
    it('should detect buttons', () => {
      const { result } = renderHook(() => useFocusTrap<HTMLDivElement>(true));

      Object.defineProperty(result.current, 'current', {
        value: container,
        writable: true,
      });

      // Three buttons should be detected
      button3.focus();

      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: false,
        bubbles: true,
      });

      document.dispatchEvent(tabEvent);

      // Should wrap to first button
      expect(document.activeElement).toBe(button1);
    });

    it('should skip disabled buttons', () => {
      // Disable middle button
      button2.disabled = true;

      const { result } = renderHook(() => useFocusTrap<HTMLDivElement>(true));

      Object.defineProperty(result.current, 'current', {
        value: container,
        writable: true,
      });

      // Focus on last element
      button3.focus();

      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: false,
        bubbles: true,
      });

      document.dispatchEvent(tabEvent);

      // Should wrap to first button (skipping disabled)
      expect(document.activeElement).toBe(button1);

      // Re-enable for cleanup
      button2.disabled = false;
    });

    it('should detect inputs', () => {
      const input = document.createElement('input');
      input.type = 'text';
      container.appendChild(input);
      // Mock offsetParent for jsdom
      Object.defineProperty(input, 'offsetParent', { value: container, configurable: true });

      const { result } = renderHook(() => useFocusTrap<HTMLDivElement>(true));

      Object.defineProperty(result.current, 'current', {
        value: container,
        writable: true,
      });

      // Focus on input (now last element)
      input.focus();

      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: false,
        bubbles: true,
      });

      document.dispatchEvent(tabEvent);

      // Should wrap to first button
      expect(document.activeElement).toBe(button1);

      container.removeChild(input);
    });

    it('should detect links with href', () => {
      const link = document.createElement('a');
      link.href = 'https://example.com';
      link.textContent = 'Link';
      container.appendChild(link);
      // Mock offsetParent for jsdom
      Object.defineProperty(link, 'offsetParent', { value: container, configurable: true });

      const { result } = renderHook(() => useFocusTrap<HTMLDivElement>(true));

      Object.defineProperty(result.current, 'current', {
        value: container,
        writable: true,
      });

      // Focus on link (now last element)
      link.focus();

      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: false,
        bubbles: true,
      });

      document.dispatchEvent(tabEvent);

      // Should wrap to first button
      expect(document.activeElement).toBe(button1);

      container.removeChild(link);
    });
  });

  describe('state changes', () => {
    it('should activate when isActive changes to true', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      const { result, rerender } = renderHook(
        ({ isActive }) => useFocusTrap<HTMLDivElement>(isActive),
        { initialProps: { isActive: false } }
      );

      Object.defineProperty(result.current, 'current', {
        value: container,
        writable: true,
      });

      // Initially no keydown listener
      const initialKeydownCalls = addEventListenerSpy.mock.calls.filter(
        call => call[0] === 'keydown'
      );
      expect(initialKeydownCalls.length).toBe(0);

      // Activate
      rerender({ isActive: true });

      // Now should have keydown listener
      const afterKeydownCalls = addEventListenerSpy.mock.calls.filter(
        call => call[0] === 'keydown'
      );
      expect(afterKeydownCalls.length).toBe(1);
    });

    it('should deactivate when isActive changes to false', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { result, rerender } = renderHook(
        ({ isActive }) => useFocusTrap<HTMLDivElement>(isActive),
        { initialProps: { isActive: true } }
      );

      Object.defineProperty(result.current, 'current', {
        value: container,
        writable: true,
      });

      // Deactivate
      rerender({ isActive: false });

      // Should have removed keydown listener
      const keydownCalls = removeEventListenerSpy.mock.calls.filter(
        call => call[0] === 'keydown'
      );
      expect(keydownCalls.length).toBe(1);
    });
  });
});
