import { useRef, useCallback } from 'react';

const TAP_COUNT = 7;
const TAP_WINDOW_MS = 3000;

/**
 * Hook that detects N rapid taps to trigger a secret action.
 * Returns a click handler to attach to any element.
 */
export function useHiddenAccess(onActivate: () => void) {
  const tapsRef = useRef<number[]>([]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    // Remove taps outside the time window
    tapsRef.current = tapsRef.current.filter((t) => now - t < TAP_WINDOW_MS);
    tapsRef.current.push(now);

    if (tapsRef.current.length >= TAP_COUNT) {
      tapsRef.current = [];
      onActivate();
    }
  }, [onActivate]);

  return handleTap;
}
