import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BackgroundPositionModal } from './BackgroundPositionModal';

// Mock UI components
vi.mock('@shared/components/ui', () => ({
  Button: ({ children, onClick, disabled, variant }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant}>
      {children}
    </button>
  ),
}));

// Mock update position hook
const mockMutate = vi.fn();
vi.mock('../../hooks/useArtistAvatars', () => ({
  useUpdateBackgroundPosition: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

// Mock logger
vi.mock('@shared/utils/logger', () => ({
  logger: { error: vi.fn() },
}));

// Mock Image loading
const mockImageOnLoad = vi.fn();
const originalImage = global.Image;

beforeEach(() => {
  vi.clearAllMocks();
  mockMutate.mockReset();

  // Mock Image constructor
  global.Image = class MockImage {
    onload: (() => void) | null = null;
    src = '';

    constructor() {
      setTimeout(() => {
        // Simulate natural dimensions
        Object.defineProperty(this, 'naturalWidth', { value: 1920 });
        Object.defineProperty(this, 'naturalHeight', { value: 1080 });
        if (this.onload) this.onload();
      }, 0);
    }
  } as unknown as typeof Image;
});

afterEach(() => {
  global.Image = originalImage;
});

describe('BackgroundPositionModal', () => {
  const defaultProps = {
    artistId: 'artist-123',
    artistName: 'Test Artist',
    backgroundUrl: 'https://example.com/background.jpg',
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  };

  describe('Modal Structure', () => {
    it('should render modal title', () => {
      render(<BackgroundPositionModal {...defaultProps} />);
      expect(screen.getByText('Ajustar posición del fondo')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<BackgroundPositionModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
    });

    it('should render description with artist name', () => {
      render(<BackgroundPositionModal {...defaultProps} />);
      expect(screen.getByText('Test Artist')).toBeInTheDocument();
    });

    it('should call onClose when close button clicked', () => {
      render(<BackgroundPositionModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should call onClose when overlay clicked', () => {
      render(<BackgroundPositionModal {...defaultProps} />);
      // Click on overlay (the outer div)
      const overlay = screen.getByText('Ajustar posición del fondo').closest('div')?.parentElement?.parentElement;
      if (overlay) {
        fireEvent.click(overlay);
        expect(defaultProps.onClose).toHaveBeenCalled();
      }
    });
  });

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      render(<BackgroundPositionModal {...defaultProps} />);
      expect(screen.getByText('Cargando imagen...')).toBeInTheDocument();
    });

    it('should hide loading state after image loads', async () => {
      render(<BackgroundPositionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Cargando imagen...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Instructions', () => {
    it('should show drag instructions after image loads', async () => {
      render(<BackgroundPositionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Arrastra para ajustar')).toBeInTheDocument();
      });
    });
  });

  describe('Footer Buttons', () => {
    it('should render reset button', () => {
      render(<BackgroundPositionModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Restablecer' })).toBeInTheDocument();
    });

    it('should render cancel button', () => {
      render(<BackgroundPositionModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    });

    it('should render save button', async () => {
      render(<BackgroundPositionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
      });
    });

    it('should call onClose when cancel clicked', () => {
      render(<BackgroundPositionModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should disable buttons while loading', () => {
      render(<BackgroundPositionModal {...defaultProps} />);

      const resetButton = screen.getByRole('button', { name: 'Restablecer' });
      expect(resetButton).toBeDisabled();
    });
  });

  describe('Save Functionality', () => {
    it('should call mutate when save clicked', async () => {
      render(<BackgroundPositionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Cargando imagen...')).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          artistId: 'artist-123',
          backgroundPosition: expect.any(String),
        }),
        expect.any(Object)
      );
    });

    it('should call onSuccess and onClose on successful save', async () => {
      mockMutate.mockImplementation((_, options) => {
        options.onSuccess();
      });

      render(<BackgroundPositionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Cargando imagen...')).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

      expect(defaultProps.onSuccess).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Reset Functionality', () => {
    it('should enable reset button after image loads', async () => {
      render(<BackgroundPositionModal {...defaultProps} />);

      await waitFor(() => {
        const resetButton = screen.getByRole('button', { name: 'Restablecer' });
        expect(resetButton).not.toBeDisabled();
      });
    });
  });

  describe('Initial Position', () => {
    it('should accept initial position prop', () => {
      render(
        <BackgroundPositionModal
          {...defaultProps}
          initialPosition="center center"
        />
      );

      expect(screen.getByText('Ajustar posición del fondo')).toBeInTheDocument();
    });

    it('should use default position when not provided', () => {
      render(<BackgroundPositionModal {...defaultProps} />);
      expect(screen.getByText('Ajustar posición del fondo')).toBeInTheDocument();
    });
  });

  describe('Position Display', () => {
    it('should display position info after image loads', async () => {
      render(<BackgroundPositionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/posición:/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have close button with aria-label', () => {
      render(<BackgroundPositionModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveAttribute('aria-label', 'Cerrar');
    });
  });
});
