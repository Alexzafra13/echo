import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PublicProfilePage } from './PublicProfilePage';

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useParams: () => ({ userId: 'user-123' }),
  useLocation: () => ['/profile/user-123', mockSetLocation],
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className} onClick={(e) => { e.preventDefault(); mockSetLocation(href); }}>
      {children}
    </a>
  ),
}));

// Mock react-query
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

// Mock public profile hooks
vi.mock('../../hooks', () => ({
  usePublicProfile: vi.fn(),
}));

vi.mock('../../hooks/useProfileListeningSSE', () => ({
  useProfileListeningSSE: vi.fn(),
}));

// Mock social hooks
const mockSendFriendRequest = vi.fn();
const mockAcceptFriendRequest = vi.fn();
const mockRemoveFriendship = vi.fn();

vi.mock('@features/social/hooks', () => ({
  useSendFriendRequest: () => ({
    mutateAsync: mockSendFriendRequest,
    isPending: false,
  }),
  useAcceptFriendRequest: () => ({
    mutateAsync: mockAcceptFriendRequest,
    isPending: false,
  }),
  useRemoveFriendship: () => ({
    mutateAsync: mockRemoveFriendship,
    isPending: false,
  }),
}));

// Mock layout components
vi.mock('@shared/components/layout/Header', () => ({
  Header: ({ showBackButton }: { showBackButton?: boolean }) => (
    <header data-testid="header">{showBackButton && <button>Back</button>}</header>
  ),
}));

vi.mock('@features/home/components', () => ({
  Sidebar: () => <aside data-testid="sidebar">Sidebar</aside>,
}));

// Mock playlist components
vi.mock('@features/playlists/components', () => ({
  PlaylistCoverMosaic: () => (
    <div data-testid="playlist-mosaic">Cover</div>
  ),
}));

// Mock utils
vi.mock('@shared/utils/format', () => ({
  formatDuration: (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },
}));

vi.mock('@shared/utils/colorExtractor', () => ({
  extractDominantColor: vi.fn().mockResolvedValue('#4a3470'),
}));

// Import mocked modules
import { usePublicProfile } from '../../hooks';

// Mock data
const mockUser = {
  id: 'user-123',
  username: 'testuser',
  name: 'Test User',
  avatarUrl: '/avatar.jpg',
  bio: 'This is my bio',
  isPublicProfile: true,
};

const mockTopTracks = [
  { id: 'track-1', title: 'Hit Song', artistName: 'Artist One', albumId: 'album-1', coverUrl: '/cover1.jpg', playCount: 15000 },
  { id: 'track-2', title: 'Another Hit', artistName: 'Artist Two', albumId: 'album-2', coverUrl: '/cover2.jpg', playCount: 12000 },
];

const mockTopArtists = [
  { id: 'artist-1', name: 'Popular Artist', imageUrl: '/artist1.jpg' },
  { id: 'artist-2', name: 'Another Artist', imageUrl: '/artist2.jpg' },
];

const mockTopAlbums = [
  { id: 'album-1', name: 'Great Album', artistName: 'Artist One', coverUrl: '/album1.jpg', playCount: 5000 },
  { id: 'album-2', name: 'Best Album', artistName: 'Artist Two', coverUrl: '/album2.jpg', playCount: 3000 },
];

const mockPlaylists = [
  { id: 'playlist-1', name: 'My Favorites', songCount: 25, duration: 3600, albumIds: ['album-1', 'album-2'] },
  { id: 'playlist-2', name: 'Road Trip', songCount: 50, duration: 7200, albumIds: ['album-3'] },
];

const mockSettings = {
  showTopTracks: true,
  showTopArtists: true,
  showTopAlbums: true,
  showPlaylists: true,
};

const mockSocial = {
  friendshipStatus: 'none' as const,
  friendshipId: undefined,
  listeningNow: null,
  stats: {
    totalPlays: 50000,
    friendCount: 42,
  },
};

const mockProfile = {
  user: mockUser,
  topTracks: mockTopTracks,
  topArtists: mockTopArtists,
  topAlbums: mockTopAlbums,
  playlists: mockPlaylists,
  settings: mockSettings,
  social: mockSocial,
};

describe('PublicProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePublicProfile).mockReturnValue({
      data: mockProfile,
      isLoading: false,
      error: null,
    } as ReturnType<typeof usePublicProfile>);
  });

  describe('loading state', () => {
    it('should show loading state', () => {
      vi.mocked(usePublicProfile).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as ReturnType<typeof usePublicProfile>);

      render(<PublicProfilePage />);

      expect(screen.getByText('Cargando perfil...')).toBeInTheDocument();
    });

    it('should render sidebar and header while loading', () => {
      vi.mocked(usePublicProfile).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as ReturnType<typeof usePublicProfile>);

      render(<PublicProfilePage />);

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error state when user not found', () => {
      vi.mocked(usePublicProfile).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('User not found'),
      } as ReturnType<typeof usePublicProfile>);

      render(<PublicProfilePage />);

      expect(screen.getByText('Usuario no encontrado')).toBeInTheDocument();
      expect(screen.getByText('El usuario que buscas no existe o ha sido eliminado.')).toBeInTheDocument();
    });
  });

  describe('private profile', () => {
    it('should show private profile message', () => {
      vi.mocked(usePublicProfile).mockReturnValue({
        data: {
          ...mockProfile,
          user: { ...mockUser, isPublicProfile: false },
        },
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePublicProfile>);

      render(<PublicProfilePage />);

      expect(screen.getByText('Perfil privado')).toBeInTheDocument();
      expect(screen.getByText('Este usuario ha configurado su perfil como privado.')).toBeInTheDocument();
    });

    it('should still show user name on private profile', () => {
      vi.mocked(usePublicProfile).mockReturnValue({
        data: {
          ...mockProfile,
          user: { ...mockUser, isPublicProfile: false },
        },
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePublicProfile>);

      render(<PublicProfilePage />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should show friend button on private profile', () => {
      vi.mocked(usePublicProfile).mockReturnValue({
        data: {
          ...mockProfile,
          user: { ...mockUser, isPublicProfile: false },
        },
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePublicProfile>);

      render(<PublicProfilePage />);

      expect(screen.getByText('Añadir amigo')).toBeInTheDocument();
    });
  });

  describe('public profile rendering', () => {
    it('should render user name', () => {
      render(<PublicProfilePage />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should render username', () => {
      render(<PublicProfilePage />);

      expect(screen.getByText('@testuser')).toBeInTheDocument();
    });

    it('should render bio', () => {
      render(<PublicProfilePage />);

      expect(screen.getByText('This is my bio')).toBeInTheDocument();
    });

    it('should render avatar image', () => {
      render(<PublicProfilePage />);

      const avatar = screen.getByAltText('Test User');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', '/avatar.jpg');
    });

    it('should render avatar placeholder when no avatar', () => {
      vi.mocked(usePublicProfile).mockReturnValue({
        data: {
          ...mockProfile,
          user: { ...mockUser, avatarUrl: undefined },
        },
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePublicProfile>);

      render(<PublicProfilePage />);

      expect(screen.getByText('TE')).toBeInTheDocument(); // Initials
    });

    it('should render play count stats', () => {
      render(<PublicProfilePage />);

      expect(screen.getByText('50.0K')).toBeInTheDocument();
      // Multiple elements have "reproducciones", check the meta section specifically
      const metaSection = document.querySelector('.publicProfilePage__meta');
      expect(metaSection).toHaveTextContent('reproducciones');
    });

    it('should render friend count', () => {
      render(<PublicProfilePage />);

      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText(/amigos/)).toBeInTheDocument();
    });

    it('should render sidebar and header', () => {
      render(<PublicProfilePage />);

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
  });

  describe('top tracks section', () => {
    it('should render top tracks', () => {
      render(<PublicProfilePage />);

      expect(screen.getByText('Canciones más escuchadas')).toBeInTheDocument();
      expect(screen.getByText('Hit Song')).toBeInTheDocument();
      expect(screen.getByText('Another Hit')).toBeInTheDocument();
    });

    it('should render track numbers', () => {
      render(<PublicProfilePage />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should show formatted play counts', () => {
      render(<PublicProfilePage />);

      expect(screen.getByText(/15\.0K reproducciones/)).toBeInTheDocument();
      expect(screen.getByText(/12\.0K reproducciones/)).toBeInTheDocument();
    });

    it('should not render tracks section when disabled', () => {
      vi.mocked(usePublicProfile).mockReturnValue({
        data: {
          ...mockProfile,
          settings: { ...mockSettings, showTopTracks: false },
        },
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePublicProfile>);

      render(<PublicProfilePage />);

      expect(screen.queryByText('Canciones más escuchadas')).not.toBeInTheDocument();
    });

    it('should not render tracks section when empty', () => {
      vi.mocked(usePublicProfile).mockReturnValue({
        data: {
          ...mockProfile,
          topTracks: [],
        },
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePublicProfile>);

      render(<PublicProfilePage />);

      expect(screen.queryByText('Canciones más escuchadas')).not.toBeInTheDocument();
    });

    it('should navigate to album when clicking track', () => {
      render(<PublicProfilePage />);

      fireEvent.click(screen.getByText('Hit Song'));

      expect(mockSetLocation).toHaveBeenCalledWith('/album/album-1');
    });
  });

  describe('top artists section', () => {
    it('should render top artists', () => {
      render(<PublicProfilePage />);

      expect(screen.getByText('Artistas más escuchados')).toBeInTheDocument();
      expect(screen.getByText('Popular Artist')).toBeInTheDocument();
      expect(screen.getByText('Another Artist')).toBeInTheDocument();
    });

    it('should render artist images', () => {
      render(<PublicProfilePage />);

      const artistImage = screen.getByAltText('Popular Artist');
      expect(artistImage).toHaveAttribute('src', '/artist1.jpg');
    });

    it('should not render artists section when disabled', () => {
      vi.mocked(usePublicProfile).mockReturnValue({
        data: {
          ...mockProfile,
          settings: { ...mockSettings, showTopArtists: false },
        },
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePublicProfile>);

      render(<PublicProfilePage />);

      expect(screen.queryByText('Artistas más escuchados')).not.toBeInTheDocument();
    });

    it('should navigate to artist page when clicking', () => {
      render(<PublicProfilePage />);

      fireEvent.click(screen.getByText('Popular Artist'));

      expect(mockSetLocation).toHaveBeenCalledWith('/artists/artist-1');
    });
  });

  describe('top albums section', () => {
    it('should render top albums', () => {
      render(<PublicProfilePage />);

      expect(screen.getByText('Álbumes más escuchados')).toBeInTheDocument();
      expect(screen.getByText('Great Album')).toBeInTheDocument();
      expect(screen.getByText('Best Album')).toBeInTheDocument();
    });

    it('should render album artist names', () => {
      render(<PublicProfilePage />);

      expect(screen.getAllByText('Artist One').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Artist Two').length).toBeGreaterThanOrEqual(1);
    });

    it('should render album play counts', () => {
      render(<PublicProfilePage />);

      expect(screen.getByText('5000 reproducciones')).toBeInTheDocument();
      expect(screen.getByText('3000 reproducciones')).toBeInTheDocument();
    });

    it('should not render albums section when disabled', () => {
      vi.mocked(usePublicProfile).mockReturnValue({
        data: {
          ...mockProfile,
          settings: { ...mockSettings, showTopAlbums: false },
        },
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePublicProfile>);

      render(<PublicProfilePage />);

      expect(screen.queryByText('Álbumes más escuchados')).not.toBeInTheDocument();
    });

    it('should navigate to album page when clicking', () => {
      render(<PublicProfilePage />);

      fireEvent.click(screen.getByText('Great Album'));

      expect(mockSetLocation).toHaveBeenCalledWith('/album/album-1');
    });
  });

  describe('playlists section', () => {
    it('should render playlists', () => {
      render(<PublicProfilePage />);

      expect(screen.getByText('Playlists públicas')).toBeInTheDocument();
      expect(screen.getByText('My Favorites')).toBeInTheDocument();
      expect(screen.getByText('Road Trip')).toBeInTheDocument();
    });

    it('should render playlist info', () => {
      render(<PublicProfilePage />);

      expect(screen.getByText('25 canciones · 60:00')).toBeInTheDocument();
      expect(screen.getByText('50 canciones · 120:00')).toBeInTheDocument();
    });

    it('should not render playlists section when disabled', () => {
      vi.mocked(usePublicProfile).mockReturnValue({
        data: {
          ...mockProfile,
          settings: { ...mockSettings, showPlaylists: false },
        },
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePublicProfile>);

      render(<PublicProfilePage />);

      expect(screen.queryByText('Playlists públicas')).not.toBeInTheDocument();
    });

    it('should navigate to playlist page when clicking', () => {
      render(<PublicProfilePage />);

      fireEvent.click(screen.getByText('My Favorites'));

      expect(mockSetLocation).toHaveBeenCalledWith('/playlists/playlist-1');
    });
  });

  describe('empty state', () => {
    it('should show empty state when no content', () => {
      vi.mocked(usePublicProfile).mockReturnValue({
        data: {
          ...mockProfile,
          topTracks: [],
          topArtists: [],
          topAlbums: [],
          playlists: [],
        },
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePublicProfile>);

      render(<PublicProfilePage />);

      expect(screen.getByText('Este usuario aún no tiene actividad para mostrar.')).toBeInTheDocument();
    });
  });

  describe('friend button', () => {
    it('should render add friend button when not friends', () => {
      render(<PublicProfilePage />);

      expect(screen.getByText('Añadir amigo')).toBeInTheDocument();
    });

    it('should call sendFriendRequest when clicking add friend', async () => {
      render(<PublicProfilePage />);

      fireEvent.click(screen.getByText('Añadir amigo'));

      await waitFor(() => {
        expect(mockSendFriendRequest).toHaveBeenCalledWith('user-123');
      });
    });

    it('should show pending state when request sent', () => {
      vi.mocked(usePublicProfile).mockReturnValue({
        data: {
          ...mockProfile,
          social: { ...mockSocial, friendshipStatus: 'pending_sent', friendshipId: 'friendship-1' },
        },
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePublicProfile>);

      render(<PublicProfilePage />);

      expect(screen.getByText('Solicitud enviada')).toBeInTheDocument();
    });

    it('should show accept/reject buttons when request received', () => {
      vi.mocked(usePublicProfile).mockReturnValue({
        data: {
          ...mockProfile,
          social: { ...mockSocial, friendshipStatus: 'pending_received', friendshipId: 'friendship-1' },
        },
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePublicProfile>);

      render(<PublicProfilePage />);

      expect(screen.getByText('Aceptar')).toBeInTheDocument();
      expect(screen.getByLabelText('Rechazar solicitud')).toBeInTheDocument();
    });

    it('should call acceptFriendRequest when clicking accept', async () => {
      vi.mocked(usePublicProfile).mockReturnValue({
        data: {
          ...mockProfile,
          social: { ...mockSocial, friendshipStatus: 'pending_received', friendshipId: 'friendship-1' },
        },
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePublicProfile>);

      render(<PublicProfilePage />);

      fireEvent.click(screen.getByText('Aceptar'));

      await waitFor(() => {
        expect(mockAcceptFriendRequest).toHaveBeenCalledWith('friendship-1');
      });
    });

    it('should call removeFriendship when clicking reject', async () => {
      vi.mocked(usePublicProfile).mockReturnValue({
        data: {
          ...mockProfile,
          social: { ...mockSocial, friendshipStatus: 'pending_received', friendshipId: 'friendship-1' },
        },
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePublicProfile>);

      render(<PublicProfilePage />);

      fireEvent.click(screen.getByLabelText('Rechazar solicitud'));

      await waitFor(() => {
        expect(mockRemoveFriendship).toHaveBeenCalledWith('friendship-1');
      });
    });

    it('should show friends badge when already friends', () => {
      vi.mocked(usePublicProfile).mockReturnValue({
        data: {
          ...mockProfile,
          social: { ...mockSocial, friendshipStatus: 'accepted' },
        },
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePublicProfile>);

      render(<PublicProfilePage />);

      expect(screen.getByText('Amigos')).toBeInTheDocument();
    });

    it('should not render friend button for own profile', () => {
      vi.mocked(usePublicProfile).mockReturnValue({
        data: {
          ...mockProfile,
          social: { ...mockSocial, friendshipStatus: 'self' },
        },
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePublicProfile>);

      render(<PublicProfilePage />);

      expect(screen.queryByText('Añadir amigo')).not.toBeInTheDocument();
      expect(screen.queryByText('Amigos')).not.toBeInTheDocument();
    });
  });

  describe('listening now badge', () => {
    it('should render listening now badge when user is listening', () => {
      vi.mocked(usePublicProfile).mockReturnValue({
        data: {
          ...mockProfile,
          social: {
            ...mockSocial,
            listeningNow: {
              trackTitle: 'Currently Playing',
              artistName: 'Current Artist',
              albumId: 'album-current',
              coverUrl: '/current-cover.jpg',
            },
          },
        },
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePublicProfile>);

      render(<PublicProfilePage />);

      expect(screen.getByText('Escuchando ahora')).toBeInTheDocument();
      expect(screen.getByText('Currently Playing')).toBeInTheDocument();
      expect(screen.getByText('Current Artist')).toBeInTheDocument();
    });

    it('should not render listening now badge when not listening', () => {
      render(<PublicProfilePage />);

      expect(screen.queryByText('Escuchando ahora')).not.toBeInTheDocument();
    });

    it('should navigate to album when clicking listening now', () => {
      vi.mocked(usePublicProfile).mockReturnValue({
        data: {
          ...mockProfile,
          social: {
            ...mockSocial,
            listeningNow: {
              trackTitle: 'Currently Playing',
              artistName: 'Current Artist',
              albumId: 'album-current',
              coverUrl: '/current-cover.jpg',
            },
          },
        },
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePublicProfile>);

      render(<PublicProfilePage />);

      fireEvent.click(screen.getByText('Currently Playing'));

      expect(mockSetLocation).toHaveBeenCalledWith('/album/album-current');
    });
  });

  describe('helper functions', () => {
    it('should format large play counts with K suffix', () => {
      vi.mocked(usePublicProfile).mockReturnValue({
        data: {
          ...mockProfile,
          social: { ...mockSocial, stats: { totalPlays: 1500, friendCount: 10 } },
        },
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePublicProfile>);

      render(<PublicProfilePage />);

      expect(screen.getByText('1.5K')).toBeInTheDocument();
    });

    it('should format very large play counts with M suffix', () => {
      vi.mocked(usePublicProfile).mockReturnValue({
        data: {
          ...mockProfile,
          social: { ...mockSocial, stats: { totalPlays: 1500000, friendCount: 10 } },
        },
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePublicProfile>);

      render(<PublicProfilePage />);

      expect(screen.getByText('1.5M')).toBeInTheDocument();
    });

    it('should show raw count for small numbers', () => {
      vi.mocked(usePublicProfile).mockReturnValue({
        data: {
          ...mockProfile,
          social: { ...mockSocial, stats: { totalPlays: 500, friendCount: 10 } },
        },
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePublicProfile>);

      render(<PublicProfilePage />);

      expect(screen.getByText('500')).toBeInTheDocument();
    });

    it('should use username for initials when no name', () => {
      vi.mocked(usePublicProfile).mockReturnValue({
        data: {
          ...mockProfile,
          user: { ...mockUser, name: undefined, avatarUrl: undefined },
        },
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePublicProfile>);

      render(<PublicProfilePage />);

      expect(screen.getByText('TE')).toBeInTheDocument(); // 'testuser' -> 'TE'
    });

    it('should fallback to U when no name or username', () => {
      vi.mocked(usePublicProfile).mockReturnValue({
        data: {
          ...mockProfile,
          user: { ...mockUser, name: undefined, username: undefined, avatarUrl: undefined },
        },
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePublicProfile>);

      render(<PublicProfilePage />);

      // First 2 chars of 'U' = 'U'
      expect(screen.getByText('U')).toBeInTheDocument();
    });
  });
});
