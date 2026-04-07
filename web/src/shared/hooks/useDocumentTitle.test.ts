import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDocumentTitle } from './useDocumentTitle';

describe('useDocumentTitle', () => {
  const originalTitle = 'Original Title';

  beforeEach(() => {
    document.title = originalTitle;
  });

  it('should set document title with Echo suffix', () => {
    renderHook(() => useDocumentTitle('My Page'));

    expect(document.title).toBe('My Page · Echo');
  });

  it('should restore previous title on unmount', () => {
    const { unmount } = renderHook(() => useDocumentTitle('Temp Page'));

    expect(document.title).toBe('Temp Page · Echo');

    unmount();

    expect(document.title).toBe(originalTitle);
  });

  it('should not change title when undefined', () => {
    renderHook(() => useDocumentTitle(undefined));

    expect(document.title).toBe(originalTitle);
  });

  it('should update title when value changes', () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: 'Page A' },
    });

    expect(document.title).toBe('Page A · Echo');

    rerender({ title: 'Page B' });

    expect(document.title).toBe('Page B · Echo');
  });
});
