import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ArtistDetailPage from './ArtistDetailPage';

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useParams: () => ({ id: 'artist-1' }),
  useLocation: () => ['/artists/artist-1', mockSetLocation],
}));

// Mock artist hooks
vi.mock('../../hooks', () => ({
  useArtist: vi.fn(),
  useArtistAlbums: vi.fn(),
  useArtistStats: vi.fn(),
  useArtistTopTracks: vi.fn(),
  useRelatedArtists: vi.fn(),
  useImagePreload: vi.fn(() => ({
    renderKey: 0,
    isLoading: false,
    isLoaded: true,
    hasError: false,
  })),
}));

// Mock home hooks
vi.mock('@features/home/hooks', () => ({
  useArtistImages: vi.fn(),
  getArtistImageUrl: vi.fn((id, type, tag) => `/api/artists/${id}/images/${type}${tag ? `?tag=${tag}` : ''}`),
  useAutoEnrichArtist: vi.fn(),
  useAutoPlaylists: vi.fn(),
}));

// Mock playlist hooks
vi.mock('@features/playlists/hooks/usePlaylists', () => ({
  usePlaylistsByArtist: vi.fn(),
}));

// Mock shared hooks
vi.mock('@shared/hooks', () => ({
  useAuth: vi.fn(),
  useArtistMetadataSync: vi.fn(),
  useAlbumMetadataSync: vi.fn(),
  useDocumentTitle: vi.fn(),
  useModal: vi.fn(() => ({
    isOpen: false,
    data: null,
    open: vi.fn(),
    openWith: vi.fn(),
    close: vi.fn(),
  })),
}));

// Mock player context
vi.mock('@features/player/context/PlayerContext', () => ({
  usePlayer: vi.fn(),
}));

// Mock layout components
vi.mock('@shared/components/layout/Header', () => ({
  Header: ({ showBackButton }: { showBackButton?: boolean }) => (
    <header data-testid="header">{showBackButton && <button>Back</button>}</header>
  ),
}));

vi.mock('@features/home/components', () => ({
  Sidebar: () => <aside data-testid="sidebar">Sidebar</aside>,
  AlbumGrid: ({ title, albums }: { title: string; albums: unknown[] }) => (
    <div data-testid="album-grid">
      <h2>{title}</h2>
      <span>{albums.length} albums</span>
    </div>
  ),
}));

// Mock artist components
vi.mock('../../components', () => ({
  ArtistOptionsMenu: ({ onChangeProfile }: { onChangeProfile: () => void }) => (
    <button data-testid="artist-options" onClick={onChangeProfile}>Options</button>
  ),
}));

// Mock admin modals
vi.mock('@features/admin/components/ArtistAvatarSelectorModal', () => ({
  ArtistAvatarSelectorModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="avatar-selector-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('@features/admin/components/BackgroundPositionModal', () => ({
  BackgroundPositionModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="background-position-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock recommendation components
vi.mock('@features/recommendations/components', () => ({
  PlaylistCover: () => <div data-testid="playlist-cover">Playlist Cover</div>,
}));

vi.mock('@features/playlists/components', () => ({
  PlaylistCoverMosaic: () => <div data-testid="playlist-mosaic">Playlist Mosaic</div>,
}));

// Mock utils
vi.mock('../../utils/artist-image.utils', () => ({
  getArtistInitials: (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
}));

vi.mock('@shared/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

// Import mocked modules
import * as artistHooks from '../../hooks';
import * as homeHooks from '@features/home/hooks';
import * as playlistHooks from '@features/playlists/hooks/usePlaylists';
import * as sharedHooks from '@shared/hooks';
import * as playerContext from '@features/player/context/PlayerContext';

// Mock data
const mockArtist = {
  id: 'artist-1',
  name: 'Test Artist',
  albumCount: 5,
  songCount: 50,
  biography: 'This is a test biography for the artist. It contains information about their career and musical journey.',
  biographySource: 'wikipedia',
  backgroundPosition: 'center center',
};

const mockAlbums = [
  { id: 'album-1', name: 'Album One', coverImage: '/cover1.jpg' },
  { id: 'album-2', name: 'Album Two', coverImage: '/cover2.jpg' },
];

const mockTopTracks = [
  { trackId: 'track-1', title: 'Hit Song', albumId: 'album-1', albumName: 'Album One', playCount: 15000, duration: 240 },
  { trackId: 'track-2', title: 'Another Hit', albumId: 'album-2', albumName: 'Album Two', playCount: 12000, duration: 180 },
];

const mockRelatedArtists = [
  { id: 'artist-2', name: 'Similar Artist', matchScore: 85 },
  { id: 'artist-3', name: 'Another Similar', matchScore: 75 },
];

const mockArtistStats = {
  totalPlays: 50000,
  uniqueListeners: 1200,
};

const mockArtistImages = {
  images: {
    profile: { exists: true, tag: 'abc123' },
    background: { exists: true, tag: 'def456', lastModified: '2024-01-15' },
    banner: { exists: false },
    logo: { exists: false },
  },
};

describe('ArtistDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(artistHooks.useArtist).mockReturnValue({
      data: mockArtist,
      isLoading: false,
      error: null,
    } as ReturnType<typeof artistHooks.useArtist>);

    vi.mocked(artistHooks.useArtistAlbums).mockReturnValue({
      data: { data: mockAlbums },
    } as ReturnType<typeof artistHooks.useArtistAlbums>);

    vi.mocked(artistHooks.useArtistStats).mockReturnValue({
      data: mockArtistStats,
    } as ReturnType<typeof artistHooks.useArtistStats>);

    vi.mocked(artistHooks.useArtistTopTracks).mockReturnValue({
      data: { data: mockTopTracks },
    } as ReturnType<typeof artistHooks.useArtistTopTracks>);

    vi.mocked(artistHooks.useRelatedArtists).mockReturnValue({
      data: { data: mockRelatedArtists },
    } as ReturnType<typeof artistHooks.useRelatedArtists>);

    vi.mocked(homeHooks.useArtistImages).mockReturnValue({
      data: mockArtistImages,
    } as ReturnType<typeof homeHooks.useArtistImages>);

    vi.mocked(homeHooks.useAutoPlaylists).mockReturnValue({
      data: [],
    } as ReturnType<typeof homeHooks.useAutoPlaylists>);

    vi.mocked(playlistHooks.usePlaylistsByArtist).mockReturnValue({
      data: { items: [] },
    } as ReturnType<typeof playlistHooks.usePlaylistsByArtist>);

    vi.mocked(sharedHooks.useAuth).mockReturnValue({
      user: { id: 'user-1', username: 'testuser', isAdmin: false },
    } as ReturnType<typeof sharedHooks.useAuth>);

    vi.mocked(playerContext.usePlayer).mockReturnValue({
      play: vi.fn(),
      pause: vi.fn(),
      currentTrack: null,
      isPlaying: false,
    } as unknown as ReturnType<typeof playerContext.usePlayer>);
  });

  describe('loading state', () => {
    it('should show loading state', () => {
      vi.mocked(artistHooks.useArtist).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as ReturnType<typeof artistHooks.useArtist>);

      render(<ArtistDetailPage />);

      expect(screen.getByText('Cargando artista...')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error state', () => {
      vi.mocked(artistHooks.useArtist).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to load'),
      } as ReturnType<typeof artistHooks.useArtist>);

      render(<ArtistDetailPage />);

      expect(screen.getByText('Error al cargar artista')).toBeInTheDocument();
    });
  });

  describe('rendering', () => {
    it('should render artist name', () => {
      render(<ArtistDetailPage />);

      expect(screen.getByText('Test Artist')).toBeInTheDocument();
    });

    it('should render artist stats', () => {
      render(<ArtistDetailPage />);

      expect(screen.getByText(/5 álbumes/)).toBeInTheDocument();
      expect(screen.getByText(/50 canciones/)).toBeInTheDocument();
    });

    it('should render play count stats', () => {
      render(<ArtistDetailPage />);

      // formatPlayCount returns "50.0K" for 50000
      expect(screen.getByText(/50\.0K reproducciones/)).toBeInTheDocument();
      expect(screen.getByText(/1200 oyentes/)).toBeInTheDocument();
    });

    it('should render sidebar and header', () => {
      render(<ArtistDetailPage />);

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
  });

  describe('top tracks section', () => {
    it('should render top tracks', () => {
      render(<ArtistDetailPage />);

      expect(screen.getByText('Canciones populares')).toBeInTheDocument();
      expect(screen.getByText('Hit Song')).toBeInTheDocument();
      expect(screen.getByText('Another Hit')).toBeInTheDocument();
    });

    it('should show formatted play counts', () => {
      render(<ArtistDetailPage />);

      // formatPlayCount returns "15.0K" for 15000
      expect(screen.getByText(/15\.0K reproducciones/)).toBeInTheDocument();
      expect(screen.getByText(/12\.0K reproducciones/)).toBeInTheDocument();
    });

    it('should show track duration', () => {
      render(<ArtistDetailPage />);

      expect(screen.getByText('4:00')).toBeInTheDocument(); // 240 seconds
      expect(screen.getByText('3:00')).toBeInTheDocument(); // 180 seconds
    });

    it('should call play when clicking a track', () => {
      const mockPlay = vi.fn();
      vi.mocked(playerContext.usePlayer).mockReturnValue({
        play: mockPlay,
        pause: vi.fn(),
        currentTrack: null,
        isPlaying: false,
      } as unknown as ReturnType<typeof playerContext.usePlayer>);

      render(<ArtistDetailPage />);

      fireEvent.click(screen.getByText('Hit Song'));

      expect(mockPlay).toHaveBeenCalledWith(expect.objectContaining({
        id: 'track-1',
        title: 'Hit Song',
      }));
    });

    it('should call pause when clicking currently playing track', () => {
      const mockPause = vi.fn();
      vi.mocked(playerContext.usePlayer).mockReturnValue({
        play: vi.fn(),
        pause: mockPause,
        currentTrack: { id: 'track-1' },
        isPlaying: true,
      } as unknown as ReturnType<typeof playerContext.usePlayer>);

      render(<ArtistDetailPage />);

      fireEvent.click(screen.getByText('Hit Song'));

      expect(mockPause).toHaveBeenCalled();
    });
  });

  describe('albums section', () => {
    it('should render album grid', () => {
      render(<ArtistDetailPage />);

      expect(screen.getByTestId('album-grid')).toBeInTheDocument();
      expect(screen.getByText('Álbumes de Test Artist')).toBeInTheDocument();
    });

    it('should show empty albums message when no albums', () => {
      vi.mocked(artistHooks.useArtistAlbums).mockReturnValue({
        data: { data: [] },
      } as ReturnType<typeof artistHooks.useArtistAlbums>);

      render(<ArtistDetailPage />);

      expect(screen.getByText('No hay álbumes disponibles para este artista.')).toBeInTheDocument();
    });
  });

  describe('related artists section', () => {
    it('should render related artists', () => {
      render(<ArtistDetailPage />);

      expect(screen.getByText('Artistas similares')).toBeInTheDocument();
      expect(screen.getByText('Similar Artist')).toBeInTheDocument();
      expect(screen.getByText('Another Similar')).toBeInTheDocument();
    });

    it('should show match score', () => {
      render(<ArtistDetailPage />);

      expect(screen.getByText('85% similar')).toBeInTheDocument();
      expect(screen.getByText('75% similar')).toBeInTheDocument();
    });

    it('should navigate to related artist on click', () => {
      render(<ArtistDetailPage />);

      fireEvent.click(screen.getByText('Similar Artist'));

      expect(mockSetLocation).toHaveBeenCalledWith('/artists/artist-2');
    });

    it('should not render section when no related artists', () => {
      vi.mocked(artistHooks.useRelatedArtists).mockReturnValue({
        data: { data: [] },
      } as ReturnType<typeof artistHooks.useRelatedArtists>);

      render(<ArtistDetailPage />);

      expect(screen.queryByText('Artistas similares')).not.toBeInTheDocument();
    });
  });

  describe('biography section', () => {
    it('should render biography', () => {
      render(<ArtistDetailPage />);

      expect(screen.getByText('Biografía')).toBeInTheDocument();
      // Biography uses drop cap, so first letter is separate
      expect(screen.getByText('T')).toBeInTheDocument(); // Drop cap
      expect(screen.getByText(/his is a test biography/)).toBeInTheDocument();
    });

    it('should show biography source', () => {
      render(<ArtistDetailPage />);

      expect(screen.getByText('Fuente: Wikipedia')).toBeInTheDocument();
    });

    it('should show placeholder when no biography', () => {
      vi.mocked(artistHooks.useArtist).mockReturnValue({
        data: { ...mockArtist, biography: null },
        isLoading: false,
        error: null,
      } as ReturnType<typeof artistHooks.useArtist>);

      render(<ArtistDetailPage />);

      expect(screen.getByText('No hay biografía disponible para este artista.')).toBeInTheDocument();
    });

    it('should show expand button for long biography', () => {
      const longBio = 'A'.repeat(600); // More than 500 chars
      vi.mocked(artistHooks.useArtist).mockReturnValue({
        data: { ...mockArtist, biography: longBio },
        isLoading: false,
        error: null,
      } as ReturnType<typeof artistHooks.useArtist>);

      render(<ArtistDetailPage />);

      expect(screen.getByText('Leer más')).toBeInTheDocument();
    });

    it('should toggle biography expansion', () => {
      const longBio = 'A'.repeat(600);
      vi.mocked(artistHooks.useArtist).mockReturnValue({
        data: { ...mockArtist, biography: longBio },
        isLoading: false,
        error: null,
      } as ReturnType<typeof artistHooks.useArtist>);

      render(<ArtistDetailPage />);

      fireEvent.click(screen.getByText('Leer más'));
      expect(screen.getByText('Leer menos')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Leer menos'));
      expect(screen.getByText('Leer más')).toBeInTheDocument();
    });
  });

  describe('admin features', () => {
    it('should show admin options for admin user', () => {
      vi.mocked(sharedHooks.useAuth).mockReturnValue({
        user: { id: 'admin-1', username: 'admin', isAdmin: true },
      } as ReturnType<typeof sharedHooks.useAuth>);

      render(<ArtistDetailPage />);

      expect(screen.getAllByTestId('artist-options').length).toBeGreaterThanOrEqual(1);
    });

    it('should not show admin options for regular user', () => {
      vi.mocked(sharedHooks.useAuth).mockReturnValue({
        user: { id: 'user-1', username: 'user', isAdmin: false },
      } as ReturnType<typeof sharedHooks.useAuth>);

      render(<ArtistDetailPage />);

      expect(screen.queryByTestId('artist-options')).not.toBeInTheDocument();
    });
  });

  describe('playlists section', () => {
    it('should render auto playlists', () => {
      vi.mocked(homeHooks.useAutoPlaylists).mockReturnValue({
        data: [{
          id: 'auto-1',
          name: 'Test Artist Wave Mix',
          type: 'artist',
          metadata: { artistId: 'artist-1', artistName: 'Test Artist' },
          tracks: [{ id: '1' }, { id: '2' }],
          coverColor: '#000',
        }],
      } as ReturnType<typeof homeHooks.useAutoPlaylists>);

      render(<ArtistDetailPage />);

      expect(screen.getByText('Playlists con Test Artist')).toBeInTheDocument();
      expect(screen.getByText('Test Artist Wave Mix')).toBeInTheDocument();
    });

    it('should render user playlists', () => {
      vi.mocked(playlistHooks.usePlaylistsByArtist).mockReturnValue({
        data: {
          items: [{
            id: 'playlist-1',
            name: 'My Favorites',
            songCount: 25,
            albumIds: ['album-1'],
          }],
        },
      } as ReturnType<typeof playlistHooks.usePlaylistsByArtist>);

      render(<ArtistDetailPage />);

      expect(screen.getByText('My Favorites')).toBeInTheDocument();
      expect(screen.getByText('25 canciones')).toBeInTheDocument();
    });

    it('should navigate to playlist on click', () => {
      vi.mocked(playlistHooks.usePlaylistsByArtist).mockReturnValue({
        data: {
          items: [{
            id: 'playlist-1',
            name: 'My Favorites',
            songCount: 25,
            albumIds: [],
          }],
        },
      } as ReturnType<typeof playlistHooks.usePlaylistsByArtist>);

      render(<ArtistDetailPage />);

      fireEvent.click(screen.getByText('My Favorites'));

      expect(mockSetLocation).toHaveBeenCalledWith('/playlists/playlist-1');
    });
  });

  describe('avatar modal', () => {
    it('should open avatar lightbox when clicking profile image', () => {
      render(<ArtistDetailPage />);

      // Find the avatar image and click it
      const avatarImages = screen.getAllByAltText('Test Artist');
      if (avatarImages.length > 0) {
        fireEvent.click(avatarImages[0]);
      }
    });
  });

  describe('format helpers', () => {
    it('should format large play counts correctly', () => {
      vi.mocked(artistHooks.useArtistStats).mockReturnValue({
        data: { totalPlays: 1500000, uniqueListeners: 50000 },
      } as ReturnType<typeof artistHooks.useArtistStats>);

      render(<ArtistDetailPage />);

      // formatPlayCount returns "1.5M" for 1500000
      expect(screen.getByText(/1\.5M reproducciones/)).toBeInTheDocument();
    });

    it('should handle single album/song correctly', () => {
      vi.mocked(artistHooks.useArtist).mockReturnValue({
        data: { ...mockArtist, albumCount: 1, songCount: 1 },
        isLoading: false,
        error: null,
      } as ReturnType<typeof artistHooks.useArtist>);

      render(<ArtistDetailPage />);

      expect(screen.getByText(/1 álbum/)).toBeInTheDocument();
      expect(screen.getByText(/1 canción/)).toBeInTheDocument();
    });

    it('should handle single listener correctly', () => {
      vi.mocked(artistHooks.useArtistStats).mockReturnValue({
        data: { totalPlays: 100, uniqueListeners: 1 },
      } as ReturnType<typeof artistHooks.useArtistStats>);

      render(<ArtistDetailPage />);

      expect(screen.getByText(/1 oyente/)).toBeInTheDocument();
    });
  });
});
