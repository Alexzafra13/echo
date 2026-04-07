import { useEffect, useRef } from 'react';

/**
 * Transparently reloads the page on the next route change after a new
 * service worker has taken control. The user never sees a prompt — they
 * simply get the latest version when they navigate.
 *
 * How it works:
 * 1. `skipWaiting` + `clientsClaim` in workbox config cause the new SW
 *    to activate immediately.
 * 2. The browser fires `controllerchange` on `navigator.serviceWorker`.
 * 3. We set a flag and, on the next route change, call `location.reload()`.
 */
export function usePwaAutoUpdate(currentPath: string) {
  const updateReady = useRef(false);
  const isFirstRender = useRef(true);

  // Listen for service worker controller changes
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const onControllerChange = () => {
      updateReady.current = true;
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  // Reload on route change when an update is pending
  useEffect(() => {
    // Skip the initial render — we only care about navigations
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (updateReady.current) {
      window.location.reload();
    }
  }, [currentPath]);
}
