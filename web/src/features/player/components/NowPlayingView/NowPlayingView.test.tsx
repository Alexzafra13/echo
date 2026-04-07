import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NowPlayingView } from './NowPlayingView';

// Mock window.scrollTo
window.scrollTo = vi.fn();

// Mock createPortal to render inline for testing
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/now-playing', mockSetLocation],
}));

// Mock player hooks
const mockTogglePlayPause = vi.fn();
const mockPlayNext = vi.fn();
const mockPlayPrevious = vi.fn();
const mockSeek = vi.fn();
const mockSetVolume = vi.fn();
const mockToggleShuffle = vi.fn();
const mockToggleRepeat = vi.fn();

const mockPlayback = vi.fn();
const mockQueue = vi.fn();
const mockRadio = vi.fn();

vi.mock('../../context/PlaybackContext', () => ({
  usePlayback: (...args: unknown[]) => mockPlayback(...args),
}));

vi.mock('../../context/QueueContext', () => ({
  useQueue: (...args: unknown[]) => mockQueue(...args),
}));

vi.mock('../../context/RadioContext', () => ({
  useRadio: (...args: unknown[]) => mockRadio(...args),
}));

// Mock timeStore para inyectar currentTime/duration en tests
const mockTimeState = { currentTime: 60, duration: 240 };
vi.mock('../../store/timeStore', () => ({
  useCurrentTime: () => mockTimeState,
}));

// Mock QueueList
vi.mock('../QueueList/QueueList', () => ({
  QueueList: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="queue-list">
      <button onClick={onClose}>Close Queue</button>
    </div>
  ),
}));

// Mock useStreamToken — avoids needing a QueryClientProvider in unit tests
vi.mock('../../hooks/useStreamToken', () => ({
  useStreamToken: vi.fn(() => ({
    data: null,
    isLoading: false,
    isError: false,
    ensureToken: vi.fn().mockResolvedValue('mock-stream-token'),
    isTokenReady: false,
  })),
}));

// Mock utilities
vi.mock('../../utils/player.utils', () => ({
  getPlayerDisplayInfo: vi.fn(),
}));

vi.mock('@shared/utils/cover.utils', () => ({
  getCoverUrl: (url: string) => url || '/placeholder.jpg',
  handleImageError: vi.fn(),
}));

vi.mock('@shared/utils/format', () => ({
  formatDuration: (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },
}));

import { getPlayerDisplayInfo } from '../../utils/player.utils';

// Default mock track
const mockTrack = {
  id: 'track-1',
  title: 'Test Song',
  artist: 'Test Artist',
  albumId: 'album-1',
  albumName: 'Test Album',
  duration: 240,
  coverImage: '/cover.jpg',
};

// Default player state (split into granular hook shapes)
const defaultPlaybackState = {
  currentTrack: mockTrack,
  isPlaying: true,
  currentTime: 60,
  duration: 240,
  volume: 0.7,
  crossfade: { enabled: false, duration: 2, smartMode: false, tempoMatch: false },
  isCrossfading: false,
  volumeControlSupported: true,
  togglePlayPause: mockTogglePlayPause,
  playNext: mockPlayNext,
  playPrevious: mockPlayPrevious,
  seek: mockSeek,
  setVolume: mockSetVolume,
  play: vi.fn(),
  pause: vi.fn(),
  stop: vi.fn(),
  setCrossfadeEnabled: vi.fn(),
};

const defaultQueueState = {
  queue: [{ id: 'track-2' }, { id: 'track-3' }],
  currentIndex: 0,
  isShuffle: false,
  repeatMode: 'off' as const,
  toggleShuffle: mockToggleShuffle,
  toggleRepeat: mockToggleRepeat,
  addToQueue: vi.fn(),
  removeFromQueue: vi.fn(),
  clearQueue: vi.fn(),
  playQueue: vi.fn(),
  setShuffle: vi.fn(),
};

const defaultRadioState = {
  currentRadioStation: null as null | { name: string; favicon?: string },
  isRadioMode: false,
  radioMetadata: null,
  radioSignalStatus: null,
  playRadio: vi.fn(),
  stopRadio: vi.fn(),
};

// Legacy combined shape for backward-compatible test overrides
const defaultPlayerState = {
  ...defaultPlaybackState,
  ...defaultQueueState,
  ...defaultRadioState,
};

/** Helper: dado un override parcial, configura los 3 mocks granulares */
function setupPlayerMocks(overrides: Partial<typeof defaultPlayerState> = {}) {
  const merged = { ...defaultPlayerState, ...overrides };
  mockPlayback.mockReturnValue({
    currentTrack: merged.currentTrack,
    isPlaying: merged.isPlaying,
    volume: merged.volume,
    currentTime: merged.currentTime,
    duration: merged.duration,
    crossfade: merged.crossfade,
    isCrossfading: merged.isCrossfading,
    volumeControlSupported: merged.volumeControlSupported,
    togglePlayPause: merged.togglePlayPause,
    playNext: merged.playNext,
    playPrevious: merged.playPrevious,
    seek: merged.seek,
    setVolume: merged.setVolume,
    play: merged.play,
    pause: merged.pause,
    stop: merged.stop,
    setCrossfadeEnabled: merged.setCrossfadeEnabled,
  });
  mockQueue.mockReturnValue({
    queue: merged.queue,
    currentIndex: merged.currentIndex,
    isShuffle: merged.isShuffle,
    repeatMode: merged.repeatMode,
    toggleShuffle: merged.toggleShuffle,
    toggleRepeat: merged.toggleRepeat,
    addToQueue: merged.addToQueue,
    removeFromQueue: merged.removeFromQueue,
    clearQueue: merged.clearQueue,
    playQueue: merged.playQueue,
    setShuffle: merged.setShuffle,
  });
  mockRadio.mockReturnValue({
    currentRadioStation: merged.currentRadioStation,
    isRadioMode: merged.isRadioMode,
    radioMetadata: merged.radioMetadata,
    radioSignalStatus: merged.radioSignalStatus,
    playRadio: merged.playRadio,
    stopRadio: merged.stopRadio,
  });
}

describe('NowPlayingView', () => {
  const mockOnClose = vi.fn();
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    dominantColor: '#1a1a2e',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset window width to desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    setupPlayerMocks();

    vi.mocked(getPlayerDisplayInfo).mockReturnValue({
      title: 'Test Song',
      artist: 'Test Artist',
      cover: '/cover.jpg',
      albumName: 'Test Album',
      artistId: 'artist-1',
      albumId: 'album-1',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render when open', () => {
      render(<NowPlayingView {...defaultProps} />);

      expect(screen.getByText('Test Song')).toBeInTheDocument();
      expect(screen.getByText('Test Artist')).toBeInTheDocument();
    });

    it('should apply open class when isOpen is true', () => {
      const { container } = render(<NowPlayingView {...defaultProps} />);

      const nowPlaying = container.querySelector('[class*="nowPlaying"]');
      expect(nowPlaying?.className).toContain('open');
    });

    it('should not apply open class when isOpen is false', () => {
      const { container } = render(<NowPlayingView {...defaultProps} isOpen={false} />);

      const nowPlaying = container.querySelector('[class*="nowPlaying"]');
      expect(nowPlaying?.className).not.toContain('open');
    });

    it('should render album cover', () => {
      render(<NowPlayingView {...defaultProps} />);

      const cover = screen.getByAltText('Test Song');
      expect(cover).toBeInTheDocument();
      expect(cover).toHaveAttribute('src', '/cover.jpg');
    });
  });

  describe('header', () => {
    it('should render album name in header', () => {
      render(<NowPlayingView {...defaultProps} />);

      expect(screen.getByText('Test Album')).toBeInTheDocument();
    });

    it('should show "Reproduciendo" when no album name', () => {
      vi.mocked(getPlayerDisplayInfo).mockReturnValue({
        title: 'Test Song',
        artist: 'Test Artist',
        cover: '/cover.jpg',
        albumName: undefined,
        artistId: 'artist-1',
        albumId: undefined,
      });

      render(<NowPlayingView {...defaultProps} />);

      expect(screen.getByText('Reproduciendo ahora')).toBeInTheDocument();
    });

    it('should call onClose when clicking close button', () => {
      render(<NowPlayingView {...defaultProps} />);

      const closeButton = screen.getByTitle('Cerrar');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('playback controls', () => {
    it('should render play/pause button', () => {
      render(<NowPlayingView {...defaultProps} />);

      expect(screen.getByTitle('Pausar')).toBeInTheDocument();
    });

    it('should show play icon when paused', () => {
      setupPlayerMocks({ isPlaying: false });

      render(<NowPlayingView {...defaultProps} />);

      expect(screen.getByTitle('Reproducir')).toBeInTheDocument();
    });

    it('should call togglePlayPause when clicking play button', () => {
      render(<NowPlayingView {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Pausar'));

      expect(mockTogglePlayPause).toHaveBeenCalled();
    });

    it('should call playNext when clicking next button', () => {
      render(<NowPlayingView {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Siguiente'));

      expect(mockPlayNext).toHaveBeenCalled();
    });

    it('should call playPrevious when clicking previous button', () => {
      render(<NowPlayingView {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Anterior'));

      expect(mockPlayPrevious).toHaveBeenCalled();
    });

    it('should call toggleShuffle when clicking shuffle button', () => {
      render(<NowPlayingView {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Aleatorio'));

      expect(mockToggleShuffle).toHaveBeenCalled();
    });

    it('should call toggleRepeat when clicking repeat button', () => {
      render(<NowPlayingView {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Repetir: desactivado'));

      expect(mockToggleRepeat).toHaveBeenCalled();
    });

    it('should show active state for shuffle when enabled', () => {
      setupPlayerMocks({ isShuffle: true });

      render(<NowPlayingView {...defaultProps} />);

      const shuffleBtn = screen.getByTitle('Aleatorio');
      expect(shuffleBtn.className).toContain('active');
    });

    it('should show active state for repeat when not off', () => {
      setupPlayerMocks({ repeatMode: 'all' });

      render(<NowPlayingView {...defaultProps} />);

      const repeatBtn = screen.getByTitle('Repetir: todas');
      expect(repeatBtn.className).toContain('active');
    });
  });

  describe('progress bar', () => {
    it('should render progress bar in track mode', () => {
      render(<NowPlayingView {...defaultProps} />);

      // Check time display
      expect(screen.getByText('1:00')).toBeInTheDocument(); // currentTime 60s
      expect(screen.getByText('4:00')).toBeInTheDocument(); // duration 240s
    });

    it('should not render progress bar in radio mode', () => {
      setupPlayerMocks({
        isRadioMode: true,
        currentRadioStation: { name: 'Test Radio' },
      });

      vi.mocked(getPlayerDisplayInfo).mockReturnValue({
        title: 'Test Radio',
        artist: 'Live',
        cover: '/radio-cover.jpg',
        albumName: undefined,
        artistId: undefined,
        albumId: undefined,
      });

      render(<NowPlayingView {...defaultProps} />);

      // Time indicators shouldn't be there
      expect(screen.queryByText('1:00')).not.toBeInTheDocument();
    });

    it('should call seek when clicking progress bar', () => {
      render(<NowPlayingView {...defaultProps} />);

      const progressBar = document.querySelector('[class*="progressBar"]');
      if (progressBar) {
        // Mock getBoundingClientRect
        vi.spyOn(progressBar, 'getBoundingClientRect').mockReturnValue({
          left: 0,
          width: 200,
          top: 0,
          right: 200,
          bottom: 10,
          height: 10,
          x: 0,
          y: 0,
          toJSON: () => {},
        });

        fireEvent.click(progressBar, { clientX: 100 }); // 50% of 200

        // Should seek to 50% of duration (120s)
        expect(mockSeek).toHaveBeenCalledWith(120);
      }
    });
  });

  describe('radio mode', () => {
    beforeEach(() => {
      setupPlayerMocks({
        isRadioMode: true,
        currentTrack: null,
        currentRadioStation: { name: 'Test Radio' },
      });

      vi.mocked(getPlayerDisplayInfo).mockReturnValue({
        title: 'Test Radio',
        artist: 'Live Stream',
        cover: '/radio-cover.jpg',
        albumName: undefined,
        artistId: undefined,
        albumId: undefined,
      });
    });

    it('should render radio station info', () => {
      render(<NowPlayingView {...defaultProps} />);

      expect(screen.getByText('Test Radio')).toBeInTheDocument();
      expect(screen.getByText('Live Stream')).toBeInTheDocument();
    });

    it('should disable previous/next buttons in radio mode', () => {
      render(<NowPlayingView {...defaultProps} />);

      expect(screen.getByTitle('Anterior')).toBeDisabled();
      expect(screen.getByTitle('Siguiente')).toBeDisabled();
    });

    it('should not show shuffle button in radio mode', () => {
      render(<NowPlayingView {...defaultProps} />);

      expect(screen.queryByTitle('Aleatorio')).not.toBeInTheDocument();
    });

    it('should not show repeat button in radio mode', () => {
      render(<NowPlayingView {...defaultProps} />);

      expect(screen.queryByTitle(/Repetir/)).not.toBeInTheDocument();
    });
  });

  describe('volume control (desktop)', () => {
    it('should render volume slider on desktop', () => {
      render(<NowPlayingView {...defaultProps} />);

      const volumeSlider = document.querySelector('input[type="range"]');
      expect(volumeSlider).toBeInTheDocument();
      expect(volumeSlider).toHaveValue('0.7');
    });

    it('should call setVolume when changing volume', () => {
      render(<NowPlayingView {...defaultProps} />);

      const volumeSlider = document.querySelector('input[type="range"]') as HTMLInputElement;
      fireEvent.change(volumeSlider, { target: { value: '0.5' } });

      expect(mockSetVolume).toHaveBeenCalledWith(0.5);
    });

    it('should toggle mute when clicking volume button', () => {
      render(<NowPlayingView {...defaultProps} />);

      const volumeBtn = screen.getByTitle('Silenciar');
      fireEvent.click(volumeBtn);

      expect(mockSetVolume).toHaveBeenCalledWith(0);
    });

    it('should unmute when clicking muted volume button', () => {
      setupPlayerMocks({ volume: 0 });

      render(<NowPlayingView {...defaultProps} />);

      const volumeBtn = screen.getByTitle('Activar sonido');
      fireEvent.click(volumeBtn);

      expect(mockSetVolume).toHaveBeenCalledWith(0.7);
    });
  });

  describe('queue panel', () => {
    it('should show queue button with count on desktop', () => {
      render(<NowPlayingView {...defaultProps} />);

      const queueBtn = screen.getByTitle('Cola de reproducción');
      expect(queueBtn).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // queue.length
    });

    it('should not show queue count when queue is empty', () => {
      setupPlayerMocks({ queue: [] });

      render(<NowPlayingView {...defaultProps} />);

      // Queue button should exist but no count
      expect(screen.getByTitle('Cola de reproducción')).toBeInTheDocument();
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('should open queue panel when clicking queue button', () => {
      render(<NowPlayingView {...defaultProps} />);

      const queueBtn = screen.getByTitle('Cola de reproducción');
      fireEvent.click(queueBtn);

      expect(screen.getByTestId('queue-list')).toBeInTheDocument();
    });

    it('should show queue header on desktop', () => {
      render(<NowPlayingView {...defaultProps} />);

      // Open queue
      fireEvent.click(screen.getByTitle('Cola de reproducción'));

      expect(screen.getByText('Cola de reproducción')).toBeInTheDocument();
      expect(screen.getByTitle('Cerrar cola')).toBeInTheDocument();
    });

    it('should not show queue button in radio mode', () => {
      setupPlayerMocks({ isRadioMode: true });

      render(<NowPlayingView {...defaultProps} />);

      // Volume row queue button shouldn't be there
      const queueButtons = screen.queryAllByTitle('Cola de reproducción');
      expect(queueButtons.length).toBe(0);
    });
  });

  describe('navigation', () => {
    it('should have clickable cover when album exists', () => {
      render(<NowPlayingView {...defaultProps} />);

      const coverContainer = document.querySelector('[class*="coverContainer"]');
      expect(coverContainer?.className).toContain('clickable');
    });

    it('should not navigate to album in radio mode', () => {
      setupPlayerMocks({ isRadioMode: true });

      vi.mocked(getPlayerDisplayInfo).mockReturnValue({
        title: 'Radio',
        artist: 'Live',
        cover: '/radio.jpg',
        albumName: undefined,
        artistId: undefined,
        albumId: undefined,
      });

      render(<NowPlayingView {...defaultProps} />);

      const coverContainer = document.querySelector('[class*="coverContainer"]');
      expect(coverContainer?.className).not.toContain('clickable');
    });
  });

  describe('mobile behavior', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      // Trigger resize event
      window.dispatchEvent(new Event('resize'));
    });

    it('should not render volume slider on mobile', () => {
      render(<NowPlayingView {...defaultProps} />);

      // Volume slider should not be in the DOM on mobile
      const volumeSlider = document.querySelector('input[type="range"]');
      expect(volumeSlider).not.toBeInTheDocument();
    });

    it('should render queue button in actions area on mobile', () => {
      render(<NowPlayingView {...defaultProps} />);

      const actionsArea = document.querySelector('[class*="actions"]');
      expect(actionsArea).toBeInTheDocument();
    });
  });

  describe('body scroll lock', () => {
    it('should lock body scroll when open', () => {
      render(<NowPlayingView {...defaultProps} isOpen={true} />);

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should not lock body scroll when closed', () => {
      render(<NowPlayingView {...defaultProps} isOpen={false} />);

      expect(document.body.style.overflow).not.toBe('hidden');
    });
  });

  describe('dominant color', () => {
    it('should apply dominant color as CSS variable', () => {
      const { container } = render(<NowPlayingView {...defaultProps} dominantColor="#ff5500" />);

      const nowPlaying = container.firstChild as HTMLElement;
      expect(nowPlaying?.style.getPropertyValue('--dominant-color')).toBe('#ff5500');
    });
  });
});
