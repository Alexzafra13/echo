import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import RadioPage from './RadioPage';

// Mock layout components
vi.mock('@shared/components/layout/Header', () => ({
  Header: ({ customSearch, customContent }: { customSearch?: React.ReactNode; customContent?: React.ReactNode }) => (
    <header data-testid="header">
      {customSearch}
      {customContent}
    </header>
  ),
}));

vi.mock('@features/home/components', () => ({
  Sidebar: () => <nav data-testid="sidebar">Sidebar</nav>,
}));

vi.mock('@shared/components/ui', () => ({
  Pagination: () => <div data-testid="pagination">Pagination</div>,
}));

// Mock all radio components
vi.mock('../../components', () => ({
  RadioStationCard: ({ station }: { station: { name: string } }) => (
    <div data-testid="station-card">{station.name}</div>
  ),
  RadioSearchBar: ({ placeholder }: { placeholder?: string }) => (
    <input data-testid="search-bar" placeholder={placeholder} readOnly />
  ),
  RadioSearchPanel: () => null,
  CountrySelectButton: () => <button data-testid="country-button">País</button>,
  CountrySelectModal: () => null,
  GenreSelectModal: () => null,
}));

// Mock player context
vi.mock('@features/player/context/PlayerContext', () => ({
  usePlayer: () => ({
    playRadio: vi.fn(),
    currentRadioStation: null,
    isPlaying: false,
    isRadioMode: false,
    radioMetadata: null,
  }),
}));

// Mock shared hooks
vi.mock('@shared/hooks', () => ({
  useModal: () => ({ isOpen: false, open: vi.fn(), close: vi.fn() }),
  useDocumentTitle: vi.fn(),
}));

vi.mock('@features/home/hooks', () => ({
  useGridDimensions: () => ({ itemsPerPage: 12 }),
}));

// Station data for tests
const mockStations = [
  { stationuuid: '1', name: 'Radio Nacional', url: 'http://radio1.com' },
  { stationuuid: '2', name: 'Radio Pop', url: 'http://radio2.com' },
];

// Mock radio hooks with data
vi.mock('../../hooks', () => ({
  useUserCountry: () => ({ data: { countryCode: 'ES' } }),
  useSearchStations: () => ({ data: [], isLoading: false }),
  useFavoriteStations: () => ({ data: [], isLoading: false }),
  useSaveFavoriteFromApi: () => ({ mutateAsync: vi.fn() }),
  useDeleteFavoriteStation: () => ({ mutateAsync: vi.fn() }),
  useRadioCountries: () => ({ data: [] }),
  useFilteredStations: () => ({
    stations: mockStations,
    isLoading: false,
  }),
}));

// Mock radio service
vi.mock('../../services', () => ({
  radioService: { convertToSaveDto: vi.fn((s) => s) },
}));

// Mock constants
vi.mock('../../constants', () => ({
  POPULAR_COUNTRIES: [{ code: 'ES', name: 'España', flag: '🇪🇸' }],
  GENRES: [
    { id: 'top', label: 'Top', icon: '⭐' },
    { id: 'all', label: 'Todas', icon: '📻' },
  ],
}));

// Mock utils
vi.mock('../../utils/country.utils', () => ({
  getCountryFlag: () => '🏳️',
  getCountryName: (_: string, name: string) => name,
}));

vi.mock('@shared/utils/logger', () => ({
  logger: { error: vi.fn() },
}));

describe('RadioPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Layout', () => {
    it('should render sidebar', () => {
      render(<RadioPage />);
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('should render header', () => {
      render(<RadioPage />);
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('should render page title', () => {
      render(<RadioPage />);
      expect(screen.getByRole('heading', { name: 'Radio' })).toBeInTheDocument();
    });

    it('should render page subtitle', () => {
      render(<RadioPage />);
      expect(screen.getByText('Descubre emisoras de radio de todo el mundo')).toBeInTheDocument();
    });
  });

  describe('Search', () => {
    it('should render search bar', () => {
      render(<RadioPage />);
      expect(screen.getByTestId('search-bar')).toBeInTheDocument();
    });

    it('should have search placeholder', () => {
      render(<RadioPage />);
      expect(screen.getByPlaceholderText(/buscar emisora/i)).toBeInTheDocument();
    });
  });

  describe('Country Selection', () => {
    it('should render country button', () => {
      render(<RadioPage />);
      expect(screen.getByTestId('country-button')).toBeInTheDocument();
    });
  });

  describe('Genre Filter', () => {
    it('should render genre button', () => {
      render(<RadioPage />);
      expect(screen.getByText(/género/i)).toBeInTheDocument();
    });
  });

  describe('Station Display', () => {
    it('should render station cards', () => {
      render(<RadioPage />);
      const cards = screen.getAllByTestId('station-card');
      expect(cards.length).toBe(2);
    });

    it('should display station names', () => {
      render(<RadioPage />);
      expect(screen.getByText('Radio Nacional')).toBeInTheDocument();
      expect(screen.getByText('Radio Pop')).toBeInTheDocument();
    });

    it('should show station count', () => {
      render(<RadioPage />);
      expect(screen.getByText(/2 emisoras/)).toBeInTheDocument();
    });
  });

  describe('Section Header', () => {
    it('should render section heading', () => {
      render(<RadioPage />);
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(1);
    });
  });
});
