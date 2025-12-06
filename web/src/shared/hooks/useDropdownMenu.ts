import { useState, useRef, useEffect, useCallback } from 'react';
import { useDropdownPosition } from './useDropdownPosition';

export interface UseDropdownMenuOptions {
  /** Offset from trigger element in pixels (default: 8) */
  offset?: number;
  /** Horizontal alignment (default: 'right') */
  align?: 'left' | 'right';
  /** Maximum height of dropdown (default: 400) */
  maxHeight?: number;
  /** Animation duration in ms (default: 150) */
  animationDuration?: number;
}

export interface UseDropdownMenuReturn {
  /** Whether the dropdown is currently open */
  isOpen: boolean;
  /** Whether the dropdown is in closing animation */
  isClosing: boolean;
  /** Ref to attach to the trigger button */
  triggerRef: React.RefObject<HTMLButtonElement>;
  /** Ref to attach to the dropdown container */
  dropdownRef: React.RefObject<HTMLDivElement>;
  /** Calculated position for the dropdown (use for inline styles) */
  effectivePosition: ReturnType<typeof useDropdownPosition>;
  /** Toggle the menu open/closed */
  toggleMenu: (e: React.MouseEvent) => void;
  /** Close the menu with animation */
  closeMenu: () => void;
  /** Handle option click - calls callback and closes menu */
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
  const {
    offset = 8,
    align = 'right',
    maxHeight = 400,
    animationDuration = 150,
  } = options;

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

    // Listen to scroll on capture phase to catch all scroll events
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, closeMenu]);

  const toggleMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      closeMenu();
    } else {
      setIsOpen(true);
    }
  }, [isOpen, closeMenu]);

  const handleOptionClick = useCallback(<T extends unknown[]>(
    e: React.MouseEvent,
    callback?: (...args: T) => void,
    ...args: T
  ) => {
    e.stopPropagation();
    if (callback) {
      callback(...args);
    }
    closeMenu();
  }, [closeMenu]);

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
