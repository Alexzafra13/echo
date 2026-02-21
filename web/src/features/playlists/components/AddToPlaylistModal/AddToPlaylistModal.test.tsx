import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders } from 'axios';
import { AddToPlaylistModal } from './AddToPlaylistModal';
import type { Track } from '@features/home/types';

// Mock the hooks
vi.mock('../../hooks/usePlaylists', () => ({
  usePlaylists: vi.fn(),
  useCreatePlaylist: vi.fn(),
  useAddTrackToPlaylist: vi.fn(),
}));

// Import mocked hooks
import { usePlaylists, useCreatePlaylist, useAddTrackToPlaylist } from '../../hooks/usePlaylists';

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

describe('AddToPlaylistModal', () => {
  const mockTrack: Track = {
    id: 'track-1',
    title: 'Test Song',
    duration: 240,
    trackNumber: 1,
    discNumber: 1,
    size: '5000000',
    path: '/music/test.mp3',
    albumId: 'album-1',
    albumName: 'Test Album',
    artistId: 'artist-1',
    artistName: 'Test Artist',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockPlaylists = {
    items: [
      {
        id: 'playlist-1',
        name: 'My Playlist',
        songCount: 10,
        albumIds: ['album-1', 'album-2'],
      },
      {
        id: 'playlist-2',
        name: 'Favorites',
        songCount: 5,
        albumIds: ['album-3'],
      },
    ],
  };

  const mockAddTrackMutateAsync = vi.fn();
  const mockCreatePlaylistMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePlaylists).mockReturnValue({
      data: mockPlaylists,
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof usePlaylists>);

    vi.mocked(useAddTrackToPlaylist).mockReturnValue({
      mutateAsync: mockAddTrackMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useAddTrackToPlaylist>);

    vi.mocked(useCreatePlaylist).mockReturnValue({
      mutateAsync: mockCreatePlaylistMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreatePlaylist>);
  });

  describe('rendering', () => {
    it('should render modal with track title', () => {
      render(<AddToPlaylistModal track={mockTrack} onClose={vi.fn()} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Agregar a playlist')).toBeInTheDocument();
      expect(screen.getByText('Test Song')).toBeInTheDocument();
    });

    it('should render list of playlists', () => {
      render(<AddToPlaylistModal track={mockTrack} onClose={vi.fn()} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('My Playlist')).toBeInTheDocument();
      expect(screen.getByText('Favorites')).toBeInTheDocument();
      expect(screen.getByText('10 canciones')).toBeInTheDocument();
      expect(screen.getByText('5 canciones')).toBeInTheDocument();
    });

    it('should render create new playlist button', () => {
      render(<AddToPlaylistModal track={mockTrack} onClose={vi.fn()} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Crear nueva playlist')).toBeInTheDocument();
    });

    it('should show loading state when fetching playlists', () => {
      vi.mocked(usePlaylists).mockReturnValue({
        data: undefined,
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof usePlaylists>);

      render(<AddToPlaylistModal track={mockTrack} onClose={vi.fn()} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Cargando playlists...')).toBeInTheDocument();
    });

    it('should show empty state when no playlists', () => {
      vi.mocked(usePlaylists).mockReturnValue({
        data: { items: [] },
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof usePlaylists>);

      render(<AddToPlaylistModal track={mockTrack} onClose={vi.fn()} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('No tienes playlists todavía')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onClose when clicking close button', () => {
      const onClose = vi.fn();
      render(<AddToPlaylistModal track={mockTrack} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      const closeButton = document.querySelector('[class*="closeButton"]');
      if (closeButton) {
        fireEvent.click(closeButton);
      }

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking overlay', () => {
      const onClose = vi.fn();
      render(<AddToPlaylistModal track={mockTrack} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      const overlay = document.querySelector('[class*="overlay"]');
      if (overlay) {
        fireEvent.click(overlay);
      }

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when clicking modal content', () => {
      const onClose = vi.fn();
      render(<AddToPlaylistModal track={mockTrack} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      const modal = document.querySelector('[class*="modal"]');
      if (modal) {
        fireEvent.click(modal);
      }

      expect(onClose).not.toHaveBeenCalled();
    });

    it('should add track to playlist when clicking a playlist', async () => {
      const onClose = vi.fn();
      mockAddTrackMutateAsync.mockResolvedValueOnce({});

      render(<AddToPlaylistModal track={mockTrack} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      fireEvent.click(screen.getByText('My Playlist'));

      await waitFor(() => {
        expect(mockAddTrackMutateAsync).toHaveBeenCalledWith({
          playlistId: 'playlist-1',
          dto: { trackId: 'track-1' },
        });
      });

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('create playlist form', () => {
    it('should show create form when clicking create button', () => {
      render(<AddToPlaylistModal track={mockTrack} onClose={vi.fn()} />, {
        wrapper: createWrapper(),
      });

      fireEvent.click(screen.getByText('Crear nueva playlist'));

      expect(screen.getByPlaceholderText('Nombre de la playlist...')).toBeInTheDocument();
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
      expect(screen.getByText('Crear y agregar')).toBeInTheDocument();
    });

    it('should hide create form when clicking cancel', () => {
      render(<AddToPlaylistModal track={mockTrack} onClose={vi.fn()} />, {
        wrapper: createWrapper(),
      });

      fireEvent.click(screen.getByText('Crear nueva playlist'));
      fireEvent.click(screen.getByText('Cancelar'));

      expect(screen.queryByPlaceholderText('Nombre de la playlist...')).not.toBeInTheDocument();
      expect(screen.getByText('Crear nueva playlist')).toBeInTheDocument();
    });

    it('should show error if name is empty', async () => {
      render(<AddToPlaylistModal track={mockTrack} onClose={vi.fn()} />, {
        wrapper: createWrapper(),
      });

      fireEvent.click(screen.getByText('Crear nueva playlist'));
      fireEvent.click(screen.getByText('Crear y agregar'));

      await waitFor(() => {
        expect(screen.getByText('El nombre de la playlist es obligatorio')).toBeInTheDocument();
      });
    });

    it('should create playlist and add track', async () => {
      const onClose = vi.fn();
      mockCreatePlaylistMutateAsync.mockResolvedValueOnce({ id: 'new-playlist-id' });
      mockAddTrackMutateAsync.mockResolvedValueOnce({});

      render(<AddToPlaylistModal track={mockTrack} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      fireEvent.click(screen.getByText('Crear nueva playlist'));

      const input = screen.getByPlaceholderText('Nombre de la playlist...');
      fireEvent.change(input, { target: { value: 'New Playlist' } });

      fireEvent.click(screen.getByText('Crear y agregar'));

      await waitFor(() => {
        expect(mockCreatePlaylistMutateAsync).toHaveBeenCalledWith({
          name: 'New Playlist',
          public: false,
        });
      });

      await waitFor(() => {
        expect(mockAddTrackMutateAsync).toHaveBeenCalledWith({
          playlistId: 'new-playlist-id',
          dto: { trackId: 'track-1' },
        });
      });

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should show error message when add to playlist fails', async () => {
      // Create a proper AxiosError that getApiErrorMessage can handle
      const axiosError = new AxiosError('Request failed');
      axiosError.response = {
        data: { message: 'Track already in playlist' },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockAddTrackMutateAsync.mockRejectedValueOnce(axiosError);

      render(<AddToPlaylistModal track={mockTrack} onClose={vi.fn()} />, {
        wrapper: createWrapper(),
      });

      fireEvent.click(screen.getByText('My Playlist'));

      await waitFor(() => {
        expect(screen.getByText('Track already in playlist')).toBeInTheDocument();
      });
    });

    it('should show error message from Error object', async () => {
      mockAddTrackMutateAsync.mockRejectedValueOnce(new Error('Network error'));

      render(<AddToPlaylistModal track={mockTrack} onClose={vi.fn()} />, {
        wrapper: createWrapper(),
      });

      fireEvent.click(screen.getByText('My Playlist'));

      await waitFor(() => {
        // getApiErrorMessage extracts message from Error objects
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should show default error when error has no message', async () => {
      mockAddTrackMutateAsync.mockRejectedValueOnce({});

      render(<AddToPlaylistModal track={mockTrack} onClose={vi.fn()} />, {
        wrapper: createWrapper(),
      });

      fireEvent.click(screen.getByText('My Playlist'));

      await waitFor(() => {
        expect(screen.getByText('Error al agregar la canción')).toBeInTheDocument();
      });
    });
  });

  describe('singular/plural text', () => {
    it('should show "canción" for single song', () => {
      vi.mocked(usePlaylists).mockReturnValue({
        data: {
          items: [{ id: 'p1', name: 'Single', songCount: 1, albumIds: [] }],
        },
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof usePlaylists>);

      render(<AddToPlaylistModal track={mockTrack} onClose={vi.fn()} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('1 canción')).toBeInTheDocument();
    });
  });
});
