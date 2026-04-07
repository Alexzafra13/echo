import { useEffect } from 'react';

/**
 * Sets document.title reactively.
 * Restores the default title on unmount.
 */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (!title) return;
    const prev = document.title;
    document.title = `${title} · Echo`;
    return () => {
      document.title = prev;
    };
  }, [title]);
}
