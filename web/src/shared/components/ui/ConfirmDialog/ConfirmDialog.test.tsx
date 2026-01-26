import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    confirmText: 'Yes, proceed',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render title and message', () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    });

    it('should render confirm and cancel buttons', () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(screen.getByText('Yes, proceed')).toBeInTheDocument();
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });

    it('should render warning icon', () => {
      render(<ConfirmDialog {...defaultProps} />);

      // AlertTriangle icon is rendered as SVG
      const icon = document.querySelector('[class*="icon"]');
      expect(icon).toBeTruthy();
    });

    it('should have proper ARIA attributes', () => {
      render(<ConfirmDialog {...defaultProps} />);

      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-dialog-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'confirm-dialog-message');
    });
  });

  describe('interactions', () => {
    it('should call onConfirm when confirm button is clicked', () => {
      const onConfirm = vi.fn();
      render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByText('Yes, proceed'));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn();
      render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByText('Cancelar'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when ESC key is pressed', () => {
      const onCancel = vi.fn();
      render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should not call onCancel when ESC is pressed during loading', () => {
      const onCancel = vi.fn();
      render(<ConfirmDialog {...defaultProps} onCancel={onCancel} isLoading />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(onCancel).not.toHaveBeenCalled();
    });

    it('should call onCancel when clicking backdrop', () => {
      const onCancel = vi.fn();
      render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

      const backdrop = screen.getByRole('alertdialog');
      fireEvent.click(backdrop);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should not call onCancel when clicking backdrop during loading', () => {
      const onCancel = vi.fn();
      render(<ConfirmDialog {...defaultProps} onCancel={onCancel} isLoading />);

      const backdrop = screen.getByRole('alertdialog');
      fireEvent.click(backdrop);

      expect(onCancel).not.toHaveBeenCalled();
    });

    it('should not call onCancel when clicking dialog content', () => {
      const onCancel = vi.fn();
      render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

      const dialog = document.querySelector('[class*="dialog"]');
      if (dialog) {
        fireEvent.click(dialog);
      }

      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should show loading text when isLoading is true', () => {
      render(<ConfirmDialog {...defaultProps} isLoading />);

      expect(screen.getByText('Procesando...')).toBeInTheDocument();
      expect(screen.queryByText('Yes, proceed')).not.toBeInTheDocument();
    });

    it('should disable buttons when isLoading is true', () => {
      render(<ConfirmDialog {...defaultProps} isLoading />);

      const cancelButton = screen.getByText('Cancelar').closest('button');
      const confirmButton = screen.getByText('Procesando...').closest('button');

      expect(cancelButton).toBeDisabled();
      expect(confirmButton).toBeDisabled();
    });
  });

  describe('variants', () => {
    it('should apply warning variant by default', () => {
      render(<ConfirmDialog {...defaultProps} />);

      const icon = document.querySelector('[class*="warning"]');
      expect(icon).toBeTruthy();
    });

    it('should apply danger variant when specified', () => {
      render(<ConfirmDialog {...defaultProps} variant="danger" />);

      const icon = document.querySelector('[class*="danger"]');
      expect(icon).toBeTruthy();
    });
  });

  describe('body scroll', () => {
    it('should prevent body scroll when dialog is open', () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll on unmount', () => {
      const { unmount } = render(<ConfirmDialog {...defaultProps} />);

      expect(document.body.style.overflow).toBe('hidden');

      unmount();

      expect(document.body.style.overflow).toBe('');
    });
  });
});
