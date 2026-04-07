import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { PlayerProvider } from './PlayerContext';
import { usePlayback } from './PlaybackContext';
import { useQueue } from './QueueContext';
import { useRadio } from './RadioContext';

// Mock all specialized hooks
const mockPlayActive = vi.fn().mockResolvedValue(undefined);
const mockPauseActive = vi.fn();
const mockStopBoth = vi.fn();
const mockSeek = vi.fn();
const mockLoadOnActive = vi.fn();
const mockStopInactive = vi.fn();
const mockGetActiveAudioId = vi.fn().mockReturnValue('A');
const mockGetActiveAudio = vi.fn();
const mockGetCurrentTime = vi.fn().mockReturnValue(0);

vi.mock('../hooks/useAudioElements', () => ({
  useAudioElements: () => ({
    audioRefA: { current: document.createElement('audio') },
    audioRefB: { current: document.createElement('audio') },
    playActive: mockPlayActive,
    pauseActive: mockPauseActive,
    stopBoth: mockStopBoth,
    stopInactive: mockStopInactive,
    seek: mockSeek,
    loadOnActive: mockLoadOnActive,
    getActiveAudioId: mockGetActiveAudioId,
    getActiveAudio: mockGetActiveAudio,
    getInactiveAudio: vi.fn(),
    getCurrentTime: mockGetCurrentTime,
    volume: 0.7,
    setVolume: vi.fn(),
    setAudioVolume: vi.fn(),
    volumeControlSupported: true,
  }),
}));

const mockSetQueue = vi.fn();
const mockAddToQueue = vi.fn();
const mockRemoveFromQueue = vi.fn();
const mockClearQueue = vi.fn();
const mockToggleShuffle = vi.fn();
const mockSetShuffle = vi.fn();
const mockToggleRepeat = vi.fn();
const mockSetCurrentIndex = vi.fn();
const mockGetNextIndex = vi.fn().mockReturnValue(1);
const mockGetPreviousIndex = vi.fn().mockReturnValue(0);
const mockGetTrackAt = vi.fn();
const mockHasNext = vi.fn().mockReturnValue(true);

const mockQueueState = {
  queue: [] as Array<{ id: string; title: string }>,
  currentIndex: 0,
  isShuffle: false,
  repeatMode: 'none' as 'none' | 'one' | 'all',
};

vi.mock('../hooks/useQueueManagement', () => ({
  useQueueManagement: () => ({
    queue: mockQueueState.queue,
    currentIndex: mockQueueState.currentIndex,
    isShuffle: mockQueueState.isShuffle,
    repeatMode: mockQueueState.repeatMode,
    setQueue: mockSetQueue,
    addToQueue: mockAddToQueue,
    removeFromQueue: mockRemoveFromQueue,
    clearQueue: mockClearQueue,
    toggleShuffle: mockToggleShuffle,
    setShuffle: mockSetShuffle,
    toggleRepeat: mockToggleRepeat,
    setCurrentIndex: mockSetCurrentIndex,
    getNextIndex: mockGetNextIndex,
    getPreviousIndex: mockGetPreviousIndex,
    getTrackAt: mockGetTrackAt,
    hasNext: mockHasNext,
  }),
}));

vi.mock('../hooks/useStreamToken', () => ({
  useStreamToken: () => ({
    data: { token: 'test-token' },
    ensureToken: vi.fn().mockResolvedValue('test-token'),
  }),
}));

vi.mock('../store', () => ({
  usePlayerSettingsStore: (selector: (state: unknown) => unknown) => {
    const state = {
      crossfade: { enabled: false, duration: 2, smartMode: false },
      autoplay: { enabled: false },
      setCrossfadeEnabled: vi.fn(),
      setAutoplayEnabled: vi.fn(),
    };
    return selector(state);
  },
}));

vi.mock('../store/timeStore', () => ({
  setCurrentTime: vi.fn(),
  setDuration: vi.fn(),
  resetTime: vi.fn(),
  getCurrentTime: vi.fn().mockReturnValue(0),
  getDuration: vi.fn().mockReturnValue(0),
  useCurrentTime: () => ({ currentTime: 0, duration: 0 }),
}));

vi.mock('../hooks/usePlayTracking', () => ({
  usePlayTracking: () => ({
    startPlaySession: vi.fn(),
    endPlaySession: vi.fn(),
    hasActiveSession: vi.fn().mockReturnValue(false),
  }),
}));

vi.mock('../hooks/useCrossfadeLogic', () => ({
  useCrossfadeLogic: () => ({
    isCrossfading: false,
    isCrossfadingRef: { current: false },
    prepareCrossfade: vi.fn(),
    performCrossfade: vi.fn(),
    clearCrossfade: vi.fn(),
    resetCrossfadeFlag: vi.fn(),
  }),
}));

const mockPlayRadio = vi.fn();
const mockStopRadio = vi.fn();
const mockResumeRadio = vi.fn();
const mockSetMetadata = vi.fn();
const mockSetSignalStatus = vi.fn();

vi.mock('../hooks/useRadioPlayback', () => ({
  useRadioPlayback: () => ({
    isRadioMode: false,
    currentStation: null,
    metadata: null,
    signalStatus: 'good',
    playRadio: mockPlayRadio,
    stopRadio: mockStopRadio,
    resumeRadio: mockResumeRadio,
    setMetadata: mockSetMetadata,
    setSignalStatus: mockSetSignalStatus,
  }),
}));

vi.mock('../hooks/useAutoplay', () => ({
  useAutoplay: () => ({
    loadSimilarArtistTracks: vi.fn().mockResolvedValue({ tracks: [], sourceArtistName: null }),
    prefetchSimilarArtistTracks: vi.fn(),
    getPrefetchThreshold: vi.fn().mockReturnValue(2),
    resetSession: vi.fn(),
  }),
}));

vi.mock('@features/radio', () => ({
  useRadioMetadata: () => ({ metadata: null }),
}));

vi.mock('../hooks/useMediaSession', () => ({
  useMediaSession: vi.fn(),
}));

vi.mock('../hooks/useSocialSync', () => ({
  useSocialSync: vi.fn(),
}));

vi.mock('@shared/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Test component that uses the granular hooks
function TestConsumer({ onMount }: { onMount?: (player: Record<string, unknown>) => void }) {
  const playback = usePlayback();
  const queue = useQueue();
  const radio = useRadio();

  const combined = { ...playback, ...queue, ...radio };

  if (onMount) {
    onMount(combined);
  }

  return (
    <div>
      <span data-testid="is-playing">{playback.isPlaying ? 'playing' : 'paused'}</span>
      <span data-testid="volume">{playback.volume}</span>
      <span data-testid="current-time">{playback.currentTime}</span>
      <span data-testid="is-shuffle">{queue.isShuffle ? 'shuffle-on' : 'shuffle-off'}</span>
      <span data-testid="repeat-mode">{queue.repeatMode}</span>
      <span data-testid="is-radio-mode">{radio.isRadioMode ? 'radio' : 'tracks'}</span>
      <span data-testid="queue-length">{queue.queue.length}</span>
      <button onClick={() => playback.play()}>Play</button>
      <button onClick={() => playback.pause()}>Pause</button>
      <button onClick={() => playback.togglePlayPause()}>Toggle</button>
      <button onClick={() => playback.stop()}>Stop</button>
      <button onClick={() => playback.playNext()}>Next</button>
      <button onClick={() => playback.playPrevious()}>Previous</button>
      <button onClick={() => playback.setVolume(0.5)}>Set Volume</button>
      <button onClick={() => playback.seek(30)}>Seek</button>
      <button onClick={() => queue.toggleShuffle()}>Toggle Shuffle</button>
      <button onClick={() => queue.toggleRepeat()}>Toggle Repeat</button>
    </div>
  );
}

describe('PlayerContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueueState.queue = [];
    mockQueueState.currentIndex = 0;
    mockQueueState.isShuffle = false;
    mockQueueState.repeatMode = 'none';
  });

  describe('Provider', () => {
    it('should render children', () => {
      render(
        <PlayerProvider>
          <div data-testid="child">Child</div>
        </PlayerProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should provide context values', () => {
      render(
        <PlayerProvider>
          <TestConsumer />
        </PlayerProvider>
      );

      expect(screen.getByTestId('is-playing')).toHaveTextContent('paused');
      expect(screen.getByTestId('volume')).toHaveTextContent('0.7');
      expect(screen.getByTestId('is-radio-mode')).toHaveTextContent('tracks');
    });
  });

  describe('granular hooks', () => {
    it('should throw error when usePlayback is used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow();

      consoleError.mockRestore();
    });
  });

  describe('Initial State', () => {
    it('should have correct initial values', () => {
      render(
        <PlayerProvider>
          <TestConsumer />
        </PlayerProvider>
      );

      expect(screen.getByTestId('is-playing')).toHaveTextContent('paused');
      expect(screen.getByTestId('volume')).toHaveTextContent('0.7');
      expect(screen.getByTestId('current-time')).toHaveTextContent('0');
      expect(screen.getByTestId('is-shuffle')).toHaveTextContent('shuffle-off');
      expect(screen.getByTestId('repeat-mode')).toHaveTextContent('none');
      expect(screen.getByTestId('queue-length')).toHaveTextContent('0');
    });
  });

  describe('Playback Controls', () => {
    it('should call pause when pause is clicked', async () => {
      render(
        <PlayerProvider>
          <TestConsumer />
        </PlayerProvider>
      );

      await act(async () => {
        screen.getByRole('button', { name: 'Pause' }).click();
      });

      expect(mockPauseActive).toHaveBeenCalled();
    });

    it('should call stop when stop is clicked', async () => {
      render(
        <PlayerProvider>
          <TestConsumer />
        </PlayerProvider>
      );

      await act(async () => {
        screen.getByRole('button', { name: 'Stop' }).click();
      });

      expect(mockStopBoth).toHaveBeenCalled();
    });

    it('should call seek when seek is clicked', async () => {
      render(
        <PlayerProvider>
          <TestConsumer />
        </PlayerProvider>
      );

      await act(async () => {
        screen.getByRole('button', { name: 'Seek' }).click();
      });

      expect(mockSeek).toHaveBeenCalledWith(30);
    });
  });

  describe('Queue Controls', () => {
    it('should call toggleShuffle', async () => {
      render(
        <PlayerProvider>
          <TestConsumer />
        </PlayerProvider>
      );

      await act(async () => {
        screen.getByRole('button', { name: 'Toggle Shuffle' }).click();
      });

      expect(mockToggleShuffle).toHaveBeenCalled();
    });

    it('should call toggleRepeat', async () => {
      render(
        <PlayerProvider>
          <TestConsumer />
        </PlayerProvider>
      );

      await act(async () => {
        screen.getByRole('button', { name: 'Toggle Repeat' }).click();
      });

      expect(mockToggleRepeat).toHaveBeenCalled();
    });
  });

  describe('Context Value Structure', () => {
    it('should provide all expected properties via granular hooks', () => {
      let contextValues: Record<string, unknown> | null = null;

      render(
        <PlayerProvider>
          <TestConsumer
            onMount={(player) => {
              contextValues = player;
            }}
          />
        </PlayerProvider>
      );

      expect(contextValues).not.toBeNull();

      // Playback properties (from usePlayback)
      expect(contextValues).toHaveProperty('currentTrack');
      expect(contextValues).toHaveProperty('isPlaying');
      expect(contextValues).toHaveProperty('volume');
      expect(contextValues).toHaveProperty('currentTime');
      expect(contextValues).toHaveProperty('crossfade');
      expect(contextValues).toHaveProperty('isCrossfading');
      expect(contextValues).toHaveProperty('play');
      expect(contextValues).toHaveProperty('pause');
      expect(contextValues).toHaveProperty('togglePlayPause');
      expect(contextValues).toHaveProperty('stop');
      expect(contextValues).toHaveProperty('playNext');
      expect(contextValues).toHaveProperty('playPrevious');
      expect(contextValues).toHaveProperty('seek');
      expect(contextValues).toHaveProperty('setVolume');
      expect(contextValues).toHaveProperty('setCrossfadeEnabled');

      // Queue properties (from useQueue)
      expect(contextValues).toHaveProperty('queue');
      expect(contextValues).toHaveProperty('currentIndex');
      expect(contextValues).toHaveProperty('isShuffle');
      expect(contextValues).toHaveProperty('repeatMode');
      expect(contextValues).toHaveProperty('addToQueue');
      expect(contextValues).toHaveProperty('removeFromQueue');
      expect(contextValues).toHaveProperty('clearQueue');
      expect(contextValues).toHaveProperty('playQueue');
      expect(contextValues).toHaveProperty('toggleShuffle');
      expect(contextValues).toHaveProperty('setShuffle');
      expect(contextValues).toHaveProperty('toggleRepeat');

      // Radio properties (from useRadio)
      expect(contextValues).toHaveProperty('currentRadioStation');
      expect(contextValues).toHaveProperty('isRadioMode');
      expect(contextValues).toHaveProperty('radioMetadata');
      expect(contextValues).toHaveProperty('radioSignalStatus');
      expect(contextValues).toHaveProperty('playRadio');
      expect(contextValues).toHaveProperty('stopRadio');
    });

    it('should have functions as expected types', () => {
      let contextValues: Record<string, unknown> | null = null;

      render(
        <PlayerProvider>
          <TestConsumer
            onMount={(player) => {
              contextValues = player;
            }}
          />
        </PlayerProvider>
      );

      expect(typeof contextValues!.play).toBe('function');
      expect(typeof contextValues!.pause).toBe('function');
      expect(typeof contextValues!.stop).toBe('function');
      expect(typeof contextValues!.seek).toBe('function');
      expect(typeof contextValues!.setVolume).toBe('function');
      expect(typeof contextValues!.playQueue).toBe('function');
      expect(typeof contextValues!.playRadio).toBe('function');
    });
  });

  describe('Navigation Controls', () => {
    it('should handle playNext with queue', async () => {
      mockQueueState.queue = [
        { id: '1', title: 'Track 1' },
        { id: '2', title: 'Track 2' },
      ];
      mockGetTrackAt.mockReturnValue({ id: '2', title: 'Track 2' });

      render(
        <PlayerProvider>
          <TestConsumer />
        </PlayerProvider>
      );

      await act(async () => {
        screen.getByRole('button', { name: 'Next' }).click();
      });

      await waitFor(() => {
        expect(mockSetCurrentIndex).toHaveBeenCalled();
      });
    });

    it('should restart track if played more than 3 seconds on previous', async () => {
      mockGetCurrentTime.mockReturnValue(5);
      mockQueueState.queue = [{ id: '1', title: 'Track 1' }];

      render(
        <PlayerProvider>
          <TestConsumer />
        </PlayerProvider>
      );

      await act(async () => {
        screen.getByRole('button', { name: 'Previous' }).click();
      });

      expect(mockSeek).toHaveBeenCalledWith(0);
    });
  });
});
