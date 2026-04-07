import { useState, useEffect } from 'react';
import { useModal } from '@shared/hooks';

export function useCoverLightbox(coverUrl: string | undefined) {
  const modal = useModal();
  const [coverDimensions, setCoverDimensions] = useState<{ width: number; height: number } | null>(
    null
  );

  // Close lightbox on Escape key
  useEffect(() => {
    if (!modal.isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') modal.close();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [modal.isOpen, modal.close]);

  // Load cover dimensions when modal opens
  useEffect(() => {
    if (modal.isOpen && coverUrl) {
      let cancelled = false;
      const img = new window.Image();
      img.onload = () => {
        if (!cancelled) setCoverDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        if (!cancelled) setCoverDimensions(null);
      };
      img.src = coverUrl;
      return () => {
        cancelled = true;
        img.src = '';
      };
    } else if (!modal.isOpen) {
      setCoverDimensions(null);
    }
  }, [modal.isOpen, coverUrl]);

  return {
    isOpen: modal.isOpen,
    open: modal.open,
    close: modal.close,
    coverDimensions,
  };
}
