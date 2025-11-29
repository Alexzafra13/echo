import { useEffect, useRef, useCallback, useState } from 'react';

export interface UseClickOutsideOptions {
  /** Whether the listener is active (default: true) */
  enabled?: boolean;
  /** Animation duration in ms before calling onClose (default: 0) */
  animationDuration?: number;
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
  const { enabled = true, animationDuration = 0 } = options;

  const ref = useRef<T>(null);
  const isClosingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Use state for isClosing so component re-renders with animation class
  const [isClosing, setIsClosing] = useState(false);

  /**
   * Close with optional animation
   */
  const close = useCallback((callback?: () => void) => {
    if (isClosingRef.current) return;

    if (animationDuration > 0) {
      isClosingRef.current = true;
      setIsClosing(true);

      timeoutRef.current = setTimeout(() => {
        onClose();
        callback?.();
        isClosingRef.current = false;
        setIsClosing(false);
      }, animationDuration);
    } else {
      onClose();
      callback?.();
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
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, close]);

  return { ref, isClosing, close };
}
