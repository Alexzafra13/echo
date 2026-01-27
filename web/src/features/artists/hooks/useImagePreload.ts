import { useState, useEffect } from 'react';
import { logger } from '@shared/utils/logger';

interface UseImagePreloadOptions {
  /** URL of the image to preload */
  url: string | null | undefined;
  /** Name/type of the image for logging */
  name?: string;
  /** Whether to enable preloading (default: true) */
  enabled?: boolean;
}

interface UseImagePreloadResult {
  /** Key that changes when image is loaded, useful for forcing re-renders */
  renderKey: number;
  /** Whether the image is currently loading */
  isLoading: boolean;
  /** Whether the image has loaded successfully */
  isLoaded: boolean;
  /** Whether there was an error loading the image */
  hasError: boolean;
}

/**
 * Hook to preload an image and track its loading state.
 * Forces browser to fetch and cache the image, useful for CSS background-images
 * that may not respect cache headers properly.
 *
 * @example
 * ```tsx
 * const { renderKey } = useImagePreload({ url: backgroundUrl, name: 'background' });
 *
 * return (
 *   <div
 *     key={`${backgroundUrl}-${renderKey}`}
 *     style={{ backgroundImage: `url(${backgroundUrl})` }}
 *   />
 * );
 * ```
 */
export function useImagePreload({
  url,
  name = 'image',
  enabled = true,
}: UseImagePreloadOptions): UseImagePreloadResult {
  const [renderKey, setRenderKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!url || !enabled) {
      setIsLoading(false);
      setIsLoaded(false);
      setHasError(false);
      return;
    }

    logger.debug(`[useImagePreload] 🔄 Preloading ${name}:`, url);
    setIsLoading(true);
    setIsLoaded(false);
    setHasError(false);

    const img = new window.Image();
    img.src = url;

    img.onload = () => {
      logger.debug(`[useImagePreload] ✅ ${name} preloaded successfully`);
      setIsLoading(false);
      setIsLoaded(true);
      // Force React to destroy and recreate elements using this image
      // This helps clear any browser memory cache of the old image
      setRenderKey((prev) => prev + 1);
    };

    img.onerror = (e) => {
      logger.error(`[useImagePreload] ❌ Failed to preload ${name}:`, e);
      setIsLoading(false);
      setHasError(true);
    };

    // Cleanup: abort loading if component unmounts or URL changes
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [url, name, enabled]);

  return {
    renderKey,
    isLoading,
    isLoaded,
    hasError,
  };
}
