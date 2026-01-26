import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModal } from './useModal';

describe('useModal', () => {
  describe('initial state', () => {
    it('should start closed by default', () => {
      const { result } = renderHook(() => useModal());

      expect(result.current.isOpen).toBe(false);
      expect(result.current.data).toBeNull();
    });

    it('should start open when initialOpen is true', () => {
      const { result } = renderHook(() => useModal(true));

      expect(result.current.isOpen).toBe(true);
    });

    it('should start closed when initialOpen is false', () => {
      const { result } = renderHook(() => useModal(false));

      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('open', () => {
    it('should open the modal', () => {
      const { result } = renderHook(() => useModal());

      act(() => {
        result.current.open();
      });

      expect(result.current.isOpen).toBe(true);
    });

    it('should keep modal open when called multiple times', () => {
      const { result } = renderHook(() => useModal());

      act(() => {
        result.current.open();
        result.current.open();
      });

      expect(result.current.isOpen).toBe(true);
    });
  });

  describe('close', () => {
    it('should close the modal', () => {
      const { result } = renderHook(() => useModal(true));

      act(() => {
        result.current.close();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('should clear data when closing', () => {
      const { result } = renderHook(() => useModal<{ id: string }>());

      act(() => {
        result.current.openWith({ id: 'test-123' });
      });

      expect(result.current.data).toEqual({ id: 'test-123' });

      act(() => {
        result.current.close();
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe('toggle', () => {
    it('should open when closed', () => {
      const { result } = renderHook(() => useModal());

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isOpen).toBe(true);
    });

    it('should close when open', () => {
      const { result } = renderHook(() => useModal(true));

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('should alternate state on multiple toggles', () => {
      const { result } = renderHook(() => useModal());

      act(() => {
        result.current.toggle();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.toggle();
      });
      expect(result.current.isOpen).toBe(false);

      act(() => {
        result.current.toggle();
      });
      expect(result.current.isOpen).toBe(true);
    });
  });

  describe('openWith', () => {
    it('should open modal with data', () => {
      const { result } = renderHook(() => useModal<{ id: string; name: string }>());

      act(() => {
        result.current.openWith({ id: '123', name: 'Test' });
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.data).toEqual({ id: '123', name: 'Test' });
    });

    it('should replace previous data when called again', () => {
      const { result } = renderHook(() => useModal<{ id: string }>());

      act(() => {
        result.current.openWith({ id: 'first' });
      });

      act(() => {
        result.current.openWith({ id: 'second' });
      });

      expect(result.current.data).toEqual({ id: 'second' });
    });

    it('should work with different data types', () => {
      // String
      const { result: stringResult } = renderHook(() => useModal<string>());
      act(() => {
        stringResult.current.openWith('test-string');
      });
      expect(stringResult.current.data).toBe('test-string');

      // Number
      const { result: numberResult } = renderHook(() => useModal<number>());
      act(() => {
        numberResult.current.openWith(42);
      });
      expect(numberResult.current.data).toBe(42);

      // Array
      const { result: arrayResult } = renderHook(() => useModal<string[]>());
      act(() => {
        arrayResult.current.openWith(['a', 'b', 'c']);
      });
      expect(arrayResult.current.data).toEqual(['a', 'b', 'c']);
    });
  });

  describe('callback stability', () => {
    it('should maintain stable callback references', () => {
      const { result, rerender } = renderHook(() => useModal());

      const { open: open1, close: close1, toggle: toggle1, openWith: openWith1 } = result.current;

      rerender();

      expect(result.current.open).toBe(open1);
      expect(result.current.close).toBe(close1);
      expect(result.current.toggle).toBe(toggle1);
      expect(result.current.openWith).toBe(openWith1);
    });
  });

  describe('workflow scenarios', () => {
    it('should handle open -> close workflow', () => {
      const { result } = renderHook(() => useModal());

      expect(result.current.isOpen).toBe(false);

      act(() => {
        result.current.open();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.close();
      });
      expect(result.current.isOpen).toBe(false);
    });

    it('should handle openWith -> close workflow', () => {
      interface Playlist {
        id: string;
        name: string;
      }

      const { result } = renderHook(() => useModal<Playlist>());
      const playlist: Playlist = { id: 'pl-1', name: 'My Playlist' };

      act(() => {
        result.current.openWith(playlist);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.data).toEqual(playlist);

      act(() => {
        result.current.close();
      });

      expect(result.current.isOpen).toBe(false);
      expect(result.current.data).toBeNull();
    });

    it('should handle delete confirmation workflow', () => {
      interface DeleteItem {
        id: string;
        name: string;
      }

      const { result } = renderHook(() => useModal<DeleteItem>());

      // User clicks delete button
      act(() => {
        result.current.openWith({ id: 'item-1', name: 'Item to delete' });
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.data?.name).toBe('Item to delete');

      // User confirms or cancels
      act(() => {
        result.current.close();
      });

      expect(result.current.isOpen).toBe(false);
      expect(result.current.data).toBeNull();
    });
  });
});
