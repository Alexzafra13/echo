/**
 * Image Preview Modal Component
 *
 * Modal for previewing enrichment images
 * Uses React Portal to render outside parent container,
 * ensuring fullscreen overlay regardless of parent overflow settings
 */

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './HistoryTab.module.css';

export interface ImagePreviewModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

/**
 * Image preview modal - uses Portal to render at document body level
 */
export function ImagePreviewModal({ imageUrl, onClose }: ImagePreviewModalProps) {
  // Handle escape key to close modal
  useEffect(() => {
    if (!imageUrl) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  // Use Portal to render modal directly in document.body
  // This ensures the overlay covers the entire viewport
  return createPortal(
    <div className={styles.imageModal} onClick={onClose}>
      <div className={styles.imageModalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.imageModalClose} onClick={onClose}>
          ×
        </button>
        <img
          src={imageUrl}
          alt="Preview"
          className={styles.imageModalImage}
          onError={(e) => {
            e.currentTarget.src = '/placeholder-album.png';
          }}
        />
      </div>
    </div>,
    document.body
  );
}
