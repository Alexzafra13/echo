import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MetadataConflictsPanel } from './MetadataConflictsPanel';

// Mock the hooks
vi.mock('../../hooks/useMetadataConflicts', () => ({
  useMetadataConflicts: vi.fn(),
}));

vi.mock('@shared/components/ui', () => ({
  CollapsibleInfo: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="collapsible-info">
      <span>{title}</span>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock('./components', () => ({
  ArtistSidebarItem: ({
    artistName,
    conflictCount,
    isSelected,
    onClick,
  }: {
    artistName: string;
    conflictCount: number;
    isSelected: boolean;
    onClick: () => void;
  }) => (
    <button
      data-testid={`artist-item-${artistName}`}
      data-selected={isSelected}
      onClick={onClick}
    >
      {artistName} ({conflictCount})
    </button>
  ),
  ConflictCard: ({ conflict }: { conflict: { id: string; field: string } }) => (
    <div data-testid={`conflict-card-${conflict.id}`}>
      Conflict: {conflict.field}
    </div>
  ),
}));

import { useMetadataConflicts } from '../../hooks/useMetadataConflicts';

// Mock data
const mockConflictsData = {
  conflicts: [
    {
      id: 'conflict-1',
      entityId: 'artist-1',
      entityType: 'artist' as const,
      field: 'biography',
      currentValue: 'Old bio',
      suggestedValue: 'New bio from LastFM',
      source: 'lastfm' as const,
      status: 'pending' as const,
      priority: 5,
      metadata: { artistName: 'Pink Floyd' },
      createdAt: '2024-01-15T10:00:00Z',
    },
    {
      id: 'conflict-2',
      entityId: 'artist-1',
      entityType: 'artist' as const,
      field: 'image',
      currentValue: null,
      suggestedValue: 'https://example.com/image.jpg',
      source: 'fanart' as const,
      status: 'pending' as const,
      priority: 4,
      metadata: { artistName: 'Pink Floyd' },
      createdAt: '2024-01-15T11:00:00Z',
    },
    {
      id: 'conflict-3',
      entityId: 'artist-2',
      entityType: 'artist' as const,
      field: 'biography',
      currentValue: 'Old bio',
      suggestedValue: 'New bio',
      source: 'musicbrainz' as const,
      status: 'pending' as const,
      priority: 8,
      metadata: { artistName: 'Led Zeppelin' },
      createdAt: '2024-01-15T12:00:00Z',
    },
    {
      id: 'conflict-4',
      entityId: 'artist-3',
      entityType: 'artist' as const,
      field: 'logo',
      currentValue: null,
      suggestedValue: 'https://example.com/logo.png',
      source: 'fanart' as const,
      status: 'pending' as const,
      priority: 3,
      metadata: { artistName: 'The Beatles' },
      createdAt: '2024-01-15T13:00:00Z',
    },
  ],
  total: 4,
  skip: 0,
  take: 100,
};

describe('MetadataConflictsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('should return null when loading', () => {
      vi.mocked(useMetadataConflicts).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as ReturnType<typeof useMetadataConflicts>);

      const { container } = render(<MetadataConflictsPanel />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('empty state', () => {
    it('should return null when no conflicts', () => {
      vi.mocked(useMetadataConflicts).mockReturnValue({
        data: { conflicts: [], total: 0, skip: 0, take: 100 },
        isLoading: false,
        error: null,
      } as ReturnType<typeof useMetadataConflicts>);

      const { container } = render(<MetadataConflictsPanel />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('error state', () => {
    it('should show error message when error occurs', () => {
      vi.mocked(useMetadataConflicts).mockReturnValue({
        data: mockConflictsData,
        isLoading: false,
        error: new Error('Network error'),
      } as ReturnType<typeof useMetadataConflicts>);

      render(<MetadataConflictsPanel />);

      expect(screen.getByText('Error al cargar conflictos')).toBeInTheDocument();
    });
  });

  describe('rendering', () => {
    beforeEach(() => {
      vi.mocked(useMetadataConflicts).mockReturnValue({
        data: mockConflictsData,
        isLoading: false,
        error: null,
      } as ReturnType<typeof useMetadataConflicts>);
    });

    it('should render panel title', () => {
      render(<MetadataConflictsPanel />);

      expect(screen.getByText('Sugerencias de Metadatos')).toBeInTheDocument();
    });

    it('should render total count in description', () => {
      render(<MetadataConflictsPanel />);

      expect(screen.getByText('4 sugerencias pendientes de revisar')).toBeInTheDocument();
    });

    it('should render badge with total count', () => {
      render(<MetadataConflictsPanel />);

      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('should render artists sidebar header', () => {
      render(<MetadataConflictsPanel />);

      expect(screen.getByText('Artistas')).toBeInTheDocument();
    });

    it('should render artist count in sidebar', () => {
      render(<MetadataConflictsPanel />);

      // 3 unique artists
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should render collapsible info section', () => {
      render(<MetadataConflictsPanel />);

      expect(screen.getByTestId('collapsible-info')).toBeInTheDocument();
      expect(screen.getByText('Sobre las sugerencias')).toBeInTheDocument();
    });
  });

  describe('artist grouping', () => {
    beforeEach(() => {
      vi.mocked(useMetadataConflicts).mockReturnValue({
        data: mockConflictsData,
        isLoading: false,
        error: null,
      } as ReturnType<typeof useMetadataConflicts>);
    });

    it('should group conflicts by artist', () => {
      render(<MetadataConflictsPanel />);

      // Pink Floyd has 2 conflicts, Led Zeppelin has 1, The Beatles has 1
      expect(screen.getByTestId('artist-item-Pink Floyd')).toBeInTheDocument();
      expect(screen.getByTestId('artist-item-Led Zeppelin')).toBeInTheDocument();
      expect(screen.getByTestId('artist-item-The Beatles')).toBeInTheDocument();
    });

    it('should show conflict count for each artist', () => {
      render(<MetadataConflictsPanel />);

      expect(screen.getByText('Pink Floyd (2)')).toBeInTheDocument();
      expect(screen.getByText('Led Zeppelin (1)')).toBeInTheDocument();
      expect(screen.getByText('The Beatles (1)')).toBeInTheDocument();
    });

    it('should sort artists by conflict count descending', () => {
      render(<MetadataConflictsPanel />);

      const artistItems = screen.getAllByTestId(/artist-item-/);
      // Pink Floyd has most conflicts (2), should be first
      expect(artistItems[0]).toHaveAttribute('data-testid', 'artist-item-Pink Floyd');
    });

    it('should select first artist by default', () => {
      render(<MetadataConflictsPanel />);

      const pinkFloydItem = screen.getByTestId('artist-item-Pink Floyd');
      expect(pinkFloydItem).toHaveAttribute('data-selected', 'true');
    });
  });

  describe('artist selection', () => {
    beforeEach(() => {
      vi.mocked(useMetadataConflicts).mockReturnValue({
        data: mockConflictsData,
        isLoading: false,
        error: null,
      } as ReturnType<typeof useMetadataConflicts>);
    });

    it('should show conflicts for selected artist', () => {
      render(<MetadataConflictsPanel />);

      // Pink Floyd is selected by default, should show its 2 conflicts
      expect(screen.getByTestId('conflict-card-conflict-1')).toBeInTheDocument();
      expect(screen.getByTestId('conflict-card-conflict-2')).toBeInTheDocument();
    });

    it('should change selection when clicking another artist', () => {
      render(<MetadataConflictsPanel />);

      // Click Led Zeppelin
      fireEvent.click(screen.getByTestId('artist-item-Led Zeppelin'));

      // Led Zeppelin should be selected
      expect(screen.getByTestId('artist-item-Led Zeppelin')).toHaveAttribute(
        'data-selected',
        'true'
      );

      // Pink Floyd should not be selected
      expect(screen.getByTestId('artist-item-Pink Floyd')).toHaveAttribute(
        'data-selected',
        'false'
      );
    });

    it('should show conflicts for newly selected artist', () => {
      render(<MetadataConflictsPanel />);

      // Click Led Zeppelin
      fireEvent.click(screen.getByTestId('artist-item-Led Zeppelin'));

      // Should show Led Zeppelin's conflict
      expect(screen.getByTestId('conflict-card-conflict-3')).toBeInTheDocument();

      // Should not show Pink Floyd's conflicts
      expect(screen.queryByTestId('conflict-card-conflict-1')).not.toBeInTheDocument();
    });
  });

  describe('detail header', () => {
    beforeEach(() => {
      vi.mocked(useMetadataConflicts).mockReturnValue({
        data: mockConflictsData,
        isLoading: false,
        error: null,
      } as ReturnType<typeof useMetadataConflicts>);
    });

    it('should show selected artist name in detail header', () => {
      render(<MetadataConflictsPanel />);

      // Detail title shows artist name
      expect(screen.getByText('Pink Floyd')).toBeInTheDocument();
    });

    it('should show conflict count for selected artist', () => {
      render(<MetadataConflictsPanel />);

      expect(screen.getByText('2 conflictos pendientes')).toBeInTheDocument();
    });

    it('should use singular form for single conflict', () => {
      vi.mocked(useMetadataConflicts).mockReturnValue({
        data: {
          conflicts: [mockConflictsData.conflicts[2]], // Only Led Zeppelin conflict
          total: 1,
          skip: 0,
          take: 100,
        },
        isLoading: false,
        error: null,
      } as ReturnType<typeof useMetadataConflicts>);

      render(<MetadataConflictsPanel />);

      expect(screen.getByText('1 conflicto pendiente')).toBeInTheDocument();
    });
  });

  describe('conflicts without artist name', () => {
    it('should group conflicts without artistName under "Sin Artista"', () => {
      vi.mocked(useMetadataConflicts).mockReturnValue({
        data: {
          conflicts: [
            {
              id: 'conflict-no-artist',
              entityId: 'track-1',
              entityType: 'track' as const,
              field: 'title',
              currentValue: 'Old Title',
              suggestedValue: 'New Title',
              source: 'musicbrainz' as const,
              status: 'pending' as const,
              priority: 8,
              metadata: {}, // No artistName
              createdAt: '2024-01-15T10:00:00Z',
            },
          ],
          total: 1,
          skip: 0,
          take: 100,
        },
        isLoading: false,
        error: null,
      } as ReturnType<typeof useMetadataConflicts>);

      render(<MetadataConflictsPanel />);

      expect(screen.getByTestId('artist-item-Sin Artista')).toBeInTheDocument();
    });
  });

  describe('collapsible info content', () => {
    beforeEach(() => {
      vi.mocked(useMetadataConflicts).mockReturnValue({
        data: mockConflictsData,
        isLoading: false,
        error: null,
      } as ReturnType<typeof useMetadataConflicts>);
    });

    it('should contain information about priority levels', () => {
      render(<MetadataConflictsPanel />);

      expect(screen.getByText(/Alta prioridad/)).toBeInTheDocument();
      expect(screen.getByText(/Media prioridad/)).toBeInTheDocument();
    });

    it('should contain information about actions', () => {
      render(<MetadataConflictsPanel />);

      expect(screen.getByText(/Aceptar:/)).toBeInTheDocument();
      expect(screen.getByText(/Rechazar:/)).toBeInTheDocument();
      expect(screen.getByText(/Ignorar:/)).toBeInTheDocument();
    });
  });
});
