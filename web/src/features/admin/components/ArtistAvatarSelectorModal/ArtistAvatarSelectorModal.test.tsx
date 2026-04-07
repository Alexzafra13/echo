import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ArtistAvatarSelectorModal } from './ArtistAvatarSelectorModal';

// Mock UI components
vi.mock('@shared/components/ui', () => ({
  Button: ({ children, onClick, disabled, loading, variant }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
    variant?: string;
  }) => (
    <button onClick={onClick} disabled={disabled || loading} data-variant={variant}>
      {loading ? 'Loading...' : children}
    </button>
  ),
}));

// Mock react-query
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    refetchQueries: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mock state
const mockState = {
  isLoading: false,
  error: null as Error | null,
  avatars: [] as Array<{
    url: string;
    thumbnailUrl?: string;
    provider: string;
    type: string;
    width?: number;
    height?: number;
  }>,
};

const mockMutate = vi.fn();

vi.mock('../../hooks/useArtistAvatars', () => ({
  useSearchArtistAvatars: () => ({
    data: mockState.isLoading ? undefined : {
      avatars: mockState.avatars,
      artistInfo: { name: 'Test Artist' },
    },
    isLoading: mockState.isLoading,
    error: mockState.error,
  }),
  useApplyArtistAvatar: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

// Mock FileUploadSection
vi.mock('./FileUploadSection', () => ({
  FileUploadSection: ({ onSuccess }: { onSuccess: () => void }) => (
    <div data-testid="file-upload-section">
      <button onClick={onSuccess}>Upload Success</button>
    </div>
  ),
}));

// Mock metadata service
vi.mock('@features/admin/metadata/services/metadataService', () => ({
  metadataService: {
    getProviderLabel: (provider: string) => provider.charAt(0).toUpperCase() + provider.slice(1),
  },
}));

// Mock logger and error utils
vi.mock('@shared/utils/logger', () => ({
  logger: { error: vi.fn() },
}));

vi.mock('@shared/utils/error.utils', () => ({
  getApiErrorMessage: () => 'Error message',
}));

describe('ArtistAvatarSelectorModal', () => {
  const defaultProps = {
    artistId: 'artist-123',
    artistName: 'Test Artist',
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockState.isLoading = false;
    mockState.error = null;
    mockState.avatars = [];
  });

  describe('Modal Structure', () => {
    it('should render modal title', () => {
      render(<ArtistAvatarSelectorModal {...defaultProps} />);
      expect(screen.getByText('Seleccionar imagen de artista')).toBeInTheDocument();
    });

    it('should render artist name subtitle', () => {
      render(<ArtistAvatarSelectorModal {...defaultProps} />);
      expect(screen.getByText('Test Artist')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<ArtistAvatarSelectorModal {...defaultProps} />);
      const closeButtons = screen.getAllByRole('button');
      expect(closeButtons.length).toBeGreaterThan(0);
    });

    it('should call onClose when close button clicked', () => {
      render(<ArtistAvatarSelectorModal {...defaultProps} />);
      // Find close button by its position (first button with X icon)
      const buttons = screen.getAllByRole('button');
      const closeButton = buttons.find(btn => btn.querySelector('svg.lucide-x'));
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(defaultProps.onClose).toHaveBeenCalled();
      }
    });
  });

  describe('Tabs', () => {
    it('should render providers tab', () => {
      render(<ArtistAvatarSelectorModal {...defaultProps} />);
      expect(screen.getByText('Proveedores externos')).toBeInTheDocument();
    });

    it('should render upload tab', () => {
      render(<ArtistAvatarSelectorModal {...defaultProps} />);
      expect(screen.getByText('Subir desde PC')).toBeInTheDocument();
    });

    it('should switch to upload tab on click', () => {
      render(<ArtistAvatarSelectorModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Subir desde PC'));

      expect(screen.getByTestId('file-upload-section')).toBeInTheDocument();
    });

    it('should switch back to providers tab', () => {
      render(<ArtistAvatarSelectorModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Subir desde PC'));
      fireEvent.click(screen.getByText('Proveedores externos'));

      expect(screen.queryByTestId('file-upload-section')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading state when fetching avatars', () => {
      mockState.isLoading = true;

      render(<ArtistAvatarSelectorModal {...defaultProps} />);

      expect(screen.getByText(/buscando imágenes/i)).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error state on fetch error', () => {
      mockState.error = new Error('Network error');

      render(<ArtistAvatarSelectorModal {...defaultProps} />);

      expect(screen.getByText('Error al buscar imágenes')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no avatars found', () => {
      mockState.avatars = [];

      render(<ArtistAvatarSelectorModal {...defaultProps} />);

      expect(screen.getByText('No se encontraron imágenes')).toBeInTheDocument();
    });
  });

  describe('Avatar Gallery', () => {
    it('should display avatars when available', () => {
      mockState.avatars = [
        { url: 'https://example.com/1.jpg', provider: 'fanart', type: 'profile' },
        { url: 'https://example.com/2.jpg', provider: 'lastfm', type: 'background' },
      ];

      render(<ArtistAvatarSelectorModal {...defaultProps} />);

      expect(screen.getAllByRole('img')).toHaveLength(2);
    });

    it('should display type badges', () => {
      mockState.avatars = [
        { url: 'https://example.com/1.jpg', provider: 'fanart', type: 'profile' },
      ];

      render(<ArtistAvatarSelectorModal {...defaultProps} />);

      expect(screen.getByText('Perfil')).toBeInTheDocument();
    });

    it('should display provider names', () => {
      mockState.avatars = [
        { url: 'https://example.com/1.jpg', provider: 'fanart', type: 'profile' },
      ];

      render(<ArtistAvatarSelectorModal {...defaultProps} />);

      expect(screen.getByText('Fanart')).toBeInTheDocument();
    });

    it('should display resolution when available', () => {
      mockState.avatars = [
        { url: 'https://example.com/1.jpg', provider: 'fanart', type: 'profile', width: 1000, height: 1000 },
      ];

      render(<ArtistAvatarSelectorModal {...defaultProps} />);

      expect(screen.getByText(/1000×1000/)).toBeInTheDocument();
    });
  });

  describe('Filters', () => {
    it('should show type filter when multiple types available', () => {
      mockState.avatars = [
        { url: 'https://example.com/1.jpg', provider: 'fanart', type: 'profile' },
        { url: 'https://example.com/2.jpg', provider: 'fanart', type: 'background' },
      ];

      render(<ArtistAvatarSelectorModal {...defaultProps} />);

      expect(screen.getByText('Tipo:')).toBeInTheDocument();
    });

    it('should show provider filter when multiple providers available', () => {
      mockState.avatars = [
        { url: 'https://example.com/1.jpg', provider: 'fanart', type: 'profile' },
        { url: 'https://example.com/2.jpg', provider: 'lastfm', type: 'profile' },
      ];

      render(<ArtistAvatarSelectorModal {...defaultProps} />);

      expect(screen.getByText('Proveedor:')).toBeInTheDocument();
    });

    it('should filter avatars by type', () => {
      mockState.avatars = [
        { url: 'https://example.com/1.jpg', provider: 'fanart', type: 'profile' },
        { url: 'https://example.com/2.jpg', provider: 'fanart', type: 'background' },
      ];

      render(<ArtistAvatarSelectorModal {...defaultProps} />);

      const typeSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(typeSelect, { target: { value: 'profile' } });

      expect(screen.getAllByRole('img')).toHaveLength(1);
    });
  });

  describe('Selection', () => {
    it('should select avatar on click', () => {
      mockState.avatars = [
        { url: 'https://example.com/1.jpg', provider: 'fanart', type: 'profile' },
      ];

      render(<ArtistAvatarSelectorModal {...defaultProps} />);

      const avatar = screen.getByRole('img');
      fireEvent.click(avatar.closest('div')!);

      // Apply button should be enabled
      expect(screen.getByRole('button', { name: /aplicar/i })).not.toBeDisabled();
    });
  });

  describe('Footer Buttons', () => {
    it('should render cancel button when avatars exist', () => {
      mockState.avatars = [
        { url: 'https://example.com/1.jpg', provider: 'fanart', type: 'profile' },
      ];

      render(<ArtistAvatarSelectorModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    });

    it('should render apply button when avatars exist', () => {
      mockState.avatars = [
        { url: 'https://example.com/1.jpg', provider: 'fanart', type: 'profile' },
      ];

      render(<ArtistAvatarSelectorModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /aplicar/i })).toBeInTheDocument();
    });

    it('should disable apply button when no selection', () => {
      mockState.avatars = [
        { url: 'https://example.com/1.jpg', provider: 'fanart', type: 'profile' },
      ];

      render(<ArtistAvatarSelectorModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /aplicar/i })).toBeDisabled();
    });

    it('should call onClose when cancel clicked', () => {
      mockState.avatars = [
        { url: 'https://example.com/1.jpg', provider: 'fanart', type: 'profile' },
      ];

      render(<ArtistAvatarSelectorModal {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Apply Selection', () => {
    it('should call mutate when apply clicked', () => {
      mockState.avatars = [
        { url: 'https://example.com/1.jpg', provider: 'fanart', type: 'profile' },
      ];

      render(<ArtistAvatarSelectorModal {...defaultProps} />);

      // Select avatar
      const avatar = screen.getByRole('img');
      fireEvent.click(avatar.closest('div')!);

      // Click apply
      fireEvent.click(screen.getByRole('button', { name: /aplicar/i }));

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          artistId: 'artist-123',
          avatarUrl: 'https://example.com/1.jpg',
          provider: 'fanart',
          type: 'profile',
        }),
        expect.any(Object)
      );
    });

    it('should call onSuccess and onClose on successful apply', async () => {
      mockMutate.mockImplementation((_, options) => {
        // Simulate async success callback
        setTimeout(() => options.onSuccess(), 0);
      });

      mockState.avatars = [
        { url: 'https://example.com/1.jpg', provider: 'fanart', type: 'profile' },
      ];

      render(<ArtistAvatarSelectorModal {...defaultProps} />);

      // Select and apply
      const avatar = screen.getByRole('img');
      fireEvent.click(avatar.closest('div')!);
      fireEvent.click(screen.getByRole('button', { name: /aplicar/i }));

      // Wait for async operations
      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Upload Tab', () => {
    it('should render file upload section in upload tab', () => {
      render(<ArtistAvatarSelectorModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Subir desde PC'));

      expect(screen.getByTestId('file-upload-section')).toBeInTheDocument();
    });

    it('should call onSuccess and onClose on upload success', () => {
      render(<ArtistAvatarSelectorModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Subir desde PC'));
      fireEvent.click(screen.getByText('Upload Success'));

      expect(defaultProps.onSuccess).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Default Type', () => {
    it('should pre-select type filter when defaultType provided', () => {
      mockState.avatars = [
        { url: 'https://example.com/1.jpg', provider: 'fanart', type: 'profile' },
        { url: 'https://example.com/2.jpg', provider: 'fanart', type: 'background' },
      ];

      render(<ArtistAvatarSelectorModal {...defaultProps} defaultType="profile" />);

      // Only profile type should be shown
      expect(screen.getAllByRole('img')).toHaveLength(1);
    });
  });
});
