/**
 * Modal Base Component
 *
 * Reusable modal component with built-in:
 * - ESC key handling
 * - Click outside to close
 * - Accessible close button
 * - Portal rendering
 * - Focus trap for accessibility
 * - Support for custom headers with icons and subtitles
 */

import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useFocusTrap } from '@shared/hooks';
import styles from './Modal.module.css';

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title - can be string or custom ReactNode */
  title: React.ReactNode;
  /** Modal content */
  children: React.ReactNode;
  /** Optional icon to display next to title */
  icon?: LucideIcon;
  /** Optional subtitle below title */
  subtitle?: React.ReactNode;
  /** Optional custom width */
  width?: string;
  /** Optional class name for content */
  className?: string;
  /** Optional aria-label for the close button (default: "Cerrar") */
  closeLabel?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  icon: Icon,
  subtitle,
  width,
  className,
  closeLabel = 'Cerrar',
}: ModalProps) {
  // Focus trap for accessibility
  const focusTrapRef = useFocusTrap<HTMLDivElement>(isOpen);

  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Click backdrop to close
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className={styles.modalOverlay}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={focusTrapRef}
        className={`${styles.modalContent} ${className || ''}`}
        style={width ? { width } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderContent}>
            {Icon && (
              <div className={styles.modalIcon}>
                <Icon size={24} />
              </div>
            )}
            <div className={styles.modalTitleWrapper}>
              <h2 id="modal-title" className={styles.modalTitle}>{title}</h2>
              {subtitle && <p className={styles.modalSubtitle}>{subtitle}</p>}
            </div>
          </div>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label={closeLabel}
            type="button"
          >
            <X size={24} />
          </button>
        </div>
        <div className={styles.modalBody}>
          {children}
        </div>
      </div>
    </div>
  );

  // Render in portal to avoid z-index issues
  return createPortal(modalContent, document.body);
}
