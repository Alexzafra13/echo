/**
 * Image Preview Modal Component
 *
 * Modal for previewing enrichment images
 */

import styles from './HistoryTab.module.css';

export interface ImagePreviewModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

/**
 * Image preview modal
 */
export function ImagePreviewModal({ imageUrl, onClose }: ImagePreviewModalProps) {
  if (!imageUrl) return null;

  return (
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
    </div>
  );
}
