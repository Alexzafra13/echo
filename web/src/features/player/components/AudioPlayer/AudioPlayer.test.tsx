import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AudioPlayer } from './AudioPlayer';

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/test', mockSetLocation],
}));

// Mock player context values
const mockTogglePlayPause = vi.fn();
const mockPlayNext = vi.fn();
const mockPlayPrevious = vi.fn();
const mockSeek = vi.fn();
const mockSetVolume = vi.fn();
const mockToggleShuffle = vi.fn();
const mockToggleRepeat = vi.fn();

const mockPlayerContext = {
  currentTrack: null as null | {
    id: string;
    title: string;
    artist: string;
    albumId: string;
    album?: { cover: string };
    coverImage?: string;
    duration: number;
  },
  currentRadioStation: null as null | {
    id: string;
    name: string;
    favicon?: string;
  },
  isRadioMode: false,
  isPlaying: false,
  currentTime: 0,
  duration: 180,
  volume: 0.7,
  isShuffle: false,
  repeatMode: 'off' as 'off' | 'all' | 'one',
  queue: [] as unknown[],
  radioMetadata: null as null | { title?: string; artist?: string; song?: string },
  radioSignalStatus: 'good' as 'good' | 'weak' | 'error',
  togglePlayPause: mockTogglePlayPause,
  playNext: mockPlayNext,
  playPrevious: mockPlayPrevious,
  seek: mockSeek,
  setVolume: mockSetVolume,
  toggleShuffle: mockToggleShuffle,
  toggleRepeat: mockToggleRepeat,
};

vi.mock('../../context/PlayerContext', () => ({
  usePlayer: () => mockPlayerContext,
}));

// Mock hooks
vi.mock('../../hooks/usePageEndDetection', () => ({
  usePageEndDetection: () => false,
}));

vi.mock('../../hooks/useClickOutsideRef', () => ({
  useClickOutsideRef: vi.fn(),
}));

// Mock store
vi.mock('../../store', () => ({
  usePlayerSettingsStore: () => 'footer',
}));

// Mock utilities
vi.mock('../../utils/player.utils', () => ({
  getPlayerDisplayInfo: (isRadio: boolean, radio: unknown, track: unknown) => {
    if (isRadio && radio) {
      const r = radio as { name: string; favicon?: string };
      return {
        title: r.name,
        artist: 'Radio',
        cover: r.favicon || '',
        albumId: null,
        albumName: null,
      };
    }
    if (track) {
      const t = track as {
        title: string;
        artist: string;
        albumId: string;
        album?: { name: string; cover: string };
      };
      return {
        title: t.title,
        artist: t.artist,
        cover: t.album?.cover || '',
        albumId: t.albumId,
        albumName: t.album?.name || 'Unknown Album',
      };
    }
    return { title: '', artist: '', cover: '', albumId: null, albumName: null };
  },
}));

vi.mock('@shared/utils/cover.utils', () => ({
  getCoverUrl: (url: string) => url || '/default-cover.jpg',
  handleImageError: vi.fn(),
}));

vi.mock('@shared/utils/format', () => ({
  formatDuration: (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },
}));

vi.mock('@shared/utils/colorExtractor', () => ({
  extractDominantColor: vi.fn().mockResolvedValue('100, 100, 100'),
}));

// Mock child components
vi.mock('../QueueList/QueueList', () => ({
  QueueList: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="queue-list">
      Queue List
      <button onClick={onClose}>Close Queue</button>
    </div>
  ),
}));

vi.mock('../PlayerMenu/PlayerMenu', () => ({
  PlayerMenu: ({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) => (
    <button data-testid="player-menu" data-open={isOpen} onClick={onToggle}>
      Menu
    </button>
  ),
}));

vi.mock('../NowPlayingView', () => ({
  NowPlayingView: ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="now-playing-view">
        Now Playing View
        <button onClick={onClose}>Close NowPlaying</button>
      </div>
    ) : null,
}));

describe('AudioPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock context to default values
    mockPlayerContext.currentTrack = null;
    mockPlayerContext.currentRadioStation = null;
    mockPlayerContext.isRadioMode = false;
    mockPlayerContext.isPlaying = false;
    mockPlayerContext.currentTime = 0;
    mockPlayerContext.duration = 180;
    mockPlayerContext.volume = 0.7;
    mockPlayerContext.isShuffle = false;
    mockPlayerContext.repeatMode = 'off';
    mockPlayerContext.queue = [];
    mockPlayerContext.radioMetadata = null;
    mockPlayerContext.radioSignalStatus = 'good';

    // Mock window.innerWidth for desktop by default
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  describe('rendering', () => {
    it('should not render when no track or radio', () => {
      const { container } = render(<AudioPlayer />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when track is playing', () => {
      mockPlayerContext.currentTrack = {
        id: 'track-1',
        title: 'Comfortably Numb',
        artist: 'Pink Floyd',
        albumId: 'album-1',
        album: { cover: '/covers/album1.jpg' },
        duration: 380,
      };

      render(<AudioPlayer />);

      expect(screen.getByText('Comfortably Numb')).toBeInTheDocument();
      expect(screen.getByText('Pink Floyd')).toBeInTheDocument();
    });

    it('should render when radio is playing', () => {
      mockPlayerContext.currentRadioStation = {
        id: 'radio-1',
        name: 'Classic Rock FM',
        favicon: 'https://radio.com/logo.png',
      };
      mockPlayerContext.isRadioMode = true;

      render(<AudioPlayer />);

      expect(screen.getByText('Classic Rock FM')).toBeInTheDocument();
      expect(screen.getByText('Radio')).toBeInTheDocument();
    });
  });

  describe('track mode controls', () => {
    beforeEach(() => {
      mockPlayerContext.currentTrack = {
        id: 'track-1',
        title: 'Test Track',
        artist: 'Test Artist',
        albumId: 'album-1',
        album: { cover: '/covers/test.jpg' },
        duration: 180,
      };
    });

    it('should render play button when paused', () => {
      mockPlayerContext.isPlaying = false;
      render(<AudioPlayer />);

      expect(screen.getByLabelText('Reproducir')).toBeInTheDocument();
    });

    it('should render pause button when playing', () => {
      mockPlayerContext.isPlaying = true;
      render(<AudioPlayer />);

      expect(screen.getByLabelText('Pausar')).toBeInTheDocument();
    });

    it('should call togglePlayPause when clicking play/pause button', () => {
      render(<AudioPlayer />);

      fireEvent.click(screen.getByLabelText('Reproducir'));

      expect(mockTogglePlayPause).toHaveBeenCalled();
    });

    it('should render skip controls', () => {
      render(<AudioPlayer />);

      expect(screen.getByLabelText('Anterior')).toBeInTheDocument();
      expect(screen.getByLabelText('Siguiente')).toBeInTheDocument();
    });

    it('should call playPrevious when clicking previous button', () => {
      render(<AudioPlayer />);

      fireEvent.click(screen.getByLabelText('Anterior'));

      expect(mockPlayPrevious).toHaveBeenCalled();
    });

    it('should call playNext when clicking next button', () => {
      render(<AudioPlayer />);

      fireEvent.click(screen.getByLabelText('Siguiente'));

      expect(mockPlayNext).toHaveBeenCalled();
    });

    it('should render shuffle button', () => {
      render(<AudioPlayer />);

      expect(screen.getByLabelText('Activar aleatorio')).toBeInTheDocument();
    });

    it('should call toggleShuffle when clicking shuffle button', () => {
      render(<AudioPlayer />);

      fireEvent.click(screen.getByLabelText('Activar aleatorio'));

      expect(mockToggleShuffle).toHaveBeenCalled();
    });

    it('should render repeat button', () => {
      render(<AudioPlayer />);

      expect(screen.getByLabelText('Repetir: desactivado')).toBeInTheDocument();
    });

    it('should call toggleRepeat when clicking repeat button', () => {
      render(<AudioPlayer />);

      fireEvent.click(screen.getByLabelText('Repetir: desactivado'));

      expect(mockToggleRepeat).toHaveBeenCalled();
    });
  });

  describe('radio mode controls', () => {
    beforeEach(() => {
      mockPlayerContext.currentRadioStation = {
        id: 'radio-1',
        name: 'Test Radio',
        favicon: 'https://radio.com/logo.png',
      };
      mockPlayerContext.isRadioMode = true;
    });

    it('should only render play/pause button in radio mode', () => {
      render(<AudioPlayer />);

      expect(screen.getByLabelText('Reproducir')).toBeInTheDocument();
      expect(screen.queryByLabelText('Anterior')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Siguiente')).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/aleatorio/)).not.toBeInTheDocument();
    });

    it('should render live indicator in radio mode', () => {
      render(<AudioPlayer />);

      expect(screen.getByText('EN VIVO')).toBeInTheDocument();
    });

    it('should show weak signal indicator', () => {
      mockPlayerContext.radioSignalStatus = 'weak';
      render(<AudioPlayer />);

      expect(screen.getByText('SEÑAL DÉBIL')).toBeInTheDocument();
    });

    it('should show error signal indicator', () => {
      mockPlayerContext.radioSignalStatus = 'error';
      render(<AudioPlayer />);

      expect(screen.getByText('SIN SEÑAL')).toBeInTheDocument();
    });

    it('should render radio metadata when available', () => {
      mockPlayerContext.radioMetadata = {
        title: 'Now Playing: Bohemian Rhapsody',
      };
      render(<AudioPlayer />);

      expect(screen.getByText('Now Playing: Bohemian Rhapsody')).toBeInTheDocument();
    });
  });

  describe('volume control', () => {
    beforeEach(() => {
      mockPlayerContext.currentTrack = {
        id: 'track-1',
        title: 'Test Track',
        artist: 'Test Artist',
        albumId: 'album-1',
        duration: 180,
      };
    });

    it('should render volume button', () => {
      render(<AudioPlayer />);

      expect(screen.getByLabelText('Silenciar')).toBeInTheDocument();
    });

    it('should render mute button when volume is 0', () => {
      mockPlayerContext.volume = 0;
      render(<AudioPlayer />);

      expect(screen.getByLabelText('Activar sonido')).toBeInTheDocument();
    });

    it('should toggle mute when clicking volume button', () => {
      render(<AudioPlayer />);

      fireEvent.click(screen.getByLabelText('Silenciar'));

      expect(mockSetVolume).toHaveBeenCalledWith(0);
    });

    it('should restore volume when clicking unmute button', () => {
      mockPlayerContext.volume = 0;
      render(<AudioPlayer />);

      fireEvent.click(screen.getByLabelText('Activar sonido'));

      expect(mockSetVolume).toHaveBeenCalledWith(0.7);
    });

    it('should update volume when changing slider', () => {
      render(<AudioPlayer />);

      const slider = document.querySelector('input[type="range"]');
      expect(slider).toBeInTheDocument();

      fireEvent.change(slider!, { target: { value: '0.5' } });

      expect(mockSetVolume).toHaveBeenCalledWith(0.5);
    });
  });

  describe('progress bar', () => {
    beforeEach(() => {
      mockPlayerContext.currentTrack = {
        id: 'track-1',
        title: 'Test Track',
        artist: 'Test Artist',
        albumId: 'album-1',
        duration: 180,
      };
      mockPlayerContext.currentTime = 60;
      mockPlayerContext.duration = 180;
    });

    it('should render progress bar for tracks', () => {
      render(<AudioPlayer />);

      expect(screen.getByText('1:00')).toBeInTheDocument(); // current time
      expect(screen.getByText('3:00')).toBeInTheDocument(); // duration
    });

    it('should not render progress bar for radio', () => {
      mockPlayerContext.currentTrack = null;
      mockPlayerContext.currentRadioStation = {
        id: 'radio-1',
        name: 'Test Radio',
      };
      mockPlayerContext.isRadioMode = true;

      render(<AudioPlayer />);

      expect(screen.queryByText('1:00')).not.toBeInTheDocument();
    });
  });

  describe('queue', () => {
    beforeEach(() => {
      mockPlayerContext.currentTrack = {
        id: 'track-1',
        title: 'Test Track',
        artist: 'Test Artist',
        albumId: 'album-1',
        duration: 180,
      };
      mockPlayerContext.queue = [{ id: 'track-2' }, { id: 'track-3' }];
    });

    it('should render queue button for tracks', () => {
      render(<AudioPlayer />);

      expect(screen.getByTitle('Lista de reproducción')).toBeInTheDocument();
    });

    it('should show queue count badge', () => {
      render(<AudioPlayer />);

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should not render queue button in radio mode', () => {
      mockPlayerContext.currentTrack = null;
      mockPlayerContext.currentRadioStation = {
        id: 'radio-1',
        name: 'Test Radio',
      };
      mockPlayerContext.isRadioMode = true;

      render(<AudioPlayer />);

      expect(screen.queryByTitle('Lista de reproducción')).not.toBeInTheDocument();
    });

    it('should open queue when clicking queue button', async () => {
      render(<AudioPlayer />);

      fireEvent.click(screen.getByTitle('Lista de reproducción'));

      await waitFor(() => {
        expect(screen.getByTestId('queue-list')).toBeInTheDocument();
      });
    });

    it('should close queue when clicking close button', async () => {
      render(<AudioPlayer />);

      fireEvent.click(screen.getByTitle('Lista de reproducción'));

      await waitFor(() => {
        expect(screen.getByTestId('queue-list')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Close Queue'));

      await waitFor(() => {
        expect(screen.queryByTestId('queue-list')).not.toBeInTheDocument();
      });
    });
  });

  describe('player menu', () => {
    beforeEach(() => {
      mockPlayerContext.currentTrack = {
        id: 'track-1',
        title: 'Test Track',
        artist: 'Test Artist',
        albumId: 'album-1',
        duration: 180,
      };
    });

    it('should render player menu', () => {
      render(<AudioPlayer />);

      expect(screen.getByTestId('player-menu')).toBeInTheDocument();
    });

    it('should toggle menu when clicking menu button', () => {
      render(<AudioPlayer />);

      const menuButton = screen.getByTestId('player-menu');
      expect(menuButton).toHaveAttribute('data-open', 'false');

      fireEvent.click(menuButton);

      expect(menuButton).toHaveAttribute('data-open', 'true');
    });
  });

  describe('now playing view', () => {
    beforeEach(() => {
      mockPlayerContext.currentTrack = {
        id: 'track-1',
        title: 'Test Track',
        artist: 'Test Artist',
        albumId: 'album-1',
        duration: 180,
      };
    });

    it('should render expand button on desktop', () => {
      render(<AudioPlayer />);

      expect(screen.getByLabelText('Expandir reproductor')).toBeInTheDocument();
    });

    it('should open NowPlayingView when clicking expand button', async () => {
      render(<AudioPlayer />);

      fireEvent.click(screen.getByLabelText('Expandir reproductor'));

      await waitFor(() => {
        expect(screen.getByTestId('now-playing-view')).toBeInTheDocument();
      });
    });

    it('should close NowPlayingView when clicking close button', async () => {
      render(<AudioPlayer />);

      fireEvent.click(screen.getByLabelText('Expandir reproductor'));

      await waitFor(() => {
        expect(screen.getByTestId('now-playing-view')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Close NowPlaying'));

      await waitFor(() => {
        expect(screen.queryByTestId('now-playing-view')).not.toBeInTheDocument();
      });
    });
  });

  describe('album navigation', () => {
    beforeEach(() => {
      mockPlayerContext.currentTrack = {
        id: 'track-1',
        title: 'Test Track',
        artist: 'Test Artist',
        albumId: 'album-1',
        album: { cover: '/covers/test.jpg', name: 'Test Album' } as { cover: string; name?: string },
        duration: 180,
      };
    });

    it('should render album name', () => {
      render(<AudioPlayer />);

      expect(screen.getByText('Test Album')).toBeInTheDocument();
    });
  });

  describe('shuffle and repeat states', () => {
    beforeEach(() => {
      mockPlayerContext.currentTrack = {
        id: 'track-1',
        title: 'Test Track',
        artist: 'Test Artist',
        albumId: 'album-1',
        duration: 180,
      };
    });

    it('should show repeat one mode label', () => {
      mockPlayerContext.repeatMode = 'one';
      render(<AudioPlayer />);

      expect(screen.getByLabelText('Repetir: una canción')).toBeInTheDocument();
    });

    it('should show repeat all mode label', () => {
      mockPlayerContext.repeatMode = 'all';
      render(<AudioPlayer />);

      expect(screen.getByLabelText('Repetir: todas')).toBeInTheDocument();
    });
  });

  describe('time formatting', () => {
    beforeEach(() => {
      mockPlayerContext.currentTrack = {
        id: 'track-1',
        title: 'Test Track',
        artist: 'Test Artist',
        albumId: 'album-1',
        duration: 3661, // 1 hour, 1 minute, 1 second
      };
      mockPlayerContext.currentTime = 125; // 2 minutes, 5 seconds
      mockPlayerContext.duration = 3661;
    });

    it('should format current time correctly', () => {
      render(<AudioPlayer />);

      expect(screen.getByText('2:05')).toBeInTheDocument();
    });

    it('should format duration correctly', () => {
      render(<AudioPlayer />);

      expect(screen.getByText('61:01')).toBeInTheDocument();
    });
  });
});
