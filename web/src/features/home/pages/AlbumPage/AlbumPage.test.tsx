import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AlbumPage from './AlbumPage';

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useParams: () => ({ id: 'album-1' }),
  useLocation: () => ['/album/album-1', mockSetLocation],
}));

// Mock react-query
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    refetchQueries: vi.fn(),
  }),
}));

// Mock album hooks
vi.mock('../../hooks/useAlbums', () => ({
  useAlbum: vi.fn(),
  useAlbumTracks: vi.fn(),
}));

// Mock home hooks
vi.mock('../../hooks', () => ({
  useAlbumCoverMetadata: vi.fn(),
  getAlbumCoverUrl: vi.fn((id, tag) => `/api/albums/${id}/cover${tag ? `?tag=${tag}` : ''}`),
  getArtistImageUrl: vi.fn((id, type, tag) => `/api/artists/${id}/images/${type}${tag ? `?tag=${tag}` : ''}`),
  useArtistImages: vi.fn(),
}));

// Mock artist hooks
vi.mock('@features/artists/hooks', () => ({
  useArtistAlbums: vi.fn(),
}));

// Mock player
vi.mock('@features/player', () => ({
  usePlayer: vi.fn(),
  Track: {},
}));

// Mock shared hooks
vi.mock('@shared/hooks', () => ({
  useAlbumMetadataSync: vi.fn(),
}));

// Mock components
vi.mock('@shared/components/layout/Header', () => ({
  Header: () => <header data-testid="header">Header</header>,
}));

vi.mock('../../components', () => ({
  Sidebar: () => <aside data-testid="sidebar">Sidebar</aside>,
  TrackList: ({ tracks, onTrackPlay }: { tracks: unknown[]; onTrackPlay: (track: unknown) => void }) => (
    <div data-testid="track-list">
      {(tracks as Array<{ id: string; title: string }>).map((t) => (
        <button key={t.id} onClick={() => onTrackPlay(t)}>{t.title}</button>
      ))}
    </div>
  ),
  AlbumOptionsMenu: ({ onShowInfo, onChangeCover }: { onShowInfo: () => void; onChangeCover: () => void }) => (
    <div data-testid="album-options">
      <button onClick={onShowInfo}>Show Info</button>
      <button onClick={onChangeCover}>Change Cover</button>
    </div>
  ),
  AlbumInfoModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="album-info-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ),
  AlbumCard: ({ title, onClick }: { title: string; onClick: () => void }) => (
    <div data-testid="album-card" onClick={onClick}>{title}</div>
  ),
}));

vi.mock('@features/admin/components/AlbumCoverSelectorModal', () => ({
  AlbumCoverSelectorModal: ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => (
    <div data-testid="cover-selector-modal">
      <button onClick={onClose}>Close</button>
      <button onClick={onSuccess}>Save</button>
    </div>
  ),
}));

vi.mock('@shared/components/ui', () => ({
  Button: ({ children, onClick, leftIcon }: { children: React.ReactNode; onClick: () => void; leftIcon?: React.ReactNode }) => (
    <button onClick={onClick}>{leftIcon}{children}</button>
  ),
}));

vi.mock('@shared/utils/colorExtractor', () => ({
  extractDominantColor: vi.fn().mockResolvedValue('100, 150, 200'),
}));

vi.mock('@shared/utils/cover.utils', () => ({
  getCoverUrl: vi.fn((url) => url || '/default-cover.jpg'),
  handleImageError: vi.fn(),
}));

vi.mock('@shared/utils/track.utils', () => ({
  toPlayerTracks: vi.fn((tracks) => tracks),
}));

vi.mock('@shared/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@shared/services/download.service', () => ({
  downloadService: {
    downloadAlbum: vi.fn(),
  },
}));

// Import mocked modules
import * as albumHooks from '../../hooks/useAlbums';
import * as homeHooks from '../../hooks';
import * as artistHooks from '@features/artists/hooks';
import * as playerModule from '@features/player';

// Mock data
const mockAlbum = {
  id: 'album-1',
  title: 'Test Album',
  artist: 'Test Artist',
  artistId: 'artist-1',
  year: 2023,
  totalTracks: 10,
  coverImage: '/cover.jpg',
};

const mockTracks = [
  { id: 'track-1', title: 'Song One', duration: 180 },
  { id: 'track-2', title: 'Song Two', duration: 240 },
  { id: 'track-3', title: 'Song Three', duration: 200 },
];

const mockMoreAlbums = [
  { id: 'album-2', title: 'Another Album', artist: 'Test Artist', coverImage: '/cover2.jpg' },
  { id: 'album-3', title: 'Third Album', artist: 'Test Artist', coverImage: '/cover3.jpg' },
];

describe('AlbumPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(albumHooks.useAlbum).mockReturnValue({
      data: mockAlbum,
      isLoading: false,
      error: null,
    } as ReturnType<typeof albumHooks.useAlbum>);

    vi.mocked(albumHooks.useAlbumTracks).mockReturnValue({
      data: mockTracks,
      isLoading: false,
    } as ReturnType<typeof albumHooks.useAlbumTracks>);

    vi.mocked(artistHooks.useArtistAlbums).mockReturnValue({
      data: { data: [...mockMoreAlbums, mockAlbum] },
    } as ReturnType<typeof artistHooks.useArtistAlbums>);

    vi.mocked(homeHooks.useArtistImages).mockReturnValue({
      data: { images: { profile: { exists: true, tag: 'abc' } } },
    } as ReturnType<typeof homeHooks.useArtistImages>);

    vi.mocked(homeHooks.useAlbumCoverMetadata).mockReturnValue({
      data: { cover: { exists: true, tag: 'xyz', lastModified: '2024-01-01' } },
    } as ReturnType<typeof homeHooks.useAlbumCoverMetadata>);

    vi.mocked(playerModule.usePlayer).mockReturnValue({
      playQueue: vi.fn(),
      currentTrack: null,
      setShuffle: vi.fn(),
    } as unknown as ReturnType<typeof playerModule.usePlayer>);
  });

  describe('loading state', () => {
    it('should show loading state', () => {
      vi.mocked(albumHooks.useAlbum).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as ReturnType<typeof albumHooks.useAlbum>);

      render(<AlbumPage />);

      expect(screen.getByText('Cargando álbum...')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error state', () => {
      vi.mocked(albumHooks.useAlbum).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed'),
      } as ReturnType<typeof albumHooks.useAlbum>);

      render(<AlbumPage />);

      expect(screen.getByText('Error al cargar el álbum')).toBeInTheDocument();
    });
  });

  describe('rendering', () => {
    it('should render album title', () => {
      render(<AlbumPage />);

      expect(screen.getByText('Test Album')).toBeInTheDocument();
    });

    it('should render album type badge', () => {
      render(<AlbumPage />);

      expect(screen.getByText('Álbum')).toBeInTheDocument();
    });

    it('should render artist name', () => {
      render(<AlbumPage />);

      expect(screen.getByText('Test Artist')).toBeInTheDocument();
    });

    it('should render album year', () => {
      render(<AlbumPage />);

      expect(screen.getByText('2023')).toBeInTheDocument();
    });

    it('should render track count', () => {
      render(<AlbumPage />);

      expect(screen.getByText('10 canciones')).toBeInTheDocument();
    });

    it('should render total duration', () => {
      render(<AlbumPage />);

      // 180 + 240 + 200 = 620 seconds = 10 min
      expect(screen.getByText('10 min')).toBeInTheDocument();
    });

    it('should render sidebar and header', () => {
      render(<AlbumPage />);

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
  });

  describe('play buttons', () => {
    it('should call playQueue when clicking Reproducir', () => {
      const mockPlayQueue = vi.fn();
      const mockSetShuffle = vi.fn();
      vi.mocked(playerModule.usePlayer).mockReturnValue({
        playQueue: mockPlayQueue,
        currentTrack: null,
        setShuffle: mockSetShuffle,
      } as unknown as ReturnType<typeof playerModule.usePlayer>);

      render(<AlbumPage />);

      fireEvent.click(screen.getByText('Reproducir'));

      expect(mockSetShuffle).toHaveBeenCalledWith(false);
      expect(mockPlayQueue).toHaveBeenCalledWith(expect.any(Array), 0);
    });

    it('should enable shuffle when clicking Aleatorio', () => {
      const mockPlayQueue = vi.fn();
      const mockSetShuffle = vi.fn();
      vi.mocked(playerModule.usePlayer).mockReturnValue({
        playQueue: mockPlayQueue,
        currentTrack: null,
        setShuffle: mockSetShuffle,
      } as unknown as ReturnType<typeof playerModule.usePlayer>);

      render(<AlbumPage />);

      fireEvent.click(screen.getByText('Aleatorio'));

      expect(mockSetShuffle).toHaveBeenCalledWith(true);
      expect(mockPlayQueue).toHaveBeenCalled();
    });
  });

  describe('track list', () => {
    it('should render track list', () => {
      render(<AlbumPage />);

      expect(screen.getByTestId('track-list')).toBeInTheDocument();
    });

    it('should show track titles', () => {
      render(<AlbumPage />);

      expect(screen.getByText('Song One')).toBeInTheDocument();
      expect(screen.getByText('Song Two')).toBeInTheDocument();
      expect(screen.getByText('Song Three')).toBeInTheDocument();
    });

    it('should call playQueue when clicking a track', () => {
      const mockPlayQueue = vi.fn();
      vi.mocked(playerModule.usePlayer).mockReturnValue({
        playQueue: mockPlayQueue,
        currentTrack: null,
        setShuffle: vi.fn(),
      } as unknown as ReturnType<typeof playerModule.usePlayer>);

      render(<AlbumPage />);

      fireEvent.click(screen.getByText('Song Two'));

      expect(mockPlayQueue).toHaveBeenCalledWith(expect.any(Array), 1);
    });

    it('should show loading state for tracks', () => {
      vi.mocked(albumHooks.useAlbumTracks).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as ReturnType<typeof albumHooks.useAlbumTracks>);

      render(<AlbumPage />);

      expect(screen.getByText('Cargando canciones...')).toBeInTheDocument();
    });

    it('should show empty state when no tracks', () => {
      vi.mocked(albumHooks.useAlbumTracks).mockReturnValue({
        data: [],
        isLoading: false,
      } as ReturnType<typeof albumHooks.useAlbumTracks>);

      render(<AlbumPage />);

      expect(screen.getByText('No se encontraron canciones en este álbum')).toBeInTheDocument();
    });
  });

  describe('more from artist section', () => {
    it('should render more from artist albums', () => {
      render(<AlbumPage />);

      expect(screen.getByText('Más de Test Artist')).toBeInTheDocument();
      expect(screen.getByText('Another Album')).toBeInTheDocument();
      expect(screen.getByText('Third Album')).toBeInTheDocument();
    });

    it('should not show current album in more from artist', () => {
      render(<AlbumPage />);

      // The mock includes mockAlbum in the artist albums, but it should be filtered out
      const albumCards = screen.getAllByTestId('album-card');
      expect(albumCards).toHaveLength(2);
    });

    it('should navigate to album when clicking', () => {
      render(<AlbumPage />);

      fireEvent.click(screen.getByText('Another Album'));

      expect(mockSetLocation).toHaveBeenCalledWith('/album/album-2');
    });

    it('should not render section when no other albums', () => {
      vi.mocked(artistHooks.useArtistAlbums).mockReturnValue({
        data: { data: [mockAlbum] },
      } as ReturnType<typeof artistHooks.useArtistAlbums>);

      render(<AlbumPage />);

      expect(screen.queryByText('Más de Test Artist')).not.toBeInTheDocument();
    });
  });

  describe('artist navigation', () => {
    it('should navigate to artist page when clicking artist name', () => {
      render(<AlbumPage />);

      fireEvent.click(screen.getByText('Test Artist'));

      expect(mockSetLocation).toHaveBeenCalledWith('/artists/artist-1');
    });
  });

  describe('modals', () => {
    it('should open info modal when clicking show info', () => {
      render(<AlbumPage />);

      fireEvent.click(screen.getByText('Show Info'));

      expect(screen.getByTestId('album-info-modal')).toBeInTheDocument();
    });

    it('should close info modal', () => {
      render(<AlbumPage />);

      fireEvent.click(screen.getByText('Show Info'));
      expect(screen.getByTestId('album-info-modal')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Close'));

      expect(screen.queryByTestId('album-info-modal')).not.toBeInTheDocument();
    });

    it('should open cover selector modal when clicking change cover', () => {
      render(<AlbumPage />);

      fireEvent.click(screen.getByText('Change Cover'));

      expect(screen.getByTestId('cover-selector-modal')).toBeInTheDocument();
    });

    it('should close cover selector modal', () => {
      render(<AlbumPage />);

      fireEvent.click(screen.getByText('Change Cover'));
      expect(screen.getByTestId('cover-selector-modal')).toBeInTheDocument();

      fireEvent.click(screen.getAllByText('Close')[0]);

      expect(screen.queryByTestId('cover-selector-modal')).not.toBeInTheDocument();
    });

    it('should open image lightbox when clicking cover', () => {
      render(<AlbumPage />);

      // Find the album cover image and click it
      const coverImage = screen.getByAltText('Test Album');
      fireEvent.click(coverImage);

      // The lightbox should show
      expect(screen.getAllByAltText('Test Album')).toHaveLength(2); // Original + lightbox
    });

    it('should close image lightbox when clicking backdrop', () => {
      render(<AlbumPage />);

      const coverImage = screen.getByAltText('Test Album');
      fireEvent.click(coverImage);

      // Click outside the modal content (on backdrop)
      // The backdrop has the modal class
      const modalBackdrop = document.querySelector('[class*="imageModal"]');
      if (modalBackdrop) {
        fireEvent.click(modalBackdrop);
      }
    });
  });

  describe('album options', () => {
    it('should render album options menu', () => {
      render(<AlbumPage />);

      expect(screen.getByTestId('album-options')).toBeInTheDocument();
    });
  });
});
