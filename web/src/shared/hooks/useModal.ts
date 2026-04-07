import { useState, useCallback } from 'react';

/**
 * useModal Hook
 *
 * Simplifies modal state management by providing a consistent API
 * for opening and closing modals.
 *
 * @example
 * // Basic usage
 * const deleteModal = useModal();
 *
 * <Button onClick={deleteModal.open}>Delete</Button>
 * {deleteModal.isOpen && (
 *   <DeleteModal onClose={deleteModal.close} />
 * )}
 *
 * @example
 * // With data
 * const editModal = useModal<Playlist>();
 *
 * <Button onClick={() => editModal.openWith(playlist)}>Edit</Button>
 * {editModal.isOpen && (
 *   <EditModal playlist={editModal.data!} onClose={editModal.close} />
 * )}
 */

export interface UseModalReturn<T = void> {
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** Data passed to the modal (if any) */
  data: T | null;
  /** Open the modal without data */
  open: () => void;
  /** Open the modal with data */
  openWith: (data: T) => void;
  /** Close the modal and clear data */
  close: () => void;
  /** Toggle the modal state */
  toggle: () => void;
}

export function useModal<T = void>(initialOpen = false): UseModalReturn<T> {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [data, setData] = useState<T | null>(null);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const openWith = useCallback((modalData: T) => {
    setData(modalData);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setData(null);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return {
    isOpen,
    data,
    open,
    openWith,
    close,
    toggle,
  };
}

export default useModal;
