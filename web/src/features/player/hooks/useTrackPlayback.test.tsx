import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';

// Mock logger
vi.mock('@shared/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock auth store
vi.mock('@shared/store', () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ isAuthenticated: true }),
}));

// Mock apiClient
const mockGet = vi.fn();
vi.mock('@shared/services/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

// Mock playActiveWithRetry
const mockPlayActiveWithRetry = vi.fn().mockResolvedValue(undefined);
vi.mock('./playActiveWithRetry', () => ({
  playActiveWithRetry: (...args: unknown[]) => mockPlayActiveWithRetry(...args),
}));

import { useTrackPlayback, type UseTrackPlaybackParams } from './useTrackPlayback';
import type { Track } from '../types';
import type { AudioElements } from './useAudioElements';
import type { CrossfadeLogic } from './useCrossfadeLogic';
import type { PlayTracking } from './usePlayTracking';
import type { RadioPlayback } from './useRadioPlayback';
import type { PlayerSharedRefs } from './playerSharedRefs';

const createTrack = (overrides: Partial<Track> = {}): Track =>
  ({
    id: 'track-1',
    title: 'Test Track',
    artist: 'Test Artist',
    duration: 180,
    path: '/music/test.mp3',
    ...overrides,
  }) as Track;

function createMockParams(overrides: Partial<UseTrackPlaybackParams> = {}): UseTrackPlaybackParams {
  const audioElements: Partial<AudioElements> = {
    loadOnActive: vi.fn(),
    stopInactive: vi.fn(),
    getActiveAudio: vi.fn().mockReturnValue({ paused: false }),
    playActive: vi.fn().mockResolvedValue(undefined),
    ...(overrides.audioElements ?? {}),
  };

  const crossfade: Partial<CrossfadeLogic> = {
    prepareCrossfade: vi.fn(),
    performCrossfade: vi.fn().mockResolvedValue(true),
    clearCrossfade: vi.fn(),
    isCrossfadingRef: { current: false },
    ...(overrides.crossfade ?? {}),
  };

  const playTracking: Partial<PlayTracking> = {
    startPlaySession: vi.fn(),
    ...(overrides.playTracking ?? {}),
  };

  const radio: Partial<RadioPlayback> = {
    isRadioMode: false,
    ...(overrides.radio ?? {}),
  };

  const sharedRefs: PlayerSharedRefs = {
    isTransitioningRef: { current: false },
    preloadedNextRef: { current: null },
    queueContextRef: { current: undefined },
    ...(overrides.sharedRefs ?? {}),
  };

  return {
    audioElements: audioElements as AudioElements,
    crossfade: crossfade as CrossfadeLogic,
    crossfadeSettings: { enabled: false, duration: 2, smartMode: false, tempoMatch: false },
    playTracking: playTracking as PlayTracking,
    radio: radio as RadioPlayback,
    isPlaying: false,
    setIsPlaying: vi.fn(),
    setCurrentTrack: vi.fn(),
    sharedRefs,
    ...overrides,
  };
}

describe('useTrackPlayback', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return Wrapper;
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
    mockGet.mockReset();
    mockPlayActiveWithRetry.mockReset();
    mockGet.mockResolvedValue({
      data: { token: 'test-stream-token', expiresAt: '2026-04-02T00:00:00Z' },
    });
    mockPlayActiveWithRetry.mockResolvedValue(undefined);
  });

  describe('getStreamUrl', () => {
    it('should build standard URL with token', async () => {
      const params = createMockParams();
      const { result } = renderHook(() => useTrackPlayback(params), {
        wrapper: createWrapper(),
      });

      // Wait for stream token to load
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      let url: string | null = null;
      await act(async () => {
        url = await result.current.getStreamUrl(createTrack({ id: 'track-abc' }));
      });

      expect(url).toContain('/tracks/track-abc/stream');
      expect(url).toContain('token=test-stream-token');
    });

    it('should use custom streamUrl when track has one', async () => {
      const params = createMockParams();
      const { result } = renderHook(() => useTrackPlayback(params), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      const track = createTrack({
        streamUrl: 'https://federation.example.com/tracks/remote-1/stream',
      } as Partial<Track>);

      let url: string | null = null;
      await act(async () => {
        url = await result.current.getStreamUrl(track);
      });

      expect(url).toBe(
        'https://federation.example.com/tracks/remote-1/stream?token=test-stream-token'
      );
    });

    it('should append token with & when streamUrl already has query params', async () => {
      const params = createMockParams();
      const { result } = renderHook(() => useTrackPlayback(params), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      const track = createTrack({
        streamUrl: 'https://example.com/stream?format=mp3',
      } as Partial<Track>);

      let url: string | null = null;
      await act(async () => {
        url = await result.current.getStreamUrl(track);
      });

      expect(url).toBe('https://example.com/stream?format=mp3&token=test-stream-token');
    });

    // Note: "return null when no token" is covered by useStreamToken.test.tsx
    // Testing it here causes async pollution between tests due to React Query background refetches
  });

  describe('playTrack', () => {
    it('should play track normally when crossfade is disabled', async () => {
      const params = createMockParams({
        crossfadeSettings: { enabled: false, duration: 2, smartMode: false, tempoMatch: false },
      });
      const { result } = renderHook(() => useTrackPlayback(params), {
        wrapper: createWrapper(),
      });

      // Wait for stream token to resolve
      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      await act(async () => {
        await result.current.playTrack(createTrack());
      });

      expect(params.audioElements.loadOnActive).toHaveBeenCalled();
      expect(params.crossfade.clearCrossfade).toHaveBeenCalled();
      expect(params.setCurrentTrack).toHaveBeenCalled();
    });

    it('should not crossfade when in radio mode', async () => {
      const params = createMockParams({
        crossfadeSettings: { enabled: true, duration: 2, smartMode: false, tempoMatch: false },
        isPlaying: true,
        radio: { isRadioMode: true } as RadioPlayback,
      });
      const { result } = renderHook(() => useTrackPlayback(params), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      await act(async () => {
        await result.current.playTrack(createTrack(), true);
      });

      // Should use normal playback, not crossfade
      expect(params.crossfade.clearCrossfade).toHaveBeenCalled();
      expect(params.crossfade.performCrossfade).not.toHaveBeenCalled();
    });

    it('should start play tracking session after loading track', async () => {
      const params = createMockParams();
      const { result } = renderHook(() => useTrackPlayback(params), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      const track = createTrack();
      await act(async () => {
        await result.current.playTrack(track);
      });

      expect(params.playTracking.startPlaySession).toHaveBeenCalledWith(
        track,
        undefined // queueContextRef.current
      );
    });
  });
});
