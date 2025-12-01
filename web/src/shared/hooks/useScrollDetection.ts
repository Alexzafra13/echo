import { useState, useEffect, useRef } from 'react';

export interface UseScrollDetectionOptions {
  /** Threshold in pixels to trigger scrolled state (default: 50) */
  threshold?: number;
  /** Skip scroll detection and always return this value */
  alwaysScrolled?: boolean;
}

export interface UseScrollDetectionReturn {
  /** Whether the scroll position is past the threshold */
  isScrolled: boolean;
  /** Ref to attach to the header element for finding scroll container */
  headerRef: React.RefObject<HTMLElement>;
}

/**
 * Hook to detect scroll position for glassmorphism effects
 *
 * Automatically finds the scrollable container relative to the header element.
 * Supports multiple scroll container strategies (sibling, parent children, parent itself).
 *
 * @param options - Configuration options
 * @returns isScrolled state and headerRef to attach
 *
 * @example
 * ```tsx
 * const { isScrolled, headerRef } = useScrollDetection({ threshold: 50 });
 *
 * return (
 *   <header ref={headerRef} className={isScrolled ? 'scrolled' : ''}>
 *     ...
 *   </header>
 * );
 * ```
 */
export function useScrollDetection(
  options: UseScrollDetectionOptions = {}
): UseScrollDetectionReturn {
  const { threshold = 50, alwaysScrolled = false } = options;

  const [isScrolled, setIsScrolled] = useState(alwaysScrolled);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Skip scroll detection if alwaysScrolled is enabled
    if (alwaysScrolled) {
      setIsScrolled(true);
      return;
    }

    /**
     * Find the scrollable container relative to the header element
     * Tries multiple strategies to find the right container
     */
    const findScrollContainer = (): HTMLElement | null => {
      if (!headerRef.current) return null;

      // Strategy 1: Try next sibling (most common case)
      const nextSibling = headerRef.current.nextElementSibling as HTMLElement | null;

      if (nextSibling) {
        const styles = window.getComputedStyle(nextSibling);
        const hasScroll = styles.overflowY === 'auto' || styles.overflowY === 'scroll';

        if (hasScroll) {
          return nextSibling;
        }
      }

      // Strategy 2: Find any child with overflow-y: auto in parent
      const parent = headerRef.current.parentElement;
      if (parent) {
        const children = Array.from(parent.children) as HTMLElement[];
        const scrollableChild = children.find((child) => {
          if (child === headerRef.current) return false;
          const styles = window.getComputedStyle(child);
          return styles.overflowY === 'auto' || styles.overflowY === 'scroll';
        });

        if (scrollableChild) {
          return scrollableChild;
        }

        // Strategy 3: Check if parent itself is scrollable
        const parentStyles = window.getComputedStyle(parent);
        const parentHasScroll = parentStyles.overflowY === 'auto' || parentStyles.overflowY === 'scroll';

        if (parentHasScroll) {
          return parent;
        }
      }

      return null;
    };

    const scrollContainer = findScrollContainer();

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      const scrollTop = target.scrollTop;
      setIsScrolled(scrollTop > threshold);
    };

    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

      // Check initial scroll position
      if (scrollContainer.scrollTop > threshold) {
        setIsScrolled(true);
      }

      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    }

    // Fallback to window scroll for pages that might use it
    const handleWindowScroll = () => {
      setIsScrolled(window.scrollY > threshold);
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, [alwaysScrolled, threshold]);

  return { isScrolled, headerRef };
}
