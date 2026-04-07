import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useColorExtraction, DEFAULT_COLOR } from './useColorExtraction';

vi.mock('@shared/utils/colorExtractor', () => ({
  extractDominantColor: vi.fn(),
}));

import { extractDominantColor } from '@shared/utils/colorExtractor';

describe('useColorExtraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return fallback colors initially', () => {
    vi.mocked(extractDominantColor).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useColorExtraction(['/img.png']));

    expect(result.current).toEqual([DEFAULT_COLOR]);
  });

  it('should extract colors from valid URLs', async () => {
    vi.mocked(extractDominantColor).mockResolvedValue('255, 0, 0');

    const { result } = renderHook(() => useColorExtraction(['/img.png']));

    await waitFor(() => {
      expect(result.current).toEqual(['255, 0, 0']);
    });

    expect(extractDominantColor).toHaveBeenCalledWith('/img.png');
  });

  it('should handle multiple URLs', async () => {
    vi.mocked(extractDominantColor).mockImplementation((url: string) => {
      if (url === '/a.png') return Promise.resolve('255, 0, 0');
      if (url === '/b.png') return Promise.resolve('0, 255, 0');
      return Promise.resolve(DEFAULT_COLOR);
    });

    const { result } = renderHook(() => useColorExtraction(['/a.png', '/b.png']));

    await waitFor(() => {
      expect(result.current).toEqual(['255, 0, 0', '0, 255, 0']);
    });
  });

  it('should return fallback for null/undefined URLs', async () => {
    const { result } = renderHook(() => useColorExtraction([null, undefined]));

    // When all URLs are invalid, returns [fallback]
    await waitFor(() => {
      expect(result.current).toEqual([DEFAULT_COLOR]);
    });
  });

  it('should use custom fallback', async () => {
    vi.mocked(extractDominantColor).mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useColorExtraction(['/bad.png'], '0, 0, 0'));

    await waitFor(() => {
      expect(result.current).toEqual(['0, 0, 0']);
    });
  });

  it('should fallback on extraction error', async () => {
    vi.mocked(extractDominantColor).mockRejectedValue(new Error('canvas fail'));

    const { result } = renderHook(() => useColorExtraction(['/img.png']));

    await waitFor(() => {
      expect(result.current).toEqual([DEFAULT_COLOR]);
    });
  });
});
