import { useEffect, useRef, useCallback, useState } from 'react';

export interface UseClickOutsideOptions {
  /** Whether the listener is active (default: true) */
  enabled?: boolean;
  /** Animation duration in ms before calling onClose (default: 0) */
  animationDuration?: number;
  /** Close on scroll (default: true) */
  closeOnScroll?: boolean;
}

export interface UseClickOutsideReturn<T extends HTMLElement> {
  /** Ref to attach to the container element */
  ref: React.RefObject<T>;
  /** Whether the closing animation is in progress */
  isClosing: boolean;
  /** Manually trigger close with animation */
  close: (callback?: () => void) => void;
}

/**
 * Hook to detect clicks outside an element
 *
 * Supports optional closing animation before triggering callback.
 *
 * @param onClose - Callback when click outside is detected
 * @param options - Configuration options
 * @returns ref to attach, isClosing state, and close function
 *
 * @example
 * ```tsx
 * const { ref, isClosing, close } = useClickOutside(
 *   () => setIsOpen(false),
 *   { enabled: isOpen, animationDuration: 200 }
 * );
 *
 * return (
 *   <div ref={ref} className={isClosing ? 'closing' : ''}>
 *     <button onClick={() => close()}>Close</button>
 *   </div>
 * );
 * ```
 */
export function useClickOutside<T extends HTMLElement = HTMLDivElement>(
  onClose: () => void,
  options: UseClickOutsideOptions = {}
): UseClickOutsideReturn<T> {
  const { enabled = true, animationDuration = 0, closeOnScroll = true } = options;

  const ref = useRef<T>(null);
  const isClosingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCallbackRef = useRef<(() => void) | null>(null);
  // Use state for isClosing so component re-renders with animation class
  const [isClosing, setIsClosing] = useState(false);

  // Reset closing state when enabled changes (menu opens/closes)
  useEffect(() => {
    if (enabled) {
      // Menu opening - reset any stuck state from previous close
      isClosingRef.current = false;
      setIsClosing(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      pendingCallbackRef.current = null;
    }
  }, [enabled]);

  // Execute pending callbacks when menu closes externally
  useEffect(() => {
    if (!enabled && pendingCallbackRef.current) {
      const callback = pendingCallbackRef.current;
      pendingCallbackRef.current = null;
      // Use setTimeout to ensure state updates have propagated
      setTimeout(callback, 0);
    }
  }, [enabled]);

  /**
   * Close with optional animation
   */
  const close = useCallback((callback?: () => void) => {
    // Store callback to execute after close
    if (callback) {
      pendingCallbackRef.current = callback;
    }

    // If already closing, don't start again but ensure callback runs
    if (isClosingRef.current) {
      return;
    }

    if (animationDuration > 0) {
      isClosingRef.current = true;
      setIsClosing(true);

      timeoutRef.current = setTimeout(() => {
        onClose();
        // Execute pending callback
        if (pendingCallbackRef.current) {
          pendingCallbackRef.current();
          pendingCallbackRef.current = null;
        }
        isClosingRef.current = false;
        setIsClosing(false);
      }, animationDuration);
    } else {
      onClose();
      // Execute callback immediately
      if (pendingCallbackRef.current) {
        pendingCallbackRef.current();
        pendingCallbackRef.current = null;
      }
    }
  }, [onClose, animationDuration]);

  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        close();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [enabled, close]);

  // Close on scroll
  useEffect(() => {
    if (!enabled || !closeOnScroll) return;

    const handleScroll = () => {
      close();
    };

    // Listen to scroll on capture phase to catch all scroll events
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [enabled, closeOnScroll, close]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      pendingCallbackRef.current = null;
    };
  }, []);

  return { ref, isClosing, close };
}
