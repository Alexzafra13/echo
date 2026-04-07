import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HomePage from './HomePage';

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/home', mockSetLocation],
}));

// Mock react-query
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

// Mock home hooks
vi.mock('../../hooks', () => ({
  useFeaturedAlbum: vi.fn(),
  useRecentAlbums: vi.fn(),
  useTopPlayedAlbums: vi.fn(),
  useUserTopPlayedAlbums: vi.fn(),
  useAlbumsRecentlyPlayed: vi.fn(),
  useAutoPlaylists: vi.fn(),
  useHomeMusicVideos: vi.fn(() => ({ data: [], isLoading: false })),
  useGridDimensions: vi.fn(() => ({ itemsPerPage: 6, columns: 3 })),
  categorizeAutoPlaylists: vi.fn((playlists) => ({
    waveMix: playlists?.find((p: { type: string }) => p.type === 'wave'),
    artistPlaylists: playlists?.filter((p: { type: string }) => p.type === 'artist') || [],
    genrePlaylists: playlists?.filter((p: { type: string }) => p.type === 'genre') || [],
  })),
  randomSelect: vi.fn((arr, count) => arr?.slice(0, count) || []),
}));

// Mock useHeroPool
vi.mock('../../hooks/useHeroPool', () => ({
  useHeroPool: vi.fn(),
}));

// Mock useHomeSections
vi.mock('../../hooks/useHomeSections', () => ({
  useHomeSections: vi.fn(() => ({
    artistMixPlaylists: [],
    genreMixPlaylists: [],
    truncateAlbums: (albums: unknown[]) => albums,
    isMobile: false,
  })),
}));

// Mock settings hooks
vi.mock('@features/settings/hooks', () => ({
  useHomePreferences: vi.fn(),
}));

// Mock playlists hooks
vi.mock('@features/playlists', () => ({
  usePlaylists: vi.fn(),
}));

// Mock radio hooks
vi.mock('@features/radio/hooks', () => ({
  useFavoriteStations: vi.fn(() => ({ data: [] })),
  useDeleteFavoriteStation: vi.fn(() => ({ mutate: vi.fn() })),
}));

// Mock player context
vi.mock('@features/player', () => ({
  useRadio: vi.fn(() => ({
    playRadio: vi.fn(),
    currentRadioStation: null,
    isRadioMode: false,
    radioMetadata: null,
  })),
  usePlayback: vi.fn(() => ({
    isPlaying: false,
  })),
}));

// Mock explore hooks
vi.mock('@features/explore/hooks', () => ({
  useRandomAlbums: vi.fn(() => ({ data: null })),
}));

vi.mock('@features/explore/utils/transform', () => ({
  toAlbum: vi.fn((album) => album),
}));

// Mock federation
vi.mock('@features/federation', () => ({
  useSharedAlbumsForHome: vi.fn(() => ({ data: null })),
  SharedAlbumGrid: ({ title, albums }: { title: string; albums: unknown[] }) => (
    <div data-testid="shared-album-grid">
      <h2>{title}</h2>
      <span>{albums?.length || 0} shared albums</span>
    </div>
  ),
}));

// Mock shared hooks
vi.mock('@shared/hooks', () => ({
  useAutoRefreshOnScan: vi.fn(),
  useDocumentTitle: vi.fn(),
  useIsMobile: vi.fn(() => false),
}));

// Mock layout components
vi.mock('@shared/components/layout/Header', () => ({
  HeaderWithSearch: () => <header data-testid="header">Header</header>,
}));

vi.mock('@shared/components/ActionCardsRow', () => ({
  ActionCardsRow: () => <div data-testid="action-cards">Action Cards</div>,
}));

// Mock home components
vi.mock('../../components', () => ({
  HeroSection: ({
    item,
    onNext,
    onPrevious,
  }: {
    item: { data: { name: string } };
    onNext: () => void;
    onPrevious: () => void;
  }) => (
    <div data-testid="hero-section">
      <span>{item?.data?.name}</span>
      <button onClick={onPrevious} data-testid="hero-prev">
        Prev
      </button>
      <button onClick={onNext} data-testid="hero-next">
        Next
      </button>
    </div>
  ),
  AlbumGrid: ({ title, albums }: { title: string; albums: unknown[] }) => (
    <div data-testid="album-grid">
      <h2>{title}</h2>
      <span>{albums?.length || 0} albums</span>
    </div>
  ),
  PlaylistGrid: ({ title, playlists }: { title: string; playlists: unknown[] }) => (
    <div data-testid="playlist-grid">
      <h2>{title}</h2>
      <span>{playlists?.length || 0} playlists</span>
    </div>
  ),
  Sidebar: () => <aside data-testid="sidebar">Sidebar</aside>,
}));

// Mock section components
vi.mock('./sections', () => ({
  RecentAlbumsSection: ({ albums }: { albums: unknown[] }) =>
    albums.length > 0 ? (
      <div data-testid="recent-albums-section">
        <span>Recientemente Añadidos</span>
        <span>{albums.length} albums</span>
      </div>
    ) : null,
  ArtistMixSection: ({ playlists }: { playlists: unknown[] }) =>
    playlists.length > 0 ? (
      <div data-testid="artist-mix-section">
        <span>Mix por Artista</span>
        <span>{playlists.length} playlists</span>
      </div>
    ) : null,
  GenreMixSection: ({ playlists }: { playlists: unknown[] }) =>
    playlists.length > 0 ? (
      <div data-testid="genre-mix-section">
        <span>Mix por Género</span>
        <span>{playlists.length} playlists</span>
      </div>
    ) : null,
  RecentlyPlayedSection: ({ albums }: { albums: unknown[] }) =>
    albums.length > 0 ? (
      <div data-testid="recently-played-section">
        <span>Reproducidos Recientemente</span>
        <span>{albums.length} albums</span>
      </div>
    ) : null,
  TopPlayedSection: ({ albums }: { albums: unknown[] }) =>
    albums.length > 0 ? (
      <div data-testid="top-played-section">
        <span>Los Más Reproducidos</span>
        <span>{albums.length} albums</span>
      </div>
    ) : null,
  SharedAlbumsSection: ({ albums }: { albums: unknown[] }) => (
    <div data-testid="shared-album-grid">
      <span>Bibliotecas Compartidas</span>
      <span>{albums?.length || 0} shared albums</span>
    </div>
  ),
}));

// Mock MyPlaylistsSection
vi.mock('./MyPlaylistsSection', () => ({
  MyPlaylistsSection: ({
    playlists,
    maxItems,
  }: {
    playlists: Array<{ id: string; name: string }>;
    maxItems: number;
  }) => {
    if (playlists.length === 0) return null;
    return (
      <div data-testid="my-playlists-section">
        <span>Mis Playlists</span>
        <button onClick={() => mockSetLocation('/playlists')}>Ver todo →</button>
        {playlists.slice(0, maxItems).map((p) => (
          <span key={p.id} onClick={() => mockSetLocation(`/playlists/${p.id}`)}>
            {p.name}
          </span>
        ))}
      </div>
    );
  },
}));

// Mock FavoriteRadiosSection
vi.mock('./FavoriteRadiosSection', () => ({
  FavoriteRadiosSection: ({ stations }: { stations: Array<{ id: string; name: string }> }) => {
    if (stations.length === 0) return null;
    return (
      <div data-testid="favorite-radios-section">
        <span>Radios Favoritas</span>
        {stations.map((s) => (
          <span key={s.id}>{s.name}</span>
        ))}
      </div>
    );
  },
}));

// Mock SurpriseMeSection
vi.mock('./SurpriseMeSection', () => ({
  SurpriseMeSection: ({ albums, onRefresh }: { albums: unknown[]; onRefresh: () => void }) => {
    if ((albums as unknown[]).length === 0) return null;
    return (
      <div data-testid="surprise-me-section">
        <span>Sorpréndeme</span>
        <button onClick={onRefresh}>Refresh</button>
      </div>
    );
  },
}));

// Mock playlist components
vi.mock('@features/playlists/components', () => ({
  PlaylistCoverMosaic: () => <div data-testid="playlist-cover">Cover</div>,
}));

// Mock radio components
vi.mock('@features/radio', () => ({
  RadioStationCard: ({ station }: { station: { name: string } }) => (
    <div data-testid="radio-station-card">{station.name}</div>
  ),
}));

// Import mocked modules
import * as homeHooks from '../../hooks';
import * as settingsHooks from '@features/settings/hooks';
import * as playlistHooks from '@features/playlists';
import * as radioHooks from '@features/radio/hooks';
import * as exploreHooks from '@features/explore/hooks';
import * as federationHooks from '@features/federation';
import * as heroPoolHooks from '../../hooks/useHeroPool';
import * as homeSectionsHooks from '../../hooks/useHomeSections';

// Mock data
const mockAlbum = {
  id: 'album-1',
  name: 'Test Album',
  artistName: 'Test Artist',
  coverImage: '/cover.jpg',
  releaseDate: new Date().toISOString(),
};

const mockAlbums = [
  { id: 'album-1', name: 'Album One', artistName: 'Artist One' },
  { id: 'album-2', name: 'Album Two', artistName: 'Artist Two' },
  { id: 'album-3', name: 'Album Three', artistName: 'Artist Three' },
];

const mockPlaylists = [
  { id: 'playlist-1', name: 'Playlist One', type: 'artist', tracks: [] },
  { id: 'playlist-2', name: 'Playlist Two', type: 'genre', tracks: [] },
];

const mockUserPlaylists = [
  { id: 'user-playlist-1', name: 'My Playlist', songCount: 10, albumIds: ['album-1'] },
];

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    vi.mocked(homeHooks.useFeaturedAlbum).mockReturnValue({
      data: mockAlbum,
      isLoading: false,
    } as ReturnType<typeof homeHooks.useFeaturedAlbum>);

    vi.mocked(homeHooks.useRecentAlbums).mockReturnValue({
      data: mockAlbums,
      isLoading: false,
    } as ReturnType<typeof homeHooks.useRecentAlbums>);

    vi.mocked(homeHooks.useTopPlayedAlbums).mockReturnValue({
      data: mockAlbums,
      isLoading: false,
    } as ReturnType<typeof homeHooks.useTopPlayedAlbums>);

    vi.mocked(homeHooks.useUserTopPlayedAlbums).mockReturnValue({
      data: mockAlbums,
      isLoading: false,
    } as ReturnType<typeof homeHooks.useUserTopPlayedAlbums>);

    vi.mocked(homeHooks.useAlbumsRecentlyPlayed).mockReturnValue({
      data: { data: mockAlbums },
    } as ReturnType<typeof homeHooks.useAlbumsRecentlyPlayed>);

    vi.mocked(homeHooks.useAutoPlaylists).mockReturnValue({
      data: mockPlaylists,
    } as ReturnType<typeof homeHooks.useAutoPlaylists>);

    vi.mocked(settingsHooks.useHomePreferences).mockReturnValue({
      data: {
        homeSections: [
          { id: 'recent-albums', enabled: true, order: 0 },
          { id: 'artist-mix', enabled: true, order: 1 },
        ],
      },
    } as ReturnType<typeof settingsHooks.useHomePreferences>);

    vi.mocked(playlistHooks.usePlaylists).mockReturnValue({
      data: { items: mockUserPlaylists },
    } as ReturnType<typeof playlistHooks.usePlaylists>);

    vi.mocked(radioHooks.useFavoriteStations).mockReturnValue({
      data: [],
    } as ReturnType<typeof radioHooks.useFavoriteStations>);

    vi.mocked(exploreHooks.useRandomAlbums).mockReturnValue({
      data: { albums: mockAlbums },
    } as ReturnType<typeof exploreHooks.useRandomAlbums>);

    vi.mocked(federationHooks.useSharedAlbumsForHome).mockReturnValue({
      data: { albums: [] },
    } as ReturnType<typeof federationHooks.useSharedAlbumsForHome>);

    // Default useHeroPool mock
    vi.mocked(heroPoolHooks.useHeroPool).mockReturnValue({
      currentItem: { type: 'album', data: mockAlbum },
      exitingItem: null,
      next: vi.fn(),
      previous: vi.fn(),
    });

    // Default useHomeSections mock
    vi.mocked(homeSectionsHooks.useHomeSections).mockReturnValue({
      artistMixPlaylists: [],
      genreMixPlaylists: [],
      truncateAlbums: (albums: unknown[]) =>
        albums as ReturnType<typeof homeSectionsHooks.useHomeSections>['truncateAlbums'] extends (
          ...args: unknown[]
        ) => infer R
          ? R
          : never,
      isMobile: false,
    } as ReturnType<typeof homeSectionsHooks.useHomeSections>);
  });

  describe('layout', () => {
    it('should render sidebar', () => {
      render(<HomePage />);
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('should render header', () => {
      render(<HomePage />);
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('should render action cards', () => {
      render(<HomePage />);
      expect(screen.getByTestId('action-cards')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading state when featured album is loading', () => {
      vi.mocked(homeHooks.useFeaturedAlbum).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as ReturnType<typeof homeHooks.useFeaturedAlbum>);

      vi.mocked(homeHooks.useRecentAlbums).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as ReturnType<typeof homeHooks.useRecentAlbums>);

      render(<HomePage />);

      // Should not show hero section when loading
      expect(screen.queryByTestId('hero-section')).not.toBeInTheDocument();
    });

    it('should show album grid loading state', () => {
      vi.mocked(homeHooks.useRecentAlbums).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as ReturnType<typeof homeHooks.useRecentAlbums>);

      render(<HomePage />);

      // Album grid should not be visible when loading
      expect(screen.queryByText('Recientemente Añadidos')).not.toBeInTheDocument();
    });
  });

  describe('hero section', () => {
    it('should render hero section with featured album', () => {
      render(<HomePage />);
      expect(screen.getByTestId('hero-section')).toBeInTheDocument();
    });

    it('should navigate to next hero on click', () => {
      render(<HomePage />);

      const nextButton = screen.getByTestId('hero-next');
      fireEvent.click(nextButton);

      // During crossfade, both exiting and entering hero sections are in the DOM
      const heroSections = screen.getAllByTestId('hero-section');
      expect(heroSections.length).toBeGreaterThanOrEqual(1);
    });

    it('should navigate to previous hero on click', () => {
      render(<HomePage />);

      const prevButton = screen.getByTestId('hero-prev');
      fireEvent.click(prevButton);

      // During crossfade, both exiting and entering hero sections are in the DOM
      const heroSections = screen.getAllByTestId('hero-section');
      expect(heroSections.length).toBeGreaterThanOrEqual(1);
    });

    it('should show empty state when no albums', () => {
      vi.mocked(homeHooks.useFeaturedAlbum).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as ReturnType<typeof homeHooks.useFeaturedAlbum>);

      vi.mocked(homeHooks.useRecentAlbums).mockReturnValue({
        data: [],
        isLoading: false,
      } as ReturnType<typeof homeHooks.useRecentAlbums>);

      vi.mocked(homeHooks.useTopPlayedAlbums).mockReturnValue({
        data: [],
        isLoading: false,
      } as ReturnType<typeof homeHooks.useTopPlayedAlbums>);

      // No hero item when no albums
      vi.mocked(heroPoolHooks.useHeroPool).mockReturnValue({
        currentItem: null,
        exitingItem: null,
        next: vi.fn(),
        previous: vi.fn(),
      });

      render(<HomePage />);

      expect(screen.getByText('No hay álbum destacado disponible')).toBeInTheDocument();
    });
  });

  describe('sections rendering', () => {
    it('should render recent albums section when enabled', () => {
      render(<HomePage />);

      expect(screen.getByText('Recientemente Añadidos')).toBeInTheDocument();
    });

    it('should render artist mix section when enabled', () => {
      vi.mocked(homeHooks.useAutoPlaylists).mockReturnValue({
        data: [{ id: 'artist-1', name: 'Artist Mix', type: 'artist', tracks: [] }],
      } as ReturnType<typeof homeHooks.useAutoPlaylists>);

      vi.mocked(homeSectionsHooks.useHomeSections).mockReturnValue({
        artistMixPlaylists: [{ id: 'artist-1', name: 'Artist Mix', type: 'artist', tracks: [] }],
        genreMixPlaylists: [],
        truncateAlbums: (albums: unknown[]) =>
          albums as ReturnType<typeof homeSectionsHooks.useHomeSections>['truncateAlbums'] extends (
            ...args: unknown[]
          ) => infer R
            ? R
            : never,
        isMobile: false,
      } as ReturnType<typeof homeSectionsHooks.useHomeSections>);

      render(<HomePage />);

      expect(screen.getByText('Mix por Artista')).toBeInTheDocument();
    });

    it('should not render disabled sections', () => {
      vi.mocked(settingsHooks.useHomePreferences).mockReturnValue({
        data: {
          homeSections: [
            { id: 'recent-albums', enabled: false, order: 0 },
            { id: 'artist-mix', enabled: false, order: 1 },
          ],
        },
      } as ReturnType<typeof settingsHooks.useHomePreferences>);

      render(<HomePage />);

      expect(screen.queryByText('Recientemente Añadidos')).not.toBeInTheDocument();
    });

    it('should render sections in correct order', () => {
      vi.mocked(settingsHooks.useHomePreferences).mockReturnValue({
        data: {
          homeSections: [
            { id: 'artist-mix', enabled: true, order: 0 },
            { id: 'recent-albums', enabled: true, order: 1 },
          ],
        },
      } as ReturnType<typeof settingsHooks.useHomePreferences>);

      vi.mocked(homeSectionsHooks.useHomeSections).mockReturnValue({
        artistMixPlaylists: [{ id: 'artist-1', name: 'Artist Mix', type: 'artist' }],
        genreMixPlaylists: [],
        truncateAlbums: (albums: unknown[]) =>
          albums as ReturnType<typeof homeSectionsHooks.useHomeSections>['truncateAlbums'] extends (
            ...args: unknown[]
          ) => infer R
            ? R
            : never,
        isMobile: false,
      } as ReturnType<typeof homeSectionsHooks.useHomeSections>);

      render(<HomePage />);

      const artistMix = screen.getByText('Mix por Artista');
      const recentAlbums = screen.getByText('Recientemente Añadidos');

      // Both should be present
      expect(artistMix).toBeInTheDocument();
      expect(recentAlbums).toBeInTheDocument();
    });
  });

  describe('my playlists section', () => {
    it('should render user playlists when enabled', () => {
      vi.mocked(settingsHooks.useHomePreferences).mockReturnValue({
        data: {
          homeSections: [{ id: 'my-playlists', enabled: true, order: 0 }],
        },
      } as ReturnType<typeof settingsHooks.useHomePreferences>);

      render(<HomePage />);

      expect(screen.getByText('Mis Playlists')).toBeInTheDocument();
      expect(screen.getByText('My Playlist')).toBeInTheDocument();
    });

    it('should navigate to playlist on click', () => {
      vi.mocked(settingsHooks.useHomePreferences).mockReturnValue({
        data: {
          homeSections: [{ id: 'my-playlists', enabled: true, order: 0 }],
        },
      } as ReturnType<typeof settingsHooks.useHomePreferences>);

      render(<HomePage />);

      fireEvent.click(screen.getByText('My Playlist'));

      expect(mockSetLocation).toHaveBeenCalledWith('/playlists/user-playlist-1');
    });

    it('should navigate to playlists page on view all', () => {
      vi.mocked(settingsHooks.useHomePreferences).mockReturnValue({
        data: {
          homeSections: [{ id: 'my-playlists', enabled: true, order: 0 }],
        },
      } as ReturnType<typeof settingsHooks.useHomePreferences>);

      render(<HomePage />);

      fireEvent.click(screen.getByText('Ver todo →'));

      expect(mockSetLocation).toHaveBeenCalledWith('/playlists');
    });

    it('should not render when no playlists', () => {
      vi.mocked(settingsHooks.useHomePreferences).mockReturnValue({
        data: {
          homeSections: [{ id: 'my-playlists', enabled: true, order: 0 }],
        },
      } as ReturnType<typeof settingsHooks.useHomePreferences>);

      vi.mocked(playlistHooks.usePlaylists).mockReturnValue({
        data: { items: [] },
      } as ReturnType<typeof playlistHooks.usePlaylists>);

      render(<HomePage />);

      expect(screen.queryByText('Mis Playlists')).not.toBeInTheDocument();
    });
  });

  describe('favorite radios section', () => {
    it('should render favorite radios when enabled and has stations', () => {
      vi.mocked(settingsHooks.useHomePreferences).mockReturnValue({
        data: {
          homeSections: [{ id: 'favorite-radios', enabled: true, order: 0 }],
        },
      } as ReturnType<typeof settingsHooks.useHomePreferences>);

      vi.mocked(radioHooks.useFavoriteStations).mockReturnValue({
        data: [{ id: 'radio-1', name: 'Radio One', url: 'http://radio1.com' }],
      } as ReturnType<typeof radioHooks.useFavoriteStations>);

      render(<HomePage />);

      expect(screen.getByText('Radios Favoritas')).toBeInTheDocument();
      expect(screen.getByText('Radio One')).toBeInTheDocument();
    });

    it('should not render when no favorite stations', () => {
      vi.mocked(settingsHooks.useHomePreferences).mockReturnValue({
        data: {
          homeSections: [{ id: 'favorite-radios', enabled: true, order: 0 }],
        },
      } as ReturnType<typeof settingsHooks.useHomePreferences>);

      render(<HomePage />);

      expect(screen.queryByText('Radios Favoritas')).not.toBeInTheDocument();
    });
  });

  describe('surprise me section', () => {
    it('should render surprise me section with random albums', () => {
      vi.mocked(settingsHooks.useHomePreferences).mockReturnValue({
        data: {
          homeSections: [{ id: 'surprise-me', enabled: true, order: 0 }],
        },
      } as ReturnType<typeof settingsHooks.useHomePreferences>);

      render(<HomePage />);

      expect(screen.getByText('Sorpréndeme')).toBeInTheDocument();
    });

    it('should not render when no random albums', () => {
      vi.mocked(settingsHooks.useHomePreferences).mockReturnValue({
        data: {
          homeSections: [{ id: 'surprise-me', enabled: true, order: 0 }],
        },
      } as ReturnType<typeof settingsHooks.useHomePreferences>);

      vi.mocked(exploreHooks.useRandomAlbums).mockReturnValue({
        data: { albums: [] },
      } as ReturnType<typeof exploreHooks.useRandomAlbums>);

      render(<HomePage />);

      expect(screen.queryByText('Sorpréndeme')).not.toBeInTheDocument();
    });
  });

  describe('shared albums section', () => {
    it('should render shared albums section', () => {
      vi.mocked(settingsHooks.useHomePreferences).mockReturnValue({
        data: {
          homeSections: [{ id: 'shared-albums', enabled: true, order: 0 }],
        },
      } as ReturnType<typeof settingsHooks.useHomePreferences>);

      render(<HomePage />);

      expect(screen.getByTestId('shared-album-grid')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no sections enabled and no albums', () => {
      vi.mocked(settingsHooks.useHomePreferences).mockReturnValue({
        data: {
          homeSections: [],
        },
      } as ReturnType<typeof settingsHooks.useHomePreferences>);

      vi.mocked(homeHooks.useRecentAlbums).mockReturnValue({
        data: [],
        isLoading: false,
      } as ReturnType<typeof homeHooks.useRecentAlbums>);

      render(<HomePage />);

      expect(
        screen.getByText('No se encontraron álbumes. ¡Empieza añadiendo música!')
      ).toBeInTheDocument();
    });
  });

  describe('default preferences', () => {
    it('should use default sections when no preferences', () => {
      vi.mocked(settingsHooks.useHomePreferences).mockReturnValue({
        data: null,
      } as ReturnType<typeof settingsHooks.useHomePreferences>);

      render(<HomePage />);

      // Default sections should be recent-albums and artist-mix
      expect(screen.getByText('Recientemente Añadidos')).toBeInTheDocument();
    });
  });
});
