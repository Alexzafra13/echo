import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTrackDjAnalysis } from './useTrackDjAnalysis';

vi.mock('@shared/services/api', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

import { apiClient } from '@shared/services/api';

const mockAnalysis = {
  bpm: 120,
  key: 'Am',
  energy: 0.8,
  danceability: 0.7,
};

describe('useTrackDjAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when trackId is null', () => {
    const { result } = renderHook(() => useTrackDjAnalysis(null));

    expect(result.current.djAnalysis).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should fetch DJ analysis for a track', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockAnalysis });

    const { result } = renderHook(() => useTrackDjAnalysis('track-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(apiClient.get).toHaveBeenCalledWith('/tracks/track-1/dj');
    expect(result.current.djAnalysis).toEqual(mockAnalysis);
    expect(result.current.error).toBeNull();
  });

  it('should handle API errors', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useTrackDjAnalysis('track-bad'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Error');
    expect(result.current.djAnalysis).toBeNull();
  });

  it('should reset when trackId changes to null', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockAnalysis });

    const { result, rerender } = renderHook(({ id }) => useTrackDjAnalysis(id), {
      initialProps: { id: 'track-1' as string | null },
    });

    await waitFor(() => expect(result.current.djAnalysis).toBeTruthy());

    rerender({ id: null });

    expect(result.current.djAnalysis).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
