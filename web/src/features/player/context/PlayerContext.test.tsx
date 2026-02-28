import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { PlayerProvider, usePlayer } from './PlayerContext';

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
    setAudioVolume: vi.fn(),
    volumeControlSupported: true,
    initWebAudio: vi.fn(),
    resumeAudioContext: vi.fn(),
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
      crossfade: { enabled: false, duration: 5, smartMode: false },
      normalization: { enabled: false, targetLufs: -16, preventClipping: true },
      autoplay: { enabled: false },
      setCrossfadeEnabled: vi.fn(),
      setCrossfadeDuration: vi.fn(),
      setCrossfadeSmartMode: vi.fn(),
      setNormalizationEnabled: vi.fn(),
      setNormalizationTargetLufs: vi.fn(),
      setNormalizationPreventClipping: vi.fn(),
      setAutoplayEnabled: vi.fn(),
    };
    return selector(state);
  },
}));

vi.mock('../hooks/useAudioNormalization', () => ({
  useAudioNormalization: () => ({
    registerAudioElements: vi.fn(),
    setUserVolume: vi.fn(),
    applyGain: vi.fn(),
    applyGainToAudio: vi.fn(),
    getEffectiveVolume: vi.fn().mockReturnValue(0.7),
    swapGains: vi.fn(),
  }),
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

vi.mock('@features/radio/hooks/useRadioMetadata', () => ({
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

// Test component that uses the hook
function TestConsumer({ onMount }: { onMount?: (player: ReturnType<typeof usePlayer>) => void }) {
  const player = usePlayer();

  if (onMount) {
    onMount(player);
  }

  return (
    <div>
      <span data-testid="is-playing">{player.isPlaying ? 'playing' : 'paused'}</span>
      <span data-testid="volume">{player.volume}</span>
      <span data-testid="current-time">{player.currentTime}</span>
      <span data-testid="is-shuffle">{player.isShuffle ? 'shuffle-on' : 'shuffle-off'}</span>
      <span data-testid="repeat-mode">{player.repeatMode}</span>
      <span data-testid="is-radio-mode">{player.isRadioMode ? 'radio' : 'tracks'}</span>
      <span data-testid="queue-length">{player.queue.length}</span>
      <button onClick={() => player.play()}>Play</button>
      <button onClick={() => player.pause()}>Pause</button>
      <button onClick={() => player.togglePlayPause()}>Toggle</button>
      <button onClick={() => player.stop()}>Stop</button>
      <button onClick={() => player.playNext()}>Next</button>
      <button onClick={() => player.playPrevious()}>Previous</button>
      <button onClick={() => player.setVolume(0.5)}>Set Volume</button>
      <button onClick={() => player.seek(30)}>Seek</button>
      <button onClick={() => player.toggleShuffle()}>Toggle Shuffle</button>
      <button onClick={() => player.toggleRepeat()}>Toggle Repeat</button>
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

  describe('usePlayer hook', () => {
    it('should throw error when used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow('usePlayer must be used within a PlayerProvider');

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
    it('should provide all expected properties', () => {
      let playerContext: ReturnType<typeof usePlayer> | null = null;

      render(
        <PlayerProvider>
          <TestConsumer
            onMount={(player) => {
              playerContext = player;
            }}
          />
        </PlayerProvider>
      );

      expect(playerContext).not.toBeNull();

      // State properties
      expect(playerContext).toHaveProperty('currentTrack');
      expect(playerContext).toHaveProperty('queue');
      expect(playerContext).toHaveProperty('currentIndex');
      expect(playerContext).toHaveProperty('isPlaying');
      expect(playerContext).toHaveProperty('volume');
      expect(playerContext).toHaveProperty('currentTime');
      expect(playerContext).toHaveProperty('duration');
      expect(playerContext).toHaveProperty('isShuffle');
      expect(playerContext).toHaveProperty('repeatMode');

      // Crossfade
      expect(playerContext).toHaveProperty('crossfade');
      expect(playerContext).toHaveProperty('isCrossfading');

      // Normalization
      expect(playerContext).toHaveProperty('normalization');

      // Radio
      expect(playerContext).toHaveProperty('currentRadioStation');
      expect(playerContext).toHaveProperty('isRadioMode');
      expect(playerContext).toHaveProperty('radioMetadata');
      expect(playerContext).toHaveProperty('radioSignalStatus');

      // Autoplay
      expect(playerContext).toHaveProperty('autoplay');
      expect(playerContext).toHaveProperty('isAutoplayActive');
      expect(playerContext).toHaveProperty('autoplaySourceArtist');

      // Playback controls
      expect(playerContext).toHaveProperty('play');
      expect(playerContext).toHaveProperty('pause');
      expect(playerContext).toHaveProperty('togglePlayPause');
      expect(playerContext).toHaveProperty('stop');
      expect(playerContext).toHaveProperty('playNext');
      expect(playerContext).toHaveProperty('playPrevious');

      // Queue controls
      expect(playerContext).toHaveProperty('addToQueue');
      expect(playerContext).toHaveProperty('removeFromQueue');
      expect(playerContext).toHaveProperty('clearQueue');
      expect(playerContext).toHaveProperty('playQueue');

      // Radio controls
      expect(playerContext).toHaveProperty('playRadio');
      expect(playerContext).toHaveProperty('stopRadio');

      // Player controls
      expect(playerContext).toHaveProperty('seek');
      expect(playerContext).toHaveProperty('setVolume');
      expect(playerContext).toHaveProperty('toggleShuffle');
      expect(playerContext).toHaveProperty('setShuffle');
      expect(playerContext).toHaveProperty('toggleRepeat');

      // Settings controls
      expect(playerContext).toHaveProperty('setCrossfadeEnabled');
      expect(playerContext).toHaveProperty('setCrossfadeDuration');
      expect(playerContext).toHaveProperty('setCrossfadeSmartMode');
      expect(playerContext).toHaveProperty('setAutoplayEnabled');
    });

    it('should have functions as expected types', () => {
      let playerContext: ReturnType<typeof usePlayer> | null = null;

      render(
        <PlayerProvider>
          <TestConsumer
            onMount={(player) => {
              playerContext = player;
            }}
          />
        </PlayerProvider>
      );

      expect(typeof playerContext!.play).toBe('function');
      expect(typeof playerContext!.pause).toBe('function');
      expect(typeof playerContext!.stop).toBe('function');
      expect(typeof playerContext!.seek).toBe('function');
      expect(typeof playerContext!.setVolume).toBe('function');
      expect(typeof playerContext!.playQueue).toBe('function');
      expect(typeof playerContext!.playRadio).toBe('function');
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
