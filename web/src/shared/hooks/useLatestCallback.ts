import { useRef, useEffect, useCallback } from 'react';

/**
 * Returns a stable function reference that always calls the latest version
 * of the provided callback. Useful for event handlers that need access to
 * the latest state/props without causing listener churn.
 *
 * Pattern replaces:
 *   const handlerRef = useRef(() => {});
 *   useEffect(() => { handlerRef.current = () => { ... }; }, [deps]);
 *   // then pass () => handlerRef.current() to listeners
 *
 * Usage:
 *   const handler = useLatestCallback(() => { ... uses latest state ... });
 *   // handler reference is stable — safe for addEventListener without cleanup churn
 */
export function useLatestCallback<T extends (...args: never[]) => unknown>(callback: T): T {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(
    ((...args: unknown[]) => callbackRef.current(...(args as never[]))) as unknown as T,
    []
  );
}
