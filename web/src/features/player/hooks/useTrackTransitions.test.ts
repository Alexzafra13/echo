import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTrackTransitions } from './useTrackTransitions';
import type { AudioElements } from './useAudioElements';
import type { CrossfadeLogic } from './useCrossfadeLogic';
import type { PlayTracking } from './usePlayTracking';
import type { QueueManagement } from './useQueueManagement';
import type { PlayerSharedRefs } from './playerSharedRefs';
import type { Track } from '../types';

vi.mock('@shared/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@shared/hooks', () => ({
  useLatestCallback: (cb: Function) => cb,
}));

const mockTrack: Track = {
  id: 'track-1',
  title: 'Test Track',
  artistId: 'artist-1',
  artist: 'Test Artist',
  album: 'Test Album',
  duration: 180,
  path: '/test.mp3',
} as Track;

const mockTrack2: Track = {
  id: 'track-2',
  title: 'Next Track',
  artistId: 'artist-1',
  artist: 'Test Artist',
  album: 'Test Album',
  duration: 200,
  path: '/test2.mp3',
} as Track;

function createMockAudioElements(overrides: Partial<AudioElements> = {}): AudioElements {
  const mockAudioA = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    currentTime: 0,
    duration: 180,
    paused: false,
    muted: false,
    volume: 0.7,
  } as unknown as HTMLAudioElement;

  const mockAudioB = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    currentTime: 0,
    duration: 180,
    paused: false,
    muted: true,
    volume: 0,
  } as unknown as HTMLAudioElement;

  return {
    audioRefA: { current: mockAudioA },
    audioRefB: { current: mockAudioB },
    activeAudioRef: { current: 'A' as const },
    volume: 0.7,
    volumeControlSupported: true,
    getActiveAudio: vi.fn().mockReturnValue(mockAudioA),
    getInactiveAudio: vi.fn().mockReturnValue(mockAudioB),
    getActiveAudioId: vi.fn().mockReturnValue('A' as const),
    getCurrentTime: vi.fn().mockReturnValue(0),
    getDuration: vi.fn().mockReturnValue(180),
    areBothPaused: vi.fn().mockReturnValue(false),
    switchActiveAudio: vi.fn().mockReturnValue('B' as const),
    resetToAudioA: vi.fn(),
    setVolume: vi.fn(),
    setAudioVolume: vi.fn(),
    loadOnActive: vi.fn(),
    loadOnInactive: vi.fn(),
    playActive: vi.fn().mockResolvedValue(undefined),
    playInactive: vi.fn().mockResolvedValue(undefined),
    pauseActive: vi.fn(),
    pauseBoth: vi.fn(),
    stopBoth: vi.fn().mockResolvedValue(undefined),
    stopActive: vi.fn().mockResolvedValue(undefined),
    stopInactive: vi.fn().mockResolvedValue(undefined),
    seek: vi.fn(),
    waitForAudioReady: vi.fn().mockResolvedValue(true),
    fadeOutAudio: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createMockCrossfade(overrides: Partial<CrossfadeLogic> = {}): CrossfadeLogic {
  return {
    isCrossfading: false,
    isCrossfadingRef: { current: false },
    performCrossfade: vi.fn().mockResolvedValue(true),
    prepareCrossfade: vi.fn(),
    clearCrossfade: vi.fn(),
    resetCrossfadeFlag: vi.fn(),
    checkCrossfadeTiming: vi.fn().mockReturnValue(false),
    isEnabled: false,
    ...overrides,
  };
}

function createMockQueue(overrides: Partial<QueueManagement> = {}): QueueManagement {
  return {
    queue: [mockTrack, mockTrack2],
    currentIndex: 0,
    isShuffle: false,
    repeatMode: 'off',
    hasNext: vi.fn().mockReturnValue(true),
    getNextIndex: vi.fn().mockReturnValue(1),
    getPreviousIndex: vi.fn().mockReturnValue(0),
    getTrackAt: vi.fn().mockReturnValue(mockTrack2),
    setCurrentIndex: vi.fn(),
    setQueue: vi.fn(),
    addToQueue: vi.fn(),
    removeFromQueue: vi.fn(),
    clearQueue: vi.fn(),
    toggleShuffle: vi.fn(),
    setShuffle: vi.fn(),
    toggleRepeat: vi.fn(),
    ...overrides,
  };
}

function createMockPlayTracking(): PlayTracking {
  return {
    startPlaySession: vi.fn(),
    endPlaySession: vi.fn(),
    hasActiveSession: vi.fn().mockReturnValue(false),
  };
}

function createSharedRefs(): PlayerSharedRefs {
  return {
    isTransitioningRef: { current: false },
    preloadedNextRef: { current: null },
    queueContextRef: { current: undefined },
  };
}

describe('useTrackTransitions', () => {
  let audioElements: AudioElements;
  let crossfade: CrossfadeLogic;
  let queue: QueueManagement;
  let playTracking: PlayTracking;
  let sharedRefs: PlayerSharedRefs;
  let handlePlayNext: ReturnType<typeof vi.fn>;
  let getStreamUrl: ReturnType<typeof vi.fn>;
  let setIsPlaying: ReturnType<typeof vi.fn>;
  let setCurrentTrack: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    audioElements = createMockAudioElements();
    crossfade = createMockCrossfade();
    queue = createMockQueue();
    playTracking = createMockPlayTracking();
    sharedRefs = createSharedRefs();
    handlePlayNext = vi.fn().mockResolvedValue(undefined);
    getStreamUrl = vi.fn().mockResolvedValue('http://example.com/stream');
    setIsPlaying = vi.fn();
    setCurrentTrack = vi.fn();
  });

  function renderTransitions(overrides = {}) {
    return renderHook(() =>
      useTrackTransitions({
        audioElements,
        crossfade,
        playTracking,
        queue,
        isPlaying: true,
        setIsPlaying,
        setCurrentTrack,
        currentTrack: mockTrack,
        userVolume: 0.7,
        autoplaySettings: { enabled: false },
        sharedRefs,
        radio: { isRadioMode: false },
        handlePlayNext,
        getStreamUrl,
        ...overrides,
      })
    );
  }

  describe('handleEnded', () => {
    it('should skip if crossfade is in progress', async () => {
      crossfade.isCrossfadingRef.current = true;
      const { result } = renderTransitions();

      await act(async () => {
        await result.current.handleEnded();
      });

      expect(playTracking.endPlaySession).not.toHaveBeenCalled();
      expect(handlePlayNext).not.toHaveBeenCalled();
    });

    it('should replay track when repeatMode is "one"', async () => {
      queue = createMockQueue({ repeatMode: 'one' });
      const { result } = renderTransitions();

      await act(async () => {
        await result.current.handleEnded();
      });

      expect(playTracking.endPlaySession).toHaveBeenCalledWith(false);
      expect(audioElements.playActive).toHaveBeenCalled();
      expect(handlePlayNext).not.toHaveBeenCalled();
    });

    it('should use preloaded track when available', async () => {
      audioElements = createMockAudioElements({ volumeControlSupported: true });
      queue = createMockQueue({
        hasNext: vi.fn().mockReturnValue(true),
        getNextIndex: vi.fn().mockReturnValue(1),
        getTrackAt: vi.fn().mockReturnValue(mockTrack2),
      });
      const { result } = renderTransitions();

      // Set preloaded AFTER initial render (useEffect clears it on mount)
      sharedRefs.preloadedNextRef.current = {
        trackId: 'track-2',
        nextIndex: 1,
        track: mockTrack2,
      };

      await act(async () => {
        await result.current.handleEnded();
      });

      expect(queue.setCurrentIndex).toHaveBeenCalledWith(1);
      expect(setCurrentTrack).toHaveBeenCalledWith(mockTrack2);
      expect(audioElements.switchActiveAudio).toHaveBeenCalled();
      expect(audioElements.playActive).toHaveBeenCalled();
      expect(audioElements.stopInactive).toHaveBeenCalled();
    });

    it('should fall back to handlePlayNext when no preloaded track', async () => {
      const { result } = renderTransitions();

      await act(async () => {
        await result.current.handleEnded();
      });

      expect(handlePlayNext).toHaveBeenCalledWith(false);
    });

    it('should try autoplay when queue is exhausted', async () => {
      queue = createMockQueue({
        hasNext: vi.fn().mockReturnValue(false),
      });
      const { result } = renderTransitions();

      await act(async () => {
        await result.current.handleEnded();
      });

      expect(handlePlayNext).toHaveBeenCalledWith(false);
    });

    it('should skip preloaded path on iOS (volumeControlSupported=false)', async () => {
      audioElements = createMockAudioElements({ volumeControlSupported: false });
      const { result } = renderTransitions();

      // Set preloaded AFTER initial render
      sharedRefs.preloadedNextRef.current = {
        trackId: 'track-2',
        nextIndex: 1,
        track: mockTrack2,
      };

      await act(async () => {
        await result.current.handleEnded();
      });

      // Should NOT use the preloaded path — falls back to handlePlayNext
      expect(audioElements.switchActiveAudio).not.toHaveBeenCalled();
      expect(handlePlayNext).toHaveBeenCalledWith(false);
    });

    it('should recover from errors by calling handlePlayNext', async () => {
      // Make switchActiveAudio throw to trigger the error/recovery path
      audioElements = createMockAudioElements({
        switchActiveAudio: vi.fn(() => {
          throw new Error('Switch failed');
        }),
      });

      const { result } = renderTransitions();

      // Set preloaded AFTER initial render
      sharedRefs.preloadedNextRef.current = {
        trackId: 'track-2',
        nextIndex: 1,
        track: mockTrack2,
      };

      await act(async () => {
        await result.current.handleEnded();
      });

      // Recovery path should be attempted
      expect(handlePlayNext).toHaveBeenCalledWith(false);
    });
  });

  describe('gapless preload', () => {
    it('should preload next track when 15s remain', async () => {
      const mockAudio = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        currentTime: 165, // 15s remaining of 180s track
        duration: 180,
        paused: false,
      } as unknown as HTMLAudioElement;

      audioElements = createMockAudioElements({
        getActiveAudio: vi.fn().mockReturnValue(mockAudio),
      });

      renderTransitions();

      // Find and call the timeupdate handler
      const audioA = audioElements.audioRefA.current!;
      const timeupdateCall = (audioA.addEventListener as ReturnType<typeof vi.fn>).mock.calls.find(
        (call: [string, Function]) => call[0] === 'timeupdate'
      );

      expect(timeupdateCall).toBeDefined();

      await act(async () => {
        timeupdateCall![1]();
        // Wait for the async getStreamUrl promise
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(getStreamUrl).toHaveBeenCalledWith(mockTrack2);
      expect(audioElements.loadOnInactive).toHaveBeenCalledWith('http://example.com/stream');
      expect(sharedRefs.preloadedNextRef.current).toEqual({
        trackId: 'track-2',
        nextIndex: 1,
        track: mockTrack2,
      });
    });

    it('should not preload in radio mode', () => {
      renderTransitions({ radio: { isRadioMode: true } });

      const audioA = audioElements.audioRefA.current!;
      const timeupdateCall = (audioA.addEventListener as ReturnType<typeof vi.fn>).mock.calls.find(
        (call: [string, Function]) => call[0] === 'timeupdate'
      );

      if (timeupdateCall) {
        timeupdateCall[1]();
      }

      expect(getStreamUrl).not.toHaveBeenCalled();
    });

    it('should not preload when repeat mode is "one"', () => {
      const mockAudio = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        currentTime: 170,
        duration: 180,
        paused: false,
      } as unknown as HTMLAudioElement;

      audioElements = createMockAudioElements({
        getActiveAudio: vi.fn().mockReturnValue(mockAudio),
      });
      queue = createMockQueue({ repeatMode: 'one' });

      renderTransitions();

      const audioA = audioElements.audioRefA.current!;
      const timeupdateCall = (audioA.addEventListener as ReturnType<typeof vi.fn>).mock.calls.find(
        (call: [string, Function]) => call[0] === 'timeupdate'
      );

      if (timeupdateCall) {
        timeupdateCall[1]();
      }

      expect(getStreamUrl).not.toHaveBeenCalled();
    });
  });
});
