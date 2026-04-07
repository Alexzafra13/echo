import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDominantColors } from './useDominantColors';

vi.mock('@shared/utils/colorExtractor', () => ({
  extractDominantColor: vi.fn(),
}));

import { extractDominantColor } from '@shared/utils/colorExtractor';

describe('useDominantColors', () => {
  it('should extract colors from multiple image URLs', async () => {
    vi.mocked(extractDominantColor).mockImplementation((url: string) => {
      if (url === '/a.png') return Promise.resolve('255, 0, 0');
      if (url === '/b.png') return Promise.resolve('0, 255, 0');
      return Promise.resolve('10, 14, 39');
    });

    const { result } = renderHook(() => useDominantColors(['/a.png', '/b.png']));

    await waitFor(() => {
      expect(result.current).toEqual(['255, 0, 0', '0, 255, 0']);
    });
  });

  it('should return default color for null URLs', async () => {
    const { result } = renderHook(() => useDominantColors([null, undefined]));

    await waitFor(() => {
      expect(result.current).toEqual(['10, 14, 39']);
    });
  });

  it('should accept custom fallback', async () => {
    vi.mocked(extractDominantColor).mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useDominantColors(['/bad.png'], '0, 0, 0'));

    await waitFor(() => {
      expect(result.current).toEqual(['0, 0, 0']);
    });
  });
});
