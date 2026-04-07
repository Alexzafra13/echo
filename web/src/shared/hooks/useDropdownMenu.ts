import { useState, useRef, useEffect, useCallback } from 'react';
import { useDropdownPosition } from './useDropdownPosition';

export interface UseDropdownMenuOptions {
  offset?: number;
  align?: 'left' | 'right';
  maxHeight?: number;
  animationDuration?: number;
}

export interface UseDropdownMenuReturn {
  isOpen: boolean;
  isClosing: boolean;
  triggerRef: React.RefObject<HTMLButtonElement>;
  dropdownRef: React.RefObject<HTMLDivElement>;
  effectivePosition: ReturnType<typeof useDropdownPosition>;
  toggleMenu: (e: React.MouseEvent) => void;
  closeMenu: () => void;
  handleOptionClick: <T extends unknown[]>(
    e: React.MouseEvent,
    callback?: (...args: T) => void,
    ...args: T
  ) => void;
}

/**
 * Custom hook to manage dropdown menu state and behavior
 * Consolidates common logic for AlbumOptionsMenu, TrackOptionsMenu, ArtistOptionsMenu, etc.
 *
 * Features:
 * - Smart positioning with useDropdownPosition
 * - Click outside to close
 * - Scroll to close
 * - Closing animation support
 *
 * @example
 * ```tsx
 * const {
 *   isOpen,
 *   isClosing,
 *   triggerRef,
 *   dropdownRef,
 *   effectivePosition,
 *   toggleMenu,
 *   handleOptionClick,
 * } = useDropdownMenu();
 *
 * return (
 *   <>
 *     <button ref={triggerRef} onClick={toggleMenu}>Open</button>
 *     {isOpen && effectivePosition && (
 *       <Portal>
 *         <div ref={dropdownRef} style={{ top: effectivePosition.top }}>
 *           <button onClick={(e) => handleOptionClick(e, onAction)}>Action</button>
 *         </div>
 *       </Portal>
 *     )}
 *   </>
 * );
 * ```
 */
export function useDropdownMenu(options: UseDropdownMenuOptions = {}): UseDropdownMenuReturn {
  const { offset = 8, align = 'right', maxHeight = 400, animationDuration = 150 } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastPositionRef = useRef<ReturnType<typeof useDropdownPosition>>(null);

  // Calculate dropdown position with smart placement
  const position = useDropdownPosition({
    isOpen: isOpen && !isClosing,
    triggerRef,
    offset,
    align,
    maxHeight,
  });

  // Keep last valid position for closing animation
  if (position) {
    lastPositionRef.current = position;
  }
  const effectivePosition = isClosing ? lastPositionRef.current : position;

  // Function to close with animation
  const closeMenu = useCallback(() => {
    if (!isOpen || isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, animationDuration);
  }, [isOpen, isClosing, animationDuration]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, closeMenu]);

  // Close menu on scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => {
      closeMenu();
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, closeMenu]);

  // Keyboard navigation: Escape cierra, ArrowDown/ArrowUp navega items
  useEffect(() => {
    if (!isOpen || isClosing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
        triggerRef.current?.focus();
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const dropdown = dropdownRef.current;
        if (!dropdown) return;

        const items = dropdown.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a:not([disabled]), [role="menuitem"]'
        );
        if (items.length === 0) return;

        const currentIndex = Array.from(items).findIndex((item) => item === document.activeElement);

        let nextIndex: number;
        if (e.key === 'ArrowDown') {
          nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        }

        items[nextIndex]?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isClosing, closeMenu]);

  const toggleMenu = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isOpen) {
        closeMenu();
      } else {
        setIsOpen(true);
      }
    },
    [isOpen, closeMenu]
  );

  const handleOptionClick = useCallback(
    <T extends unknown[]>(e: React.MouseEvent, callback?: (...args: T) => void, ...args: T) => {
      e.stopPropagation();
      if (callback) {
        callback(...args);
      }
      closeMenu();
    },
    [closeMenu]
  );

  return {
    isOpen,
    isClosing,
    triggerRef,
    dropdownRef,
    effectivePosition,
    toggleMenu,
    closeMenu,
    handleOptionClick,
  };
}
