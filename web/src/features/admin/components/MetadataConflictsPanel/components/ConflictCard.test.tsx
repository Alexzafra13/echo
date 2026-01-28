import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConflictCard } from './ConflictCard';
import type { MetadataConflict } from '../../../hooks/useMetadataConflicts';

// Mock hooks
const mockAccept = vi.fn();
const mockReject = vi.fn();
const mockIgnore = vi.fn();
const mockApplySuggestion = vi.fn();

vi.mock('../../../hooks/useMetadataConflicts', () => ({
  useAcceptConflict: () => ({
    mutate: mockAccept,
    isPending: false,
  }),
  useRejectConflict: () => ({
    mutate: mockReject,
    isPending: false,
  }),
  useIgnoreConflict: () => ({
    mutate: mockIgnore,
    isPending: false,
  }),
  useApplySuggestion: () => ({
    mutate: mockApplySuggestion,
    isPending: false,
  }),
}));

// Mock logger
vi.mock('@shared/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock child components
vi.mock('./ImageWithFallback', () => ({
  ImageWithFallback: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} data-testid="image-with-fallback" />
  ),
}));

vi.mock('./SourceBadge', () => ({
  SourceBadge: ({ source }: { source: string }) => (
    <span data-testid="source-badge">{source}</span>
  ),
}));

// Mock UI components
vi.mock('@shared/components/ui', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    loading,
    leftIcon,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
    leftIcon?: React.ReactNode;
  }) => (
    <button onClick={onClick} disabled={disabled || loading} data-loading={loading}>
      {leftIcon}
      {children}
    </button>
  ),
  InlineNotification: ({
    type,
    message,
    onDismiss,
  }: {
    type: string;
    message: string;
    onDismiss: () => void;
  }) => (
    <div data-testid="notification" data-type={type}>
      {message}
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  ),
}));

// Mock data
const mockTextConflict: MetadataConflict = {
  id: 'conflict-1',
  entityId: 'album-1',
  entityType: 'album',
  field: 'biography',
  currentValue: 'Old biography text',
  suggestedValue: 'New biography text from external source',
  source: 'lastfm',
  createdAt: '2024-01-15T10:00:00Z',
  entity: {
    id: 'album-1',
    name: 'The Dark Side of the Moon',
    type: 'album',
  },
};

const mockImageConflict: MetadataConflict = {
  id: 'conflict-2',
  entityId: 'album-2',
  entityType: 'album',
  field: 'externalCover',
  currentValue: '/api/images/albums/album-2/cover',
  suggestedValue: 'https://external.com/cover.jpg',
  source: 'fanart',
  createdAt: '2024-01-15T10:00:00Z',
  entity: {
    id: 'album-2',
    name: 'Abbey Road',
    type: 'album',
  },
  metadata: {
    currentResolution: '500x500',
    suggestedResolution: '1000x1000',
    qualityImprovement: true,
  },
};

const mockLowQualityConflict: MetadataConflict = {
  id: 'conflict-3',
  entityId: 'album-3',
  entityType: 'album',
  field: 'cover',
  currentValue: '/api/images/albums/album-3/cover',
  suggestedValue: 'https://external.com/lowres.jpg',
  source: 'lastfm',
  createdAt: '2024-01-15T10:00:00Z',
  entity: {
    id: 'album-3',
    name: 'Low Quality Album',
    type: 'album',
  },
  metadata: {
    isLowQuality: true,
    currentResolution: '1000x1000',
    suggestedResolution: 'Desconocida',
  },
};

const mockMultiSuggestionConflict: MetadataConflict = {
  id: 'conflict-4',
  entityId: 'album-4',
  entityType: 'album',
  field: 'year',
  currentValue: '1971',
  suggestedValue: '1972',
  source: 'musicbrainz',
  createdAt: '2024-01-15T10:00:00Z',
  entity: {
    id: 'album-4',
    name: 'Led Zeppelin IV',
    type: 'album',
  },
  metadata: {
    suggestions: [
      {
        name: 'Led Zeppelin IV (Original)',
        mbid: 'mbid-1',
        score: 95,
        details: {
          artistName: 'Led Zeppelin',
          country: 'UK',
          primaryType: 'Album',
        },
      },
      {
        name: 'Led Zeppelin IV (Remaster)',
        mbid: 'mbid-2',
        score: 85,
        details: {
          artistName: 'Led Zeppelin',
          country: 'UK',
          primaryType: 'Album',
          disambiguation: '2014 Remaster',
        },
      },
      {
        name: 'Led Zeppelin IV (Deluxe)',
        mbid: 'mbid-3',
        score: 75,
        details: {
          artistName: 'Led Zeppelin',
          country: 'UK',
          primaryType: 'Album',
        },
      },
      {
        name: 'Led Zeppelin IV (Japan)',
        mbid: 'mbid-4',
        score: 65,
        details: {
          artistName: 'Led Zeppelin',
          country: 'JP',
          primaryType: 'Album',
        },
      },
    ],
  },
};

const mockNoCoverConflict: MetadataConflict = {
  id: 'conflict-5',
  entityId: 'album-5',
  entityType: 'album',
  field: 'externalCover',
  currentValue: '',
  suggestedValue: 'https://external.com/new-cover.jpg',
  source: 'fanart',
  createdAt: '2024-01-15T10:00:00Z',
  entity: {
    id: 'album-5',
    name: 'Album Without Cover',
    type: 'album',
  },
};

describe('ConflictCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render entity name', () => {
      render(<ConflictCard conflict={mockTextConflict} />);

      expect(screen.getByText('The Dark Side of the Moon')).toBeInTheDocument();
    });

    it('should render field badge with translated label', () => {
      render(<ConflictCard conflict={mockTextConflict} />);

      expect(screen.getByText('Biografía')).toBeInTheDocument();
    });

    it('should render source badge', () => {
      render(<ConflictCard conflict={mockTextConflict} />);

      expect(screen.getByTestId('source-badge')).toBeInTheDocument();
      expect(screen.getByText('lastfm')).toBeInTheDocument();
    });

    it('should render "Actual" and "Sugerida" labels', () => {
      render(<ConflictCard conflict={mockTextConflict} />);

      expect(screen.getByText('Actual')).toBeInTheDocument();
      expect(screen.getByText('Sugerida')).toBeInTheDocument();
    });

    it('should render VS divider', () => {
      render(<ConflictCard conflict={mockTextConflict} />);

      expect(screen.getByText('VS')).toBeInTheDocument();
    });

    it('should render "Desconocido" when entity name is missing', () => {
      const conflictWithoutName = {
        ...mockTextConflict,
        entity: undefined,
      };

      render(<ConflictCard conflict={conflictWithoutName} />);

      expect(screen.getByText('Desconocido')).toBeInTheDocument();
    });
  });

  describe('text conflicts', () => {
    it('should render current text value', () => {
      render(<ConflictCard conflict={mockTextConflict} />);

      expect(screen.getByText('Old biography text')).toBeInTheDocument();
    });

    it('should render suggested text value', () => {
      render(<ConflictCard conflict={mockTextConflict} />);

      expect(screen.getByText('New biography text from external source')).toBeInTheDocument();
    });

    it('should render "Sin datos" for empty current value', () => {
      const conflictWithEmptyValue = {
        ...mockTextConflict,
        currentValue: '',
      };

      render(<ConflictCard conflict={conflictWithEmptyValue} />);

      expect(screen.getByText('Sin datos')).toBeInTheDocument();
    });
  });

  describe('image conflicts', () => {
    it('should render image comparison for cover fields', () => {
      render(<ConflictCard conflict={mockImageConflict} />);

      expect(screen.getByTestId('image-with-fallback')).toBeInTheDocument();
    });

    it('should render current resolution', () => {
      render(<ConflictCard conflict={mockImageConflict} />);

      expect(screen.getByText('500x500')).toBeInTheDocument();
    });

    it('should render suggested resolution', () => {
      render(<ConflictCard conflict={mockImageConflict} />);

      expect(screen.getByText('1000x1000')).toBeInTheDocument();
    });

    it('should render quality improvement badge', () => {
      render(<ConflictCard conflict={mockImageConflict} />);

      expect(screen.getByText('Mejora de calidad')).toBeInTheDocument();
    });

    it('should render low quality badge', () => {
      render(<ConflictCard conflict={mockLowQualityConflict} />);

      expect(screen.getByText('Baja resolución')).toBeInTheDocument();
    });

    it('should render "Resolución no disponible" when resolution is unknown', () => {
      render(<ConflictCard conflict={mockLowQualityConflict} />);

      // Check for the "Resolución no disponible" text (appears for suggested side when resolution is "Desconocida")
      const notAvailableElements = screen.getAllByText('Resolución no disponible');
      expect(notAvailableElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should render empty image placeholder when no current cover', () => {
      render(<ConflictCard conflict={mockNoCoverConflict} />);

      expect(screen.getByText('Sin carátula actual')).toBeInTheDocument();
    });
  });

  describe('field labels', () => {
    it('should translate externalCover to "Cover Externa"', () => {
      render(<ConflictCard conflict={mockImageConflict} />);

      expect(screen.getByText('Cover Externa')).toBeInTheDocument();
    });

    it('should translate cover to "Cover"', () => {
      render(<ConflictCard conflict={mockLowQualityConflict} />);

      expect(screen.getByText('Cover')).toBeInTheDocument();
    });

    it('should translate biography to "Biografía"', () => {
      render(<ConflictCard conflict={mockTextConflict} />);

      expect(screen.getByText('Biografía')).toBeInTheDocument();
    });

    it('should translate year to "Año"', () => {
      render(<ConflictCard conflict={mockMultiSuggestionConflict} />);

      expect(screen.getByText('Año')).toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    it('should render accept button for simple conflicts', () => {
      render(<ConflictCard conflict={mockTextConflict} />);

      expect(screen.getByText('Aceptar')).toBeInTheDocument();
    });

    it('should render reject button for simple conflicts', () => {
      render(<ConflictCard conflict={mockTextConflict} />);

      expect(screen.getByText('Rechazar')).toBeInTheDocument();
    });

    it('should render ignore button for simple conflicts', () => {
      render(<ConflictCard conflict={mockTextConflict} />);

      expect(screen.getByText('Ignorar')).toBeInTheDocument();
    });

    it('should call accept mutation when clicking accept', () => {
      render(<ConflictCard conflict={mockTextConflict} />);

      fireEvent.click(screen.getByText('Aceptar'));

      expect(mockAccept).toHaveBeenCalledWith('conflict-1', expect.any(Object));
    });

    it('should call reject mutation when clicking reject', () => {
      render(<ConflictCard conflict={mockTextConflict} />);

      fireEvent.click(screen.getByText('Rechazar'));

      expect(mockReject).toHaveBeenCalledWith('conflict-1', expect.any(Object));
    });

    it('should call ignore mutation when clicking ignore', () => {
      render(<ConflictCard conflict={mockTextConflict} />);

      fireEvent.click(screen.getByText('Ignorar'));

      expect(mockIgnore).toHaveBeenCalledWith('conflict-1', expect.any(Object));
    });
  });

  describe('multi-suggestion conflicts', () => {
    it('should render suggestion count', () => {
      render(<ConflictCard conflict={mockMultiSuggestionConflict} />);

      expect(screen.getByText('4 sugerencias encontradas (selecciona una)')).toBeInTheDocument();
    });

    it('should render "Mostrar todas" button initially', () => {
      render(<ConflictCard conflict={mockMultiSuggestionConflict} />);

      expect(screen.getByText('Mostrar todas')).toBeInTheDocument();
    });

    it('should render first 3 suggestions by default', () => {
      render(<ConflictCard conflict={mockMultiSuggestionConflict} />);

      expect(screen.getByText('Led Zeppelin IV (Original)')).toBeInTheDocument();
      expect(screen.getByText('Led Zeppelin IV (Remaster)')).toBeInTheDocument();
      expect(screen.getByText('Led Zeppelin IV (Deluxe)')).toBeInTheDocument();
      expect(screen.queryByText('Led Zeppelin IV (Japan)')).not.toBeInTheDocument();
    });

    it('should show all suggestions when clicking "Mostrar todas"', async () => {
      render(<ConflictCard conflict={mockMultiSuggestionConflict} />);

      fireEvent.click(screen.getByText('Mostrar todas'));

      await waitFor(() => {
        expect(screen.getByText('Led Zeppelin IV (Japan)')).toBeInTheDocument();
        expect(screen.getByText('Mostrar menos')).toBeInTheDocument();
      });
    });

    it('should render suggestion scores', () => {
      render(<ConflictCard conflict={mockMultiSuggestionConflict} />);

      expect(screen.getByText('Score: 95')).toBeInTheDocument();
      expect(screen.getByText('Score: 85')).toBeInTheDocument();
      expect(screen.getByText('Score: 75')).toBeInTheDocument();
    });

    it('should render MBIDs', () => {
      render(<ConflictCard conflict={mockMultiSuggestionConflict} />);

      expect(screen.getByText('MBID: mbid-1')).toBeInTheDocument();
      expect(screen.getByText('MBID: mbid-2')).toBeInTheDocument();
    });

    it('should render disambiguation when present', () => {
      render(<ConflictCard conflict={mockMultiSuggestionConflict} />);

      expect(screen.getByText('(2014 Remaster)')).toBeInTheDocument();
    });

    it('should render artist name', () => {
      render(<ConflictCard conflict={mockMultiSuggestionConflict} />);

      const artistElements = screen.getAllByText('Artista: Led Zeppelin');
      expect(artistElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should render country', () => {
      render(<ConflictCard conflict={mockMultiSuggestionConflict} />);

      const countryElements = screen.getAllByText('País: UK');
      expect(countryElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should render "Aplicar selección" button for multi-suggestion conflicts', () => {
      render(<ConflictCard conflict={mockMultiSuggestionConflict} />);

      expect(screen.getByText('Aplicar selección')).toBeInTheDocument();
    });

    it('should render "Rechazar todas" button for multi-suggestion conflicts', () => {
      render(<ConflictCard conflict={mockMultiSuggestionConflict} />);

      expect(screen.getByText('Rechazar todas')).toBeInTheDocument();
    });

    it('should select different suggestions with radio buttons', async () => {
      render(<ConflictCard conflict={mockMultiSuggestionConflict} />);

      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons[0]).toBeChecked();

      fireEvent.click(radioButtons[1]);

      await waitFor(() => {
        expect(radioButtons[1]).toBeChecked();
        expect(radioButtons[0]).not.toBeChecked();
      });
    });

    it('should call applySuggestion with selected index', async () => {
      render(<ConflictCard conflict={mockMultiSuggestionConflict} />);

      // Select second suggestion
      const radioButtons = screen.getAllByRole('radio');
      fireEvent.click(radioButtons[1]);

      // Click apply
      fireEvent.click(screen.getByText('Aplicar selección'));

      expect(mockApplySuggestion).toHaveBeenCalledWith(
        { conflictId: 'conflict-4', suggestionIndex: 1 },
        expect.any(Object)
      );
    });

    it('should call reject when clicking "Rechazar todas"', () => {
      render(<ConflictCard conflict={mockMultiSuggestionConflict} />);

      fireEvent.click(screen.getByText('Rechazar todas'));

      expect(mockReject).toHaveBeenCalledWith('conflict-4', expect.any(Object));
    });
  });

  describe('error handling', () => {
    it('should show error notification on accept failure', async () => {
      mockAccept.mockImplementation((_id: string, options: { onError: (err: Error) => void }) => {
        options.onError(new Error('Network error'));
      });

      render(<ConflictCard conflict={mockTextConflict} />);

      fireEvent.click(screen.getByText('Aceptar'));

      await waitFor(() => {
        expect(screen.getByTestId('notification')).toBeInTheDocument();
        expect(screen.getByText('Error al aceptar: Network error')).toBeInTheDocument();
      });
    });

    it('should show error notification on reject failure', async () => {
      mockReject.mockImplementation((_id: string, options: { onError: (err: Error) => void }) => {
        options.onError(new Error('Server error'));
      });

      render(<ConflictCard conflict={mockTextConflict} />);

      fireEvent.click(screen.getByText('Rechazar'));

      await waitFor(() => {
        expect(screen.getByText('Error al rechazar: Server error')).toBeInTheDocument();
      });
    });

    it('should show error notification on ignore failure', async () => {
      mockIgnore.mockImplementation((_id: string, options: { onError: (err: Error) => void }) => {
        options.onError(new Error('Permission denied'));
      });

      render(<ConflictCard conflict={mockTextConflict} />);

      fireEvent.click(screen.getByText('Ignorar'));

      await waitFor(() => {
        expect(screen.getByText('Error al ignorar: Permission denied')).toBeInTheDocument();
      });
    });

    it('should show error notification on apply suggestion failure', async () => {
      mockApplySuggestion.mockImplementation(
        (_params: unknown, options: { onError: (err: Error) => void }) => {
          options.onError(new Error('Invalid suggestion'));
        }
      );

      render(<ConflictCard conflict={mockMultiSuggestionConflict} />);

      fireEvent.click(screen.getByText('Aplicar selección'));

      await waitFor(() => {
        expect(screen.getByText('Error al aplicar sugerencia: Invalid suggestion')).toBeInTheDocument();
      });
    });

    it('should dismiss error notification when clicking dismiss', async () => {
      mockAccept.mockImplementation((_id: string, options: { onError: (err: Error) => void }) => {
        options.onError(new Error('Test error'));
      });

      render(<ConflictCard conflict={mockTextConflict} />);

      fireEvent.click(screen.getByText('Aceptar'));

      await waitFor(() => {
        expect(screen.getByText('Error al aceptar: Test error')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Dismiss'));

      await waitFor(() => {
        expect(screen.queryByText('Error al aceptar: Test error')).not.toBeInTheDocument();
      });
    });
  });

  describe('card removal', () => {
    it('should remove card after successful accept', async () => {
      mockAccept.mockImplementation((_id: string, options: { onSuccess: () => void }) => {
        options.onSuccess();
      });

      const { container } = render(<ConflictCard conflict={mockTextConflict} />);

      fireEvent.click(screen.getByText('Aceptar'));

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it('should remove card after successful reject', async () => {
      mockReject.mockImplementation((_id: string, options: { onSuccess: () => void }) => {
        options.onSuccess();
      });

      const { container } = render(<ConflictCard conflict={mockTextConflict} />);

      fireEvent.click(screen.getByText('Rechazar'));

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it('should remove card after successful ignore', async () => {
      mockIgnore.mockImplementation((_id: string, options: { onSuccess: () => void }) => {
        options.onSuccess();
      });

      const { container } = render(<ConflictCard conflict={mockTextConflict} />);

      fireEvent.click(screen.getByText('Ignorar'));

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it('should remove card after successful apply suggestion', async () => {
      mockApplySuggestion.mockImplementation(
        (_params: unknown, options: { onSuccess: () => void }) => {
          options.onSuccess();
        }
      );

      const { container } = render(<ConflictCard conflict={mockMultiSuggestionConflict} />);

      fireEvent.click(screen.getByText('Aplicar selección'));

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe('image URL building', () => {
    it('should handle http URLs', () => {
      const conflict: MetadataConflict = {
        ...mockImageConflict,
        currentValue: 'http://example.com/image.jpg',
      };

      render(<ConflictCard conflict={conflict} />);

      const img = screen.getByTestId('image-with-fallback');
      expect(img).toHaveAttribute('src', 'http://example.com/image.jpg');
    });

    it('should handle https URLs', () => {
      const conflict: MetadataConflict = {
        ...mockImageConflict,
        currentValue: 'https://example.com/image.jpg',
      };

      render(<ConflictCard conflict={conflict} />);

      const img = screen.getByTestId('image-with-fallback');
      expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('should handle /api/ paths', () => {
      const conflict: MetadataConflict = {
        ...mockImageConflict,
        currentValue: '/api/images/test.jpg',
      };

      render(<ConflictCard conflict={conflict} />);

      const img = screen.getByTestId('image-with-fallback');
      expect(img).toHaveAttribute('src', '/api/images/test.jpg');
    });
  });
});
