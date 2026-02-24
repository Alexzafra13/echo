import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PlaylistDetailPage from './PlaylistDetailPage';

// Mock state
const mockState = {
  playlistLoading: false,
  playlistError: null as Error | null,
  tracksLoading: false,
  deleteModalOpen: false,
  editModalOpen: false,
};

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useParams: () => ({ id: 'playlist-123' }),
  useLocation: () => ['/', mockSetLocation],
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock layout components
vi.mock('@shared/components/layout/Header', () => ({
  Header: () => <header data-testid="header">Header</header>,
}));

vi.mock('@features/home/components', () => ({
  Sidebar: () => <nav data-testid="sidebar">Sidebar</nav>,
  TrackList: ({ tracks, onTrackPlay, onRemoveFromPlaylist }: {
    tracks: Array<{ id: string; title: string }>;
    onTrackPlay?: (track: { id: string }) => void;
    onRemoveFromPlaylist?: (track: { id: string }) => void;
  }) => (
    <div data-testid="track-list">
      {tracks.map((track) => (
        <div key={track.id} data-testid="track-item">
          <span>{track.title}</span>
          <button onClick={() => onTrackPlay?.({ id: track.id })}>Play</button>
          <button onClick={() => onRemoveFromPlaylist?.({ id: track.id })}>Remove</button>
        </div>
      ))}
    </div>
  ),
}));

// Mock UI components
vi.mock('@shared/components/ui', () => ({
  Button: ({ children, onClick, disabled, leftIcon }: {
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
}));

// Mock playlist data
const mockPlaylist = {
  id: 'playlist-123',
  name: 'My Test Playlist',
  description: 'A playlist for testing',
  public: true,
  ownerId: 'user-1',
  ownerName: 'Test User',
  songCount: 3,
  duration: 600,
  coverImageUrl: null,
};

const mockTracks = [
  { id: 'track-1', title: 'Track One', artist: 'Artist A', albumId: 'album-1' },
  { id: 'track-2', title: 'Track Two', artist: 'Artist B', albumId: 'album-2' },
  { id: 'track-3', title: 'Track Three', artist: 'Artist C', albumId: 'album-1' },
];

// Mock playlist hooks
const mockRemoveTrackMutation = { mutateAsync: vi.fn() };
const mockDeletePlaylistMutation = { mutateAsync: vi.fn(), isPending: false };
const mockUpdatePlaylistMutation = { mutateAsync: vi.fn(), isPending: false };
const mockReorderTracksMutation = { mutateAsync: vi.fn() };

vi.mock('../../hooks/usePlaylists', () => ({
  usePlaylist: () => ({
    data: mockState.playlistLoading ? undefined : (mockState.playlistError ? undefined : mockPlaylist),
    isLoading: mockState.playlistLoading,
    error: mockState.playlistError,
  }),
  usePlaylistTracks: () => ({
    data: mockState.tracksLoading ? undefined : { tracks: mockTracks },
    isLoading: mockState.tracksLoading,
  }),
  useUpdatePlaylist: () => mockUpdatePlaylistMutation,
  useDeletePlaylist: () => mockDeletePlaylistMutation,
  useRemoveTrackFromPlaylist: () => mockRemoveTrackMutation,
  useReorderPlaylistTracks: () => mockReorderTracksMutation,
}));

// Mock player context
const mockPlayQueue = vi.fn();
const mockSetShuffle = vi.fn();

vi.mock('@features/player', () => ({
  usePlayer: () => ({
    playQueue: mockPlayQueue,
    currentTrack: null,
    setShuffle: mockSetShuffle,
  }),
}));

// Mock shared hooks
vi.mock('@shared/hooks', () => ({
  useModal: () => ({
    isOpen: mockState.deleteModalOpen || mockState.editModalOpen,
    open: vi.fn(),
    close: vi.fn(),
  }),
  useDocumentTitle: vi.fn(),
  useDominantColor: vi.fn(() => '100, 150, 200'),
}));

// Mock playlist components
vi.mock('../../components', () => ({
  PlaylistCoverMosaic: () => <div data-testid="playlist-cover">Cover</div>,
  PlaylistOptionsMenu: ({ onEdit, onDelete }: {
    onEdit: () => void;
    onDelete: () => void;
  }) => (
    <div data-testid="options-menu">
      <button onClick={onEdit}>Edit</button>
      <button onClick={onDelete}>Delete</button>
    </div>
  ),
  EditPlaylistModal: () => <div data-testid="edit-modal">Edit Modal</div>,
  DeletePlaylistModal: () => <div data-testid="delete-modal">Delete Modal</div>,
}));

// Mock auth store
vi.mock('@shared/store', () => ({
  useAuthStore: () => 'timestamp-123',
}));

// Mock utility functions
vi.mock('@shared/utils/colorExtractor', () => ({
  extractDominantColor: vi.fn().mockResolvedValue('100, 100, 100'),
}));

vi.mock('@shared/utils/format', () => ({
  formatDuration: (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`,
}));

vi.mock('@shared/utils/avatar.utils', () => ({
  getUserAvatarUrl: () => '/avatar.jpg',
  handleAvatarError: vi.fn(),
}));

vi.mock('@shared/utils/track.utils', () => ({
  toPlayerTracks: (tracks: unknown[]) => tracks,
}));

vi.mock('@shared/utils/logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn() },
}));

const resetMockState = () => {
  mockState.playlistLoading = false;
  mockState.playlistError = null;
  mockState.tracksLoading = false;
  mockState.deleteModalOpen = false;
  mockState.editModalOpen = false;
};

describe('PlaylistDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockState();
  });

  describe('Layout', () => {
    it('should render sidebar', () => {
      render(<PlaylistDetailPage />);
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('should render header', () => {
      render(<PlaylistDetailPage />);
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading state when loading playlist', () => {
      mockState.playlistLoading = true;

      render(<PlaylistDetailPage />);

      expect(screen.getByText('Cargando playlist...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error state when playlist fails to load', () => {
      mockState.playlistError = new Error('Failed to load');

      render(<PlaylistDetailPage />);

      expect(screen.getByText('Error al cargar la playlist')).toBeInTheDocument();
    });
  });

  describe('Playlist Info', () => {
    it('should display playlist name', () => {
      render(<PlaylistDetailPage />);
      expect(screen.getByRole('heading', { name: 'My Test Playlist' })).toBeInTheDocument();
    });

    it('should display playlist description', () => {
      render(<PlaylistDetailPage />);
      expect(screen.getByText('A playlist for testing')).toBeInTheDocument();
    });

    it('should display type label', () => {
      render(<PlaylistDetailPage />);
      expect(screen.getByText('Playlist')).toBeInTheDocument();
    });

    it('should display public badge for public playlist', () => {
      render(<PlaylistDetailPage />);
      expect(screen.getByText('Pública')).toBeInTheDocument();
    });

    it('should display owner name', () => {
      render(<PlaylistDetailPage />);
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should display song count', () => {
      render(<PlaylistDetailPage />);
      expect(screen.getByText('3 canciones')).toBeInTheDocument();
    });

    it('should display duration', () => {
      render(<PlaylistDetailPage />);
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });
  });

  describe('Playlist Cover', () => {
    it('should render playlist cover mosaic', () => {
      render(<PlaylistDetailPage />);
      expect(screen.getByTestId('playlist-cover')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render play button', () => {
      render(<PlaylistDetailPage />);
      expect(screen.getByRole('button', { name: /reproducir/i })).toBeInTheDocument();
    });

    it('should render shuffle button', () => {
      render(<PlaylistDetailPage />);
      expect(screen.getByRole('button', { name: /aleatorio/i })).toBeInTheDocument();
    });

    it('should call playQueue when play button clicked', () => {
      render(<PlaylistDetailPage />);

      fireEvent.click(screen.getByRole('button', { name: /reproducir/i }));

      expect(mockSetShuffle).toHaveBeenCalledWith(false);
      expect(mockPlayQueue).toHaveBeenCalled();
    });

    it('should enable shuffle when shuffle button clicked', () => {
      render(<PlaylistDetailPage />);

      fireEvent.click(screen.getByRole('button', { name: /aleatorio/i }));

      expect(mockSetShuffle).toHaveBeenCalledWith(true);
      expect(mockPlayQueue).toHaveBeenCalled();
    });
  });

  describe('Options Menu', () => {
    it('should render options menu', () => {
      render(<PlaylistDetailPage />);
      expect(screen.getByTestId('options-menu')).toBeInTheDocument();
    });
  });

  describe('Track List', () => {
    it('should render track list', () => {
      render(<PlaylistDetailPage />);
      expect(screen.getByTestId('track-list')).toBeInTheDocument();
    });

    it('should display track items', () => {
      render(<PlaylistDetailPage />);
      const trackItems = screen.getAllByTestId('track-item');
      expect(trackItems).toHaveLength(3);
    });

    it('should display track titles', () => {
      render(<PlaylistDetailPage />);
      expect(screen.getByText('Track One')).toBeInTheDocument();
      expect(screen.getByText('Track Two')).toBeInTheDocument();
      expect(screen.getByText('Track Three')).toBeInTheDocument();
    });

    it('should call removeTrackMutation when remove clicked', async () => {
      render(<PlaylistDetailPage />);

      const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
      fireEvent.click(removeButtons[0]);

      await waitFor(() => {
        expect(mockRemoveTrackMutation.mutateAsync).toHaveBeenCalledWith({
          playlistId: 'playlist-123',
          trackId: 'track-1',
        });
      });
    });

    it('should show loading tracks message when loading', () => {
      mockState.tracksLoading = true;

      render(<PlaylistDetailPage />);

      expect(screen.getByText('Cargando canciones...')).toBeInTheDocument();
    });
  });

  describe('Owner Link', () => {
    it('should render owner link', () => {
      render(<PlaylistDetailPage />);
      const ownerLink = screen.getByRole('link');
      expect(ownerLink).toHaveAttribute('href', '/user/user-1');
    });

    it('should render owner avatar', () => {
      render(<PlaylistDetailPage />);
      const avatar = screen.getByAltText('Test User');
      expect(avatar).toBeInTheDocument();
    });
  });
});
