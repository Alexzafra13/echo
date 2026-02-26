import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SharedAlbumPage from './SharedAlbumPage';

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useParams: () => ({ serverId: 'server-1', albumId: 'album-1' }),
  useLocation: () => ['/shared/server-1/album-1', mockSetLocation],
}));

// Mock federation hooks
vi.mock('../../hooks', () => ({
  useRemoteAlbum: vi.fn(),
  useConnectedServers: vi.fn(),
  useStartImport: vi.fn(),
  useCancelImport: vi.fn(),
  useImports: vi.fn(),
}));

// Mock player context
vi.mock('@features/player/context/PlayerContext', () => ({
  usePlayer: vi.fn(),
}));

// Mock shared hooks
vi.mock('@shared/hooks', () => ({
  useDropdownMenu: vi.fn(),
  useModal: vi.fn(() => ({
    isOpen: false,
    data: null,
    open: vi.fn(),
    openWith: vi.fn(),
    close: vi.fn(),
  })),
  useDocumentTitle: vi.fn(),
  useDominantColor: vi.fn(() => '100, 150, 200'),
}));

// Mock auth store
vi.mock('@shared/store/authStore', () => ({
  useAuthStore: vi.fn((selector) => selector({ user: { id: 'user-1', isAdmin: true } })),
}));

// Mock components
vi.mock('@shared/components/layout/Header', () => ({
  Header: () => <header data-testid="header">Header</header>,
}));

vi.mock('@features/home/components', () => ({
  Sidebar: () => <aside data-testid="sidebar">Sidebar</aside>,
}));

vi.mock('@shared/components/ui', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    leftIcon,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    leftIcon?: React.ReactNode;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {leftIcon}
      {children}
    </button>
  ),
  Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@shared/utils/colorExtractor', () => ({
  extractDominantColor: vi.fn().mockResolvedValue('100, 150, 200'),
}));

vi.mock('@shared/utils/cover.utils', () => ({
  handleImageError: vi.fn(),
}));

vi.mock('@shared/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

// Import mocked modules
import * as federationHooks from '../../hooks';
import * as playerContext from '@features/player/context/PlayerContext';
import * as sharedHooks from '@shared/hooks';

// Mock data
const mockAlbum = {
  id: 'album-1',
  name: 'Remote Album',
  artistName: 'Remote Artist',
  year: 2023,
  songCount: 5,
  duration: 1200,
  coverUrl: 'https://remote-server.com/cover.jpg',
  tracks: [
    {
      id: 'track-1',
      title: 'Remote Song 1',
      artistName: 'Remote Artist',
      trackNumber: 1,
      duration: 240,
    },
    {
      id: 'track-2',
      title: 'Remote Song 2',
      artistName: 'Remote Artist',
      trackNumber: 2,
      duration: 180,
    },
    {
      id: 'track-3',
      title: 'Remote Song 3',
      artistName: 'Remote Artist',
      trackNumber: 3,
      duration: 200,
    },
  ],
};

const mockServers = [
  { id: 'server-1', name: 'Friend Server', baseUrl: 'https://friend.example.com', isOnline: true },
];

describe('SharedAlbumPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(federationHooks.useRemoteAlbum).mockReturnValue({
      data: mockAlbum,
      isLoading: false,
      error: null,
    } as ReturnType<typeof federationHooks.useRemoteAlbum>);

    vi.mocked(federationHooks.useConnectedServers).mockReturnValue({
      data: mockServers,
    } as ReturnType<typeof federationHooks.useConnectedServers>);

    vi.mocked(federationHooks.useStartImport).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
    } as unknown as ReturnType<typeof federationHooks.useStartImport>);

    vi.mocked(federationHooks.useCancelImport).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
    } as unknown as ReturnType<typeof federationHooks.useCancelImport>);

    vi.mocked(federationHooks.useImports).mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof federationHooks.useImports>);

    vi.mocked(playerContext.usePlayer).mockReturnValue({
      playQueue: vi.fn(),
      currentTrack: null,
      isPlaying: false,
      play: vi.fn(),
      pause: vi.fn(),
      setShuffle: vi.fn(),
    } as unknown as ReturnType<typeof playerContext.usePlayer>);

    vi.mocked(sharedHooks.useDropdownMenu).mockReturnValue({
      isOpen: false,
      isClosing: false,
      triggerRef: { current: null },
      dropdownRef: { current: null },
      effectivePosition: null,
      toggleMenu: vi.fn(),
      handleOptionClick: vi.fn((e, handler) => handler()),
    } as unknown as ReturnType<typeof sharedHooks.useDropdownMenu>);
  });

  describe('loading state', () => {
    it('should show loading state', () => {
      vi.mocked(federationHooks.useRemoteAlbum).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as ReturnType<typeof federationHooks.useRemoteAlbum>);

      render(<SharedAlbumPage />);

      expect(screen.getByText('Cargando album...')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error state', () => {
      vi.mocked(federationHooks.useRemoteAlbum).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed'),
      } as ReturnType<typeof federationHooks.useRemoteAlbum>);

      render(<SharedAlbumPage />);

      expect(screen.getByText('Error al cargar el album')).toBeInTheDocument();
    });

    it('should have button to go back home', () => {
      vi.mocked(federationHooks.useRemoteAlbum).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed'),
      } as ReturnType<typeof federationHooks.useRemoteAlbum>);

      render(<SharedAlbumPage />);

      fireEvent.click(screen.getByText('Volver al inicio'));

      expect(mockSetLocation).toHaveBeenCalledWith('/home');
    });
  });

  describe('rendering', () => {
    it('should render album name', () => {
      render(<SharedAlbumPage />);

      expect(screen.getByText('Remote Album')).toBeInTheDocument();
    });

    it('should render album type badge', () => {
      render(<SharedAlbumPage />);

      expect(screen.getByText('Album Federado')).toBeInTheDocument();
    });

    it('should render artist name', () => {
      render(<SharedAlbumPage />);

      // Artist name appears in header and in each track row
      const artistElements = screen.getAllByText('Remote Artist');
      expect(artistElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should render album year', () => {
      render(<SharedAlbumPage />);

      expect(screen.getByText('2023')).toBeInTheDocument();
    });

    it('should render track count', () => {
      render(<SharedAlbumPage />);

      expect(screen.getByText('5 canciones')).toBeInTheDocument();
    });

    it('should render server badge', () => {
      render(<SharedAlbumPage />);

      expect(screen.getByText('Desde Friend Server')).toBeInTheDocument();
    });

    it('should render sidebar and header', () => {
      render(<SharedAlbumPage />);

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
  });

  describe('play buttons', () => {
    it('should call playQueue when clicking Reproducir', () => {
      const mockPlayQueue = vi.fn();
      const mockSetShuffle = vi.fn();
      vi.mocked(playerContext.usePlayer).mockReturnValue({
        playQueue: mockPlayQueue,
        currentTrack: null,
        isPlaying: false,
        play: vi.fn(),
        pause: vi.fn(),
        setShuffle: mockSetShuffle,
      } as unknown as ReturnType<typeof playerContext.usePlayer>);

      render(<SharedAlbumPage />);

      fireEvent.click(screen.getByText('Reproducir'));

      expect(mockSetShuffle).toHaveBeenCalledWith(false);
      expect(mockPlayQueue).toHaveBeenCalledWith(expect.any(Array), 0, 'album');
    });

    it('should enable shuffle when clicking Aleatorio', () => {
      const mockPlayQueue = vi.fn();
      const mockSetShuffle = vi.fn();
      vi.mocked(playerContext.usePlayer).mockReturnValue({
        playQueue: mockPlayQueue,
        currentTrack: null,
        isPlaying: false,
        play: vi.fn(),
        pause: vi.fn(),
        setShuffle: mockSetShuffle,
      } as unknown as ReturnType<typeof playerContext.usePlayer>);

      render(<SharedAlbumPage />);

      fireEvent.click(screen.getByText('Aleatorio'));

      expect(mockSetShuffle).toHaveBeenCalledWith(true);
      expect(mockPlayQueue).toHaveBeenCalled();
    });

    it('should disable buttons when no tracks', () => {
      vi.mocked(federationHooks.useRemoteAlbum).mockReturnValue({
        data: { ...mockAlbum, tracks: [] },
        isLoading: false,
        error: null,
      } as ReturnType<typeof federationHooks.useRemoteAlbum>);

      render(<SharedAlbumPage />);

      expect(screen.getByText('Reproducir')).toBeDisabled();
      expect(screen.getByText('Aleatorio')).toBeDisabled();
    });
  });

  describe('track list', () => {
    it('should render tracks', () => {
      render(<SharedAlbumPage />);

      expect(screen.getByText('Remote Song 1')).toBeInTheDocument();
      expect(screen.getByText('Remote Song 2')).toBeInTheDocument();
      expect(screen.getByText('Remote Song 3')).toBeInTheDocument();
    });

    it('should show track header', () => {
      render(<SharedAlbumPage />);

      expect(screen.getByText('#')).toBeInTheDocument();
      expect(screen.getByText('Titulo')).toBeInTheDocument();
      expect(screen.getByText('Duracion')).toBeInTheDocument();
    });

    it('should show track duration', () => {
      render(<SharedAlbumPage />);

      expect(screen.getByText('4:00')).toBeInTheDocument(); // 240 seconds
      expect(screen.getByText('3:00')).toBeInTheDocument(); // 180 seconds
      expect(screen.getByText('3:20')).toBeInTheDocument(); // 200 seconds
    });

    it('should call playQueue when clicking a track', () => {
      const mockPlayQueue = vi.fn();
      vi.mocked(playerContext.usePlayer).mockReturnValue({
        playQueue: mockPlayQueue,
        currentTrack: null,
        isPlaying: false,
        play: vi.fn(),
        pause: vi.fn(),
        setShuffle: vi.fn(),
      } as unknown as ReturnType<typeof playerContext.usePlayer>);

      render(<SharedAlbumPage />);

      fireEvent.click(screen.getByText('Remote Song 2'));

      expect(mockPlayQueue).toHaveBeenCalledWith(expect.any(Array), 1, 'album');
    });

    it('should toggle play/pause when clicking currently playing track', () => {
      const mockPause = vi.fn();
      vi.mocked(playerContext.usePlayer).mockReturnValue({
        playQueue: vi.fn(),
        currentTrack: { id: 'server-1-track-1' },
        isPlaying: true,
        play: vi.fn(),
        pause: mockPause,
        setShuffle: vi.fn(),
      } as unknown as ReturnType<typeof playerContext.usePlayer>);

      render(<SharedAlbumPage />);

      fireEvent.click(screen.getByText('Remote Song 1'));

      expect(mockPause).toHaveBeenCalled();
    });

    it('should show empty state when no tracks', () => {
      vi.mocked(federationHooks.useRemoteAlbum).mockReturnValue({
        data: { ...mockAlbum, tracks: [] },
        isLoading: false,
        error: null,
      } as ReturnType<typeof federationHooks.useRemoteAlbum>);

      render(<SharedAlbumPage />);

      expect(screen.getByText('No se encontraron canciones en este album')).toBeInTheDocument();
    });
  });

  describe('import functionality', () => {
    it('should show options menu button', () => {
      render(<SharedAlbumPage />);

      expect(screen.getByLabelText('Opciones del álbum')).toBeInTheDocument();
    });

    it('should show import option in dropdown', () => {
      vi.mocked(sharedHooks.useDropdownMenu).mockReturnValue({
        isOpen: true,
        isClosing: false,
        triggerRef: { current: null },
        dropdownRef: { current: null },
        effectivePosition: { top: 100, left: 100, maxHeight: 300, placement: 'bottom' },
        toggleMenu: vi.fn(),
        handleOptionClick: vi.fn((e, handler) => handler()),
      } as unknown as ReturnType<typeof sharedHooks.useDropdownMenu>);

      render(<SharedAlbumPage />);

      expect(screen.getByText('Importar a mi servidor')).toBeInTheDocument();
    });

    it('should call import when clicking import option', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      vi.mocked(federationHooks.useStartImport).mockReturnValue({
        mutateAsync: mockMutateAsync,
      } as unknown as ReturnType<typeof federationHooks.useStartImport>);

      vi.mocked(sharedHooks.useDropdownMenu).mockReturnValue({
        isOpen: true,
        isClosing: false,
        triggerRef: { current: null },
        dropdownRef: { current: null },
        effectivePosition: { top: 100, left: 100, maxHeight: 300, placement: 'bottom' },
        toggleMenu: vi.fn(),
        handleOptionClick: vi.fn((e, handler) => handler()),
      } as unknown as ReturnType<typeof sharedHooks.useDropdownMenu>);

      render(<SharedAlbumPage />);

      fireEvent.click(screen.getByText('Importar a mi servidor'));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          serverId: 'server-1',
          remoteAlbumId: 'album-1',
        });
      });
    });

    it('should show imported state after successful import', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      vi.mocked(federationHooks.useStartImport).mockReturnValue({
        mutateAsync: mockMutateAsync,
      } as unknown as ReturnType<typeof federationHooks.useStartImport>);

      vi.mocked(sharedHooks.useDropdownMenu).mockReturnValue({
        isOpen: true,
        isClosing: false,
        triggerRef: { current: null },
        dropdownRef: { current: null },
        effectivePosition: { top: 100, left: 100, maxHeight: 300, placement: 'bottom' },
        toggleMenu: vi.fn(),
        handleOptionClick: vi.fn((e, handler) => handler()),
      } as unknown as ReturnType<typeof sharedHooks.useDropdownMenu>);

      render(<SharedAlbumPage />);

      fireEvent.click(screen.getByText('Importar a mi servidor'));

      await waitFor(() => {
        expect(screen.getByText('Álbum importado')).toBeInTheDocument();
      });
    });
  });

  describe('image modal', () => {
    it('should open image lightbox when clicking cover', () => {
      const mockOpenLightbox = vi.fn();
      vi.mocked(sharedHooks.useModal).mockReturnValue({
        isOpen: false,
        data: null,
        open: mockOpenLightbox,
        openWith: vi.fn(),
        close: vi.fn(),
      });

      render(<SharedAlbumPage />);

      const coverImage = screen.getByAltText('Remote Album');
      fireEvent.click(coverImage);

      expect(mockOpenLightbox).toHaveBeenCalled();
    });

    it('should close image lightbox when clicking backdrop', () => {
      const mockCloseLightbox = vi.fn();
      vi.mocked(sharedHooks.useModal).mockReturnValue({
        isOpen: true,
        data: null,
        open: vi.fn(),
        openWith: vi.fn(),
        close: mockCloseLightbox,
      });

      render(<SharedAlbumPage />);

      // Should have two images now (original + lightbox)
      expect(screen.getAllByAltText('Remote Album')).toHaveLength(2);

      // Click the backdrop
      const modalBackdrop = document.querySelector('[class*="imageModal"]');
      if (modalBackdrop) {
        fireEvent.click(modalBackdrop);
        expect(mockCloseLightbox).toHaveBeenCalled();
      }
    });
  });

  describe('format helpers', () => {
    it('should format total duration in hours when tracks have long duration', () => {
      // Total from tracks is used: 3700 seconds = 1h 1min
      vi.mocked(federationHooks.useRemoteAlbum).mockReturnValue({
        data: {
          ...mockAlbum,
          tracks: [
            {
              id: 'track-1',
              title: 'Long Song',
              artistName: 'Artist',
              trackNumber: 1,
              duration: 3700,
            },
          ],
        },
        isLoading: false,
        error: null,
      } as ReturnType<typeof federationHooks.useRemoteAlbum>);

      render(<SharedAlbumPage />);

      expect(screen.getByText('1 h 1 min')).toBeInTheDocument();
    });
  });
});
