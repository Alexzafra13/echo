import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BackgroundPositionModal } from './BackgroundPositionModal';

// Mock UI components
vi.mock('@shared/components/ui', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    size: _s,
    leftIcon: _li,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    size?: string;
    leftIcon?: React.ReactNode;
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

describe('BackgroundPositionModal', () => {
  const defaultProps = {
    artistId: 'artist-123',
    artistName: 'Test Artist',
    backgroundUrl: 'https://example.com/background.jpg',
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal Structure', () => {
    it('should render modal with artist name in title', () => {
      render(<BackgroundPositionModal {...defaultProps} />);
      expect(screen.getByText(/Test Artist/)).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<BackgroundPositionModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
    });

    it('should render description', () => {
      render(<BackgroundPositionModal {...defaultProps} />);
      expect(screen.getByText(/Arrastra verticalmente/)).toBeInTheDocument();
    });

    it('should call onClose when close button clicked', () => {
      render(<BackgroundPositionModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Footer Buttons', () => {
    it('should render reset, cancel and save buttons', () => {
      render(<BackgroundPositionModal {...defaultProps} />);
      expect(screen.getByText('Restablecer')).toBeInTheDocument();
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });

    it('should call onClose when cancel clicked', () => {
      render(<BackgroundPositionModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Cancelar'));
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Save Functionality', () => {
    // Note: Save button is disabled until image loads via Image.onload,
    // which doesn't fire in jsdom. Save logic is tested via the
    // useUpdateBackgroundPosition hook tests instead.
    it('should render save button (disabled until image loads)', () => {
      render(<BackgroundPositionModal {...defaultProps} />);
      const saveButtons = screen.getAllByRole('button');
      const guardarBtn = saveButtons.find((b) => b.textContent?.includes('Guardar'));
      expect(guardarBtn).toBeDefined();
      expect(guardarBtn).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have close button with aria-label', () => {
      render(<BackgroundPositionModal {...defaultProps} />);
      expect(screen.getByLabelText('Cerrar')).toBeInTheDocument();
    });
  });
});
