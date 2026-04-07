import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotification } from './useNotification';

describe('useNotification', () => {
  describe('initial state', () => {
    it('should start with null notification', () => {
      const { result } = renderHook(() => useNotification());

      expect(result.current.notification).toBeNull();
    });

    it('should return all notification methods', () => {
      const { result } = renderHook(() => useNotification());

      expect(result.current.showSuccess).toBeDefined();
      expect(result.current.showError).toBeDefined();
      expect(result.current.showWarning).toBeDefined();
      expect(result.current.showInfo).toBeDefined();
      expect(result.current.dismiss).toBeDefined();
    });
  });

  describe('showSuccess', () => {
    it('should set notification with success type', () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.showSuccess('Operation completed');
      });

      expect(result.current.notification).toEqual({
        type: 'success',
        message: 'Operation completed',
      });
    });
  });

  describe('showError', () => {
    it('should set notification with error type', () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.showError('Something went wrong');
      });

      expect(result.current.notification).toEqual({
        type: 'error',
        message: 'Something went wrong',
      });
    });
  });

  describe('showWarning', () => {
    it('should set notification with warning type', () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.showWarning('Be careful');
      });

      expect(result.current.notification).toEqual({
        type: 'warning',
        message: 'Be careful',
      });
    });
  });

  describe('showInfo', () => {
    it('should set notification with info type', () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.showInfo('FYI');
      });

      expect(result.current.notification).toEqual({
        type: 'info',
        message: 'FYI',
      });
    });
  });

  describe('dismiss', () => {
    it('should clear the notification', () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.showSuccess('Test');
      });

      expect(result.current.notification).not.toBeNull();

      act(() => {
        result.current.dismiss();
      });

      expect(result.current.notification).toBeNull();
    });
  });

  describe('replacing notifications', () => {
    it('should replace previous notification when showing new one', () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.showSuccess('First');
      });

      expect(result.current.notification?.message).toBe('First');

      act(() => {
        result.current.showError('Second');
      });

      expect(result.current.notification).toEqual({
        type: 'error',
        message: 'Second',
      });
    });
  });

  describe('function stability', () => {
    it('should maintain stable function references across renders', () => {
      const { result, rerender } = renderHook(() => useNotification());

      const initialShowSuccess = result.current.showSuccess;
      const initialShowError = result.current.showError;
      const initialDismiss = result.current.dismiss;

      rerender();

      expect(result.current.showSuccess).toBe(initialShowSuccess);
      expect(result.current.showError).toBe(initialShowError);
      expect(result.current.dismiss).toBe(initialDismiss);
    });
  });
});
