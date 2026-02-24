import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertTriangle, UserPlus } from 'lucide-react';
import { Modal } from './Modal';

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <div>Modal content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', () => {
      render(<Modal {...defaultProps} />);

      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<Modal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
      expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
    });

    it('should render close button with aria-label', () => {
      render(<Modal {...defaultProps} />);

      const closeButton = screen.getByLabelText('Cerrar');
      expect(closeButton).toBeInTheDocument();
    });

    it('should have proper ARIA attributes', () => {
      render(<Modal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      // aria-labelledby uses a generated ID from useId()
      expect(dialog).toHaveAttribute('aria-labelledby');
    });
  });

  describe('interactions', () => {
    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByLabelText('Cerrar');
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when ESC key is pressed', () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when other keys are pressed', () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(window, { key: 'Enter' });
      fireEvent.keyDown(window, { key: 'a' });

      expect(onClose).not.toHaveBeenCalled();
    });

    it('should call onClose when clicking backdrop', () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);

      const backdrop = screen.getByRole('dialog');
      fireEvent.click(backdrop);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when clicking modal content', () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);

      const content = screen.getByText('Modal content');
      fireEvent.click(content);

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('styling', () => {
    it('should apply custom width when provided', () => {
      render(<Modal {...defaultProps} width="800px" />);

      // Modal renders in portal (document.body)
      const modalContent = document.querySelector('[style*="width"]');
      expect(modalContent).toBeTruthy();
    });

    it('should apply custom className when provided', () => {
      render(<Modal {...defaultProps} className="custom-class" />);

      // Modal renders in portal (document.body)
      const modalContent = document.querySelector('.custom-class');
      expect(modalContent).toBeTruthy();
    });
  });

  describe('body scroll', () => {
    it('should prevent body scroll when modal is open', () => {
      const { rerender } = render(<Modal {...defaultProps} />);

      expect(document.body.style.overflow).toBe('hidden');

      rerender(<Modal {...defaultProps} isOpen={false} />);

      expect(document.body.style.overflow).toBe('');
    });

    it('should restore body scroll on unmount', () => {
      const { unmount } = render(<Modal {...defaultProps} />);

      expect(document.body.style.overflow).toBe('hidden');

      unmount();

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('custom headers', () => {
    it('should render icon when provided', () => {
      render(<Modal {...defaultProps} icon={AlertTriangle} />);

      // Icon should be rendered (lucide-react renders as SVG)
      const modalContent = document.querySelector('[class*="modalIcon"]');
      expect(modalContent).toBeTruthy();
    });

    it('should render subtitle when provided', () => {
      render(<Modal {...defaultProps} subtitle="This is a subtitle" />);

      expect(screen.getByText('This is a subtitle')).toBeInTheDocument();
    });

    it('should render both icon and subtitle together', () => {
      render(
        <Modal
          {...defaultProps}
          icon={UserPlus}
          subtitle="Create a new user account"
        />
      );

      expect(screen.getByText('Create a new user account')).toBeInTheDocument();
      const modalIcon = document.querySelector('[class*="modalIcon"]');
      expect(modalIcon).toBeTruthy();
    });

    it('should work with ReactNode as title', () => {
      render(
        <Modal
          {...defaultProps}
          title={<span data-testid="custom-title">Custom Title</span>}
        />
      );

      expect(screen.getByTestId('custom-title')).toBeInTheDocument();
    });

    it('should work without icon and subtitle (backwards compatible)', () => {
      render(<Modal {...defaultProps} />);

      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      const modalIcon = document.querySelector('[class*="modalIcon"]');
      expect(modalIcon).toBeFalsy();
    });
  });
});
