import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AlbumsPage from './AlbumsPage';

// Mock wouter
const mockSetLocation = vi.fn();
let mockSearchParams = '';

vi.mock('wouter', () => ({
  useLocation: () => ['/', mockSetLocation],
  useSearch: () => mockSearchParams,
}));

// Mock layout components
vi.mock('@shared/components/layout/Header', () => ({
  Header: ({ customSearch }: { customSearch?: React.ReactNode }) => (
    <header data-testid="header">{customSearch}</header>
  ),
}));

vi.mock('../../components', () => ({
  Sidebar: () => <nav data-testid="sidebar">Sidebar</nav>,
  AlbumGrid: ({ albums, title }: { albums: Array<{ id: string; title: string }>; title: string }) => (
    <div data-testid="album-grid">
      {title && <span>{title}</span>}
      {albums.map((album) => (
        <div key={album.id} data-testid="album-card">{album.title}</div>
      ))}
    </div>
  ),
}));

// Mock UI components
vi.mock('@shared/components/ui', () => ({
  Pagination: ({ currentPage, totalPages, onPageChange }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }) => (
    <div data-testid="pagination">
      <span>Page {currentPage} of {totalPages}</span>
      <button onClick={() => onPageChange(currentPage + 1)}>Next</button>
    </div>
  ),
  Select: ({ label, value, onChange, options }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
  }) => (
    <div data-testid="select">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  ),
}));

// Mock album data
const mockAlbums = [
  { id: '1', title: 'Album One', artist: 'Artist A' },
  { id: '2', title: 'Album Two', artist: 'Artist B' },
  { id: '3', title: 'Album Three', artist: 'Artist C' },
];

// Mock album hooks
vi.mock('../../hooks/useAlbums', () => ({
  useRecentAlbums: () => ({
    data: mockAlbums,
    isLoading: false,
    error: null,
  }),
  useTopPlayedAlbums: () => ({
    data: mockAlbums,
    isLoading: false,
    error: null,
  }),
  useAlbumsAlphabetically: () => ({
    data: { data: mockAlbums, totalPages: 2 },
    isLoading: false,
    error: null,
  }),
  useAlbumsByArtist: () => ({
    data: { data: mockAlbums, totalPages: 2 },
    isLoading: false,
    error: null,
  }),
  useAlbumsRecentlyPlayed: () => ({
    data: { data: mockAlbums },
    isLoading: false,
    error: null,
  }),
  useAlbumsFavorites: () => ({
    data: { data: mockAlbums, hasMore: false },
    isLoading: false,
    error: null,
  }),
}));

// Mock grid dimensions
vi.mock('../../hooks/useGridDimensions', () => ({
  useGridDimensions: () => ({ itemsPerPage: 20 }),
}));

// Mock federation features
const mockConnectedServers = [
  { id: 'server-1', name: 'Friend Server' },
  { id: 'server-2', name: 'Family Server' },
];

const mockSharedAlbums = [
  { id: 'shared-1', title: 'Shared Album', artist: 'Shared Artist', serverId: 'server-1' },
];

vi.mock('@features/federation', () => ({
  useConnectedServers: () => ({ data: mockConnectedServers }),
  useSharedAlbums: () => ({
    data: { albums: mockSharedAlbums, total: 1, totalPages: 1 },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  SharedAlbumGrid: ({ albums }: { albums: Array<{ id: string; title: string }> }) => (
    <div data-testid="shared-album-grid">
      {albums.map((album) => (
        <div key={album.id} data-testid="shared-album-card">{album.title}</div>
      ))}
    </div>
  ),
}));

describe('AlbumsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = '';
  });

  describe('Layout', () => {
    it('should render sidebar', () => {
      render(<AlbumsPage />);
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('should render header', () => {
      render(<AlbumsPage />);
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('should render page title for local library', () => {
      render(<AlbumsPage />);
      expect(screen.getByRole('heading', { name: 'Todos los Álbumes' })).toBeInTheDocument();
    });

    it('should render page subtitle', () => {
      render(<AlbumsPage />);
      expect(screen.getByText('Explora tu colección completa de música')).toBeInTheDocument();
    });
  });

  describe('Search', () => {
    it('should render search input', () => {
      render(<AlbumsPage />);
      expect(screen.getByPlaceholderText('Buscar álbumes...')).toBeInTheDocument();
    });

    it('should update search query on input', () => {
      render(<AlbumsPage />);
      const searchInput = screen.getByPlaceholderText('Buscar álbumes...');

      fireEvent.change(searchInput, { target: { value: 'Album One' } });

      expect(searchInput).toHaveValue('Album One');
    });

    it('should show clear button when search has value', () => {
      render(<AlbumsPage />);
      const searchInput = screen.getByPlaceholderText('Buscar álbumes...');

      fireEvent.change(searchInput, { target: { value: 'test' } });

      expect(screen.getByRole('button', { name: 'Limpiar búsqueda' })).toBeInTheDocument();
    });

    it('should clear search on clear button click', () => {
      render(<AlbumsPage />);
      const searchInput = screen.getByPlaceholderText('Buscar álbumes...');

      fireEvent.change(searchInput, { target: { value: 'test' } });
      fireEvent.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));

      expect(searchInput).toHaveValue('');
    });

    it('should filter albums by search query', () => {
      render(<AlbumsPage />);
      const searchInput = screen.getByPlaceholderText('Buscar álbumes...');

      // Initially all albums shown
      expect(screen.getAllByTestId('album-card')).toHaveLength(3);

      // Filter by title
      fireEvent.change(searchInput, { target: { value: 'Album One' } });

      expect(screen.getAllByTestId('album-card')).toHaveLength(1);
      expect(screen.getByText('Album One')).toBeInTheDocument();
    });
  });

  describe('Sort Options', () => {
    it('should render sort select', () => {
      render(<AlbumsPage />);
      expect(screen.getByText('Ordenar por:')).toBeInTheDocument();
    });

    it('should have recent as default sort option', () => {
      render(<AlbumsPage />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('recent');
    });

    it('should show all sort options', () => {
      render(<AlbumsPage />);

      expect(screen.getByText('Añadidos recientemente')).toBeInTheDocument();
      expect(screen.getByText('Por nombre (A-Z)')).toBeInTheDocument();
      expect(screen.getByText('Por artista (A-Z)')).toBeInTheDocument();
      expect(screen.getByText('Reproducidos recientemente')).toBeInTheDocument();
      expect(screen.getByText('Los más reproducidos')).toBeInTheDocument();
      expect(screen.getByText('Mis favoritos')).toBeInTheDocument();
    });

    it('should change sort option when selected', () => {
      render(<AlbumsPage />);
      const select = screen.getByRole('combobox');

      fireEvent.change(select, { target: { value: 'alphabetical' } });

      expect(select).toHaveValue('alphabetical');
    });
  });

  describe('Albums Display', () => {
    it('should render album grid', () => {
      render(<AlbumsPage />);
      expect(screen.getByTestId('album-grid')).toBeInTheDocument();
    });

    it('should display album cards', () => {
      render(<AlbumsPage />);
      const albumCards = screen.getAllByTestId('album-card');
      expect(albumCards).toHaveLength(3);
    });

    it('should display album titles', () => {
      render(<AlbumsPage />);
      expect(screen.getByText('Album One')).toBeInTheDocument();
      expect(screen.getByText('Album Two')).toBeInTheDocument();
      expect(screen.getByText('Album Three')).toBeInTheDocument();
    });
  });

  describe('Source Tabs', () => {
    it('should show source tabs when servers connected', () => {
      render(<AlbumsPage />);
      expect(screen.getByText('Mi Biblioteca')).toBeInTheDocument();
      expect(screen.getByText('Compartidas')).toBeInTheDocument();
    });

    it('should show server count badge', () => {
      render(<AlbumsPage />);
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should switch to shared library on tab click', () => {
      render(<AlbumsPage />);

      fireEvent.click(screen.getByText('Compartidas'));

      expect(screen.getByRole('heading', { name: 'Bibliotecas Compartidas' })).toBeInTheDocument();
    });

    it('should update URL when switching to shared', () => {
      render(<AlbumsPage />);

      fireEvent.click(screen.getByText('Compartidas'));

      expect(mockSetLocation).toHaveBeenCalledWith('/albums?source=shared');
    });

    it('should switch back to local library', () => {
      render(<AlbumsPage />);

      fireEvent.click(screen.getByText('Compartidas'));
      fireEvent.click(screen.getByText('Mi Biblioteca'));

      expect(screen.getByRole('heading', { name: 'Todos los Álbumes' })).toBeInTheDocument();
    });
  });

  describe('Shared Library', () => {
    it('should show shared album grid when in shared mode', () => {
      render(<AlbumsPage />);

      fireEvent.click(screen.getByText('Compartidas'));

      expect(screen.getByTestId('shared-album-grid')).toBeInTheDocument();
    });

    it('should display shared albums', () => {
      render(<AlbumsPage />);

      fireEvent.click(screen.getByText('Compartidas'));

      expect(screen.getByText('Shared Album')).toBeInTheDocument();
    });

    it('should show different placeholder text in search', () => {
      render(<AlbumsPage />);

      fireEvent.click(screen.getByText('Compartidas'));

      expect(screen.getByPlaceholderText('Buscar en bibliotecas compartidas...')).toBeInTheDocument();
    });

    it('should show shared subtitle', () => {
      render(<AlbumsPage />);

      fireEvent.click(screen.getByText('Compartidas'));

      expect(screen.getByText('Explora la música de tus amigos')).toBeInTheDocument();
    });
  });

  describe('URL Parameter Handling', () => {
    it('should start in shared mode when URL has source=shared', () => {
      mockSearchParams = 'source=shared';

      render(<AlbumsPage />);

      expect(screen.getByRole('heading', { name: 'Bibliotecas Compartidas' })).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should render pagination for paginated sorts', () => {
      render(<AlbumsPage />);
      const select = screen.getByRole('combobox');

      fireEvent.change(select, { target: { value: 'alphabetical' } });

      expect(screen.getAllByTestId('pagination').length).toBeGreaterThan(0);
    });
  });
});
