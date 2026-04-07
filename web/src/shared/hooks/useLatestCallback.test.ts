import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLatestCallback } from './useLatestCallback';

describe('useLatestCallback', () => {
  it('should return a stable function reference', () => {
    const { result, rerender } = renderHook(({ cb }) => useLatestCallback(cb), {
      initialProps: { cb: () => 'first' },
    });

    const firstRef = result.current;

    rerender({ cb: () => 'second' });

    // Reference should be the same
    expect(result.current).toBe(firstRef);
  });

  it('should call the latest version of the callback', () => {
    const cb1 = vi.fn(() => 'first');
    const cb2 = vi.fn(() => 'second');

    const { result, rerender } = renderHook(({ cb }) => useLatestCallback(cb), {
      initialProps: { cb: cb1 },
    });

    // Call with first callback
    result.current();
    expect(cb1).toHaveBeenCalled();

    // Update callback
    rerender({ cb: cb2 });

    // Calling the same reference should now call cb2
    result.current();
    expect(cb2).toHaveBeenCalled();
  });

  it('should pass arguments through', () => {
    const cb = vi.fn((a: number, b: string) => `${a}-${b}`);

    const { result } = renderHook(() => useLatestCallback(cb));

    (result.current as (a: number, b: string) => string)(42, 'hello');

    expect(cb).toHaveBeenCalledWith(42, 'hello');
  });
});
