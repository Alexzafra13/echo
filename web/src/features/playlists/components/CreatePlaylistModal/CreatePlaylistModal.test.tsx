import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreatePlaylistModal } from './CreatePlaylistModal';

// Mock the hooks and services
vi.mock('@features/home/hooks/useTracks', () => ({
  useTrackSearch: vi.fn(),
}));

vi.mock('@shared/services/play-tracking.service', () => ({
  getRecentlyPlayed: vi.fn(),
}));

// Import mocked modules
import { useTrackSearch } from '@features/home/hooks/useTracks';
import { getRecentlyPlayed } from '@shared/services/play-tracking.service';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('CreatePlaylistModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  const mockSearchResults = [
    {
      id: 'track-1',
      title: 'Search Result 1',
      artistName: 'Artist 1',
      albumId: 'album-1',
      duration: 240,
    },
    {
      id: 'track-2',
      title: 'Search Result 2',
      artistName: 'Artist 2',
      albumId: 'album-2',
      duration: 180,
    },
  ];

  const mockRecentlyPlayed = [
    {
      trackId: 'recent-1',
      track: {
        id: 'recent-1',
        title: 'Recent Song 1',
        artistName: 'Recent Artist 1',
        albumId: 'album-r1',
      },
      playedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      trackId: 'recent-2',
      track: {
        id: 'recent-2',
        title: 'Recent Song 2',
        artistName: 'Recent Artist 2',
        albumId: 'album-r2',
      },
      playedAt: '2024-01-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useTrackSearch).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as ReturnType<typeof useTrackSearch>);

    vi.mocked(getRecentlyPlayed).mockResolvedValue(mockRecentlyPlayed);
  });

  describe('rendering', () => {
    it('should render modal with title', async () => {
      render(
        <CreatePlaylistModal onClose={mockOnClose} onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Nueva Playlist')).toBeInTheDocument();
    });

    it('should render playlist name input', async () => {
      render(
        <CreatePlaylistModal onClose={mockOnClose} onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByPlaceholderText('Mi Playlist...')).toBeInTheDocument();
      expect(screen.getByText('Nombre de la playlist')).toBeInTheDocument();
    });

    it('should render search input', async () => {
      render(
        <CreatePlaylistModal onClose={mockOnClose} onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByPlaceholderText('Buscar por título o artista...')).toBeInTheDocument();
    });

    it('should render recently played suggestions', async () => {
      render(
        <CreatePlaylistModal onClose={mockOnClose} onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Recent Song 1')).toBeInTheDocument();
        expect(screen.getByText('Recent Song 2')).toBeInTheDocument();
      });
    });

    it('should show loading state for recently played', async () => {
      vi.mocked(getRecentlyPlayed).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <CreatePlaylistModal onClose={mockOnClose} onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Cargando sugerencias...')).toBeInTheDocument();
    });

    it('should render action buttons', async () => {
      render(
        <CreatePlaylistModal onClose={mockOnClose} onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Cancelar')).toBeInTheDocument();
      expect(screen.getByText('Crear Playlist')).toBeInTheDocument();
    });
  });

  describe('search functionality', () => {
    it('should show search results when query is at least 2 characters', async () => {
      vi.mocked(useTrackSearch).mockReturnValue({
        data: mockSearchResults,
        isLoading: false,
      } as ReturnType<typeof useTrackSearch>);

      render(
        <CreatePlaylistModal onClose={mockOnClose} onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      const searchInput = screen.getByPlaceholderText('Buscar por título o artista...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText('Resultados de búsqueda')).toBeInTheDocument();
        expect(screen.getByText('Search Result 1')).toBeInTheDocument();
        expect(screen.getByText('Search Result 2')).toBeInTheDocument();
      });
    });

    it('should show loading state while searching', async () => {
      vi.mocked(useTrackSearch).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as ReturnType<typeof useTrackSearch>);

      render(
        <CreatePlaylistModal onClose={mockOnClose} onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      const searchInput = screen.getByPlaceholderText('Buscar por título o artista...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText('Buscando...')).toBeInTheDocument();
      });
    });

    it('should show empty state when no search results', async () => {
      vi.mocked(useTrackSearch).mockReturnValue({
        data: [],
        isLoading: false,
      } as ReturnType<typeof useTrackSearch>);

      render(
        <CreatePlaylistModal onClose={mockOnClose} onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      const searchInput = screen.getByPlaceholderText('Buscar por título o artista...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText('No se encontraron canciones')).toBeInTheDocument();
      });
    });

    it('should clear search when clicking X button', async () => {
      vi.mocked(useTrackSearch).mockReturnValue({
        data: mockSearchResults,
        isLoading: false,
      } as ReturnType<typeof useTrackSearch>);

      render(
        <CreatePlaylistModal onClose={mockOnClose} onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      const searchInput = screen.getByPlaceholderText('Buscar por título o artista...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText('Resultados de búsqueda')).toBeInTheDocument();
      });

      const clearButton = document.querySelector('[class*="clearSearch"]');
      if (clearButton) {
        fireEvent.click(clearButton);
      }

      expect(searchInput).toHaveValue('');
    });
  });

  describe('track selection', () => {
    it('should add track to selection when clicked', async () => {
      render(
        <CreatePlaylistModal onClose={mockOnClose} onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Recent Song 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Recent Song 1'));

      await waitFor(() => {
        expect(screen.getByText('Canciones seleccionadas (1)')).toBeInTheDocument();
      });
    });

    it('should remove track from selection when clicked again', async () => {
      render(
        <CreatePlaylistModal onClose={mockOnClose} onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Recent Song 1')).toBeInTheDocument();
      });

      // Select
      fireEvent.click(screen.getByText('Recent Song 1'));

      await waitFor(() => {
        expect(screen.getByText('Canciones seleccionadas (1)')).toBeInTheDocument();
      });

      // Click the remove button in selected section
      const removeButton = document.querySelector('[class*="removeButton"]');
      if (removeButton) {
        fireEvent.click(removeButton);
      }

      await waitFor(() => {
        expect(screen.queryByText('Canciones seleccionadas (1)')).not.toBeInTheDocument();
      });
    });

    it('should update button text with track count', async () => {
      render(
        <CreatePlaylistModal onClose={mockOnClose} onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Recent Song 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Recent Song 1'));

      await waitFor(() => {
        expect(screen.getByText('Crear Playlist (1)')).toBeInTheDocument();
      });
    });
  });

  describe('form validation', () => {
    it('should disable submit when name is empty but tracks selected', async () => {
      render(
        <CreatePlaylistModal onClose={mockOnClose} onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      // Select a track first
      await waitFor(() => {
        expect(screen.getByText('Recent Song 1')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Recent Song 1'));

      // Button should be disabled (canCreate requires both name and tracks)
      await waitFor(() => {
        const submitButton = screen.getByText('Crear Playlist (1)');
        expect(submitButton).toBeDisabled();
      });
    });

    it('should disable submit when no tracks selected', async () => {
      render(
        <CreatePlaylistModal onClose={mockOnClose} onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      // Enter name but don't select tracks
      const nameInput = screen.getByPlaceholderText('Mi Playlist...');
      fireEvent.change(nameInput, { target: { value: 'My Playlist' } });

      // Submit button should still say "Crear Playlist" (no count) and be disabled
      const submitButton = screen.getByText('Crear Playlist');
      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button when form is invalid', async () => {
      render(
        <CreatePlaylistModal onClose={mockOnClose} onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      // Neither name nor tracks selected
      const submitButton = screen.getByText('Crear Playlist');
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when name and tracks are provided', async () => {
      render(
        <CreatePlaylistModal onClose={mockOnClose} onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      // Enter name
      const nameInput = screen.getByPlaceholderText('Mi Playlist...');
      fireEvent.change(nameInput, { target: { value: 'My Playlist' } });

      // Select a track
      await waitFor(() => {
        expect(screen.getByText('Recent Song 1')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Recent Song 1'));

      // Button should be enabled
      await waitFor(() => {
        const submitButton = screen.getByText('Crear Playlist (1)');
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('form submission', () => {
    it('should call onSubmit with name and track ids', async () => {
      mockOnSubmit.mockResolvedValueOnce(undefined);

      render(
        <CreatePlaylistModal onClose={mockOnClose} onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      // Enter name
      const nameInput = screen.getByPlaceholderText('Mi Playlist...');
      fireEvent.change(nameInput, { target: { value: 'My Playlist' } });

      // Select track
      await waitFor(() => {
        expect(screen.getByText('Recent Song 1')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Recent Song 1'));

      // Submit
      await waitFor(() => {
        expect(screen.getByText('Crear Playlist (1)')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Crear Playlist (1)'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('My Playlist', ['recent-1']);
      });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show loading state when submitting', async () => {
      render(
        <CreatePlaylistModal
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          isLoading={true}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Creando...')).toBeInTheDocument();
    });

    it('should disable inputs when loading', async () => {
      render(
        <CreatePlaylistModal
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          isLoading={true}
        />,
        { wrapper: createWrapper() }
      );

      const nameInput = screen.getByPlaceholderText('Mi Playlist...');
      expect(nameInput).toBeDisabled();
    });
  });

  describe('modal interactions', () => {
    it('should call onClose when cancel button is clicked', async () => {
      render(
        <CreatePlaylistModal onClose={mockOnClose} onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByText('Cancelar'));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('empty states', () => {
    it('should show empty state when no recently played', async () => {
      vi.mocked(getRecentlyPlayed).mockResolvedValue([]);

      render(
        <CreatePlaylistModal onClose={mockOnClose} onSubmit={mockOnSubmit} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('No hay canciones recientes')).toBeInTheDocument();
        expect(screen.getByText('Usa el buscador para añadir canciones')).toBeInTheDocument();
      });
    });
  });
});
