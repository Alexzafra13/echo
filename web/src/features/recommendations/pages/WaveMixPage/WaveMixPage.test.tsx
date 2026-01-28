import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WaveMixPage } from './WaveMixPage';

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/', mockSetLocation],
}));

// Mock layout components
vi.mock('@features/home/components', () => ({
  Sidebar: () => <nav data-testid="sidebar">Sidebar</nav>,
}));

vi.mock('@shared/components/layout/Header', () => ({
  Header: ({ customSearch }: { customSearch?: React.ReactNode }) => (
    <header data-testid="header">{customSearch}</header>
  ),
}));

vi.mock('@shared/components/ui', () => ({
  Button: ({ children, onClick, disabled, className }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

vi.mock('@shared/components/ActionCard', () => ({
  ActionCard: ({ title, onClick }: { title: string; onClick: () => void }) => (
    <div data-testid="action-card" onClick={onClick}>
      {title}
    </div>
  ),
}));

vi.mock('../../components/PlaylistCover', () => ({
  PlaylistCover: ({ name }: { name: string }) => (
    <div data-testid="playlist-cover">{name}</div>
  ),
}));

// Mock auth store
vi.mock('@shared/store', () => ({
  useAuthStore: () => ({ name: 'Test User', username: 'testuser' }),
}));

// Mock grid dimensions
vi.mock('@features/home/hooks', () => ({
  useGridDimensions: () => ({ itemsPerPage: 10, columns: 5 }),
}));

// Mock services
const mockGetAutoPlaylists = vi.fn();
const mockRefreshWaveMix = vi.fn();

vi.mock('@shared/services/recommendations.service', () => ({
  getAutoPlaylists: () => mockGetAutoPlaylists(),
  refreshWaveMix: () => mockRefreshWaveMix(),
}));

// Mock utilities
vi.mock('@shared/utils/logger', () => ({
  logger: { debug: vi.fn(), error: vi.fn() },
}));

vi.mock('@shared/utils/error.utils', () => ({
  getApiErrorMessage: () => 'Error message',
}));

vi.mock('@shared/utils/safeSessionStorage', () => ({
  safeSessionStorage: {
    setItem: vi.fn(),
    getItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

// Mock playlists data
const mockPlaylists = [
  {
    id: 'daily-1',
    name: 'Wave Mix del Día',
    description: 'Música recomendada para hoy',
    type: 'wave-mix',
    coverColor: '#ff0000',
    metadata: { totalTracks: 20, artistName: null },
    tracks: [],
  },
  {
    id: 'artist-1',
    name: 'Radio Coldplay',
    description: 'Basado en Coldplay',
    type: 'artist',
    coverColor: '#00ff00',
    metadata: { totalTracks: 15, artistName: 'Coldplay' },
    tracks: [],
  },
  {
    id: 'genre-1',
    name: 'Rock Mix',
    description: 'Lo mejor del Rock',
    type: 'genre',
    coverColor: '#0000ff',
    metadata: { totalTracks: 25, artistName: null },
    tracks: [],
  },
];

describe('WaveMixPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAutoPlaylists.mockResolvedValue(mockPlaylists);
    mockRefreshWaveMix.mockResolvedValue(mockPlaylists);
  });

  describe('Layout', () => {
    it('should render sidebar', async () => {
      render(<WaveMixPage />);

      await waitFor(() => {
        expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      });
    });

    it('should render header', async () => {
      render(<WaveMixPage />);

      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument();
      });
    });
  });

  describe('Hero Section', () => {
    it('should render title', async () => {
      render(<WaveMixPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Wave Mix' })).toBeInTheDocument();
      });
    });

    it('should render user greeting', async () => {
      render(<WaveMixPage />);

      await waitFor(() => {
        expect(screen.getByText(/test user/i)).toBeInTheDocument();
      });
    });

    it('should render refresh button', async () => {
      render(<WaveMixPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /actualizar/i })).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      mockGetAutoPlaylists.mockReturnValue(new Promise(() => {})); // Never resolves

      render(<WaveMixPage />);

      expect(screen.getByText(/generando/i)).toBeInTheDocument();
    });

    it('should disable refresh button while loading', () => {
      mockGetAutoPlaylists.mockReturnValue(new Promise(() => {}));

      render(<WaveMixPage />);

      expect(screen.getByRole('button', { name: /actualizando/i })).toBeDisabled();
    });
  });

  describe('Error State', () => {
    it('should show error state on load failure', async () => {
      mockGetAutoPlaylists.mockRejectedValue(new Error('Network error'));

      render(<WaveMixPage />);

      await waitFor(() => {
        expect(screen.getByText('Error message')).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      mockGetAutoPlaylists.mockRejectedValue(new Error('Network error'));

      render(<WaveMixPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /intentar de nuevo/i })).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no playlists', async () => {
      mockGetAutoPlaylists.mockResolvedValue([]);

      render(<WaveMixPage />);

      await waitFor(() => {
        expect(screen.getByText('Aún no hay playlists')).toBeInTheDocument();
      });
    });

    it('should show hint in empty state', async () => {
      mockGetAutoPlaylists.mockResolvedValue([]);

      render(<WaveMixPage />);

      await waitFor(() => {
        expect(screen.getByText(/empieza a escuchar/i)).toBeInTheDocument();
      });
    });
  });

  describe('Playlist Sections', () => {
    it('should show daily recommendations section', async () => {
      render(<WaveMixPage />);

      await waitFor(() => {
        expect(screen.getByText('Recomendaciones Diarias')).toBeInTheDocument();
      });
    });

    it('should show artist recommendations section', async () => {
      render(<WaveMixPage />);

      await waitFor(() => {
        expect(screen.getByText('Recomendaciones por Artista')).toBeInTheDocument();
      });
    });

    it('should show genre recommendations section', async () => {
      render(<WaveMixPage />);

      await waitFor(() => {
        expect(screen.getByText('Recomendaciones por Género')).toBeInTheDocument();
      });
    });

    it('should display daily playlist cards', async () => {
      render(<WaveMixPage />);

      await waitFor(() => {
        expect(screen.getByText('Wave Mix del Día')).toBeInTheDocument();
      });
    });

    it('should display artist playlist cards', async () => {
      render(<WaveMixPage />);

      await waitFor(() => {
        // Playlist name appears both in PlaylistCover mock and in the card info
        const elements = screen.getAllByText('Radio Coldplay');
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it('should display genre playlist cards', async () => {
      render(<WaveMixPage />);

      await waitFor(() => {
        // Playlist name appears both in PlaylistCover mock and in the card info
        const elements = screen.getAllByText('Rock Mix');
        expect(elements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Search', () => {
    it('should render search input', async () => {
      render(<WaveMixPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/buscar/i)).toBeInTheDocument();
      });
    });

    it('should filter playlists by search query', async () => {
      render(<WaveMixPage />);

      await waitFor(() => {
        // Wait for playlists to load
        expect(screen.getAllByText('Radio Coldplay').length).toBeGreaterThan(0);
      });

      fireEvent.change(screen.getByPlaceholderText(/buscar/i), {
        target: { value: 'Rock' },
      });

      // Coldplay should be filtered out
      expect(screen.queryByText('Radio Coldplay')).not.toBeInTheDocument();
      // Rock Mix should still be visible
      expect(screen.getAllByText('Rock Mix').length).toBeGreaterThan(0);
    });

    it('should show clear button when search has value', async () => {
      render(<WaveMixPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/buscar/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText(/buscar/i), {
        target: { value: 'test' },
      });

      expect(screen.getByRole('button', { name: /limpiar/i })).toBeInTheDocument();
    });

    it('should clear search on clear button click', async () => {
      render(<WaveMixPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/buscar/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/buscar/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });
      fireEvent.click(screen.getByRole('button', { name: /limpiar/i }));

      expect(searchInput).toHaveValue('');
    });
  });

  describe('Navigation', () => {
    it('should navigate to playlist on click', async () => {
      render(<WaveMixPage />);

      await waitFor(() => {
        expect(screen.getByText('Wave Mix del Día')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Wave Mix del Día'));

      expect(mockSetLocation).toHaveBeenCalledWith('/wave-mix/daily-1');
    });

    it('should show view all button for artist section', async () => {
      render(<WaveMixPage />);

      await waitFor(() => {
        const viewAllButtons = screen.getAllByText('Ver todas →');
        expect(viewAllButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Refresh', () => {
    it('should call refreshWaveMix on refresh button click', async () => {
      render(<WaveMixPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /actualizar/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /actualizar/i }));

      await waitFor(() => {
        expect(mockRefreshWaveMix).toHaveBeenCalled();
      });
    });
  });

  describe('API Calls', () => {
    it('should fetch playlists on mount', async () => {
      render(<WaveMixPage />);

      await waitFor(() => {
        expect(mockGetAutoPlaylists).toHaveBeenCalled();
      });
    });
  });
});
