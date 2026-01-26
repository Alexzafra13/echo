import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeletePlaylistModal } from './DeletePlaylistModal';

describe('DeletePlaylistModal', () => {
  const defaultProps = {
    playlistName: 'My Playlist',
    onClose: vi.fn(),
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render modal title', () => {
      render(<DeletePlaylistModal {...defaultProps} />);

      expect(screen.getByText('¿Eliminar playlist?')).toBeInTheDocument();
    });

    it('should render playlist name in confirmation message', () => {
      render(<DeletePlaylistModal {...defaultProps} />);

      expect(screen.getByText(/¿Estás seguro de que quieres eliminar/)).toBeInTheDocument();
      expect(screen.getByText(/"My Playlist"/)).toBeInTheDocument();
    });

    it('should render warning about irreversible action', () => {
      render(<DeletePlaylistModal {...defaultProps} />);

      expect(screen.getByText(/Esta acción no se puede deshacer/)).toBeInTheDocument();
    });

    it('should render cancel and delete buttons', () => {
      render(<DeletePlaylistModal {...defaultProps} />);

      expect(screen.getByText('Cancelar')).toBeInTheDocument();
      expect(screen.getByText('Eliminar')).toBeInTheDocument();
    });

    it('should render warning icon', () => {
      render(<DeletePlaylistModal {...defaultProps} />);

      // AlertTriangle icon is rendered
      const modal = document.querySelector('[class*="modalIcon"]');
      expect(modal).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('should call onClose when cancel button is clicked', () => {
      render(<DeletePlaylistModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Cancelar'));

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm when delete button is clicked', async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      render(<DeletePlaylistModal {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByText('Eliminar'));

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onClose after successful deletion', async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();
      render(<DeletePlaylistModal {...defaultProps} onConfirm={onConfirm} onClose={onClose} />);

      fireEvent.click(screen.getByText('Eliminar'));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });

    it('should not call onClose if onConfirm fails', async () => {
      const onConfirm = vi.fn().mockRejectedValue(new Error('Delete failed'));
      const onClose = vi.fn();
      render(<DeletePlaylistModal {...defaultProps} onConfirm={onConfirm} onClose={onClose} />);

      fireEvent.click(screen.getByText('Eliminar'));

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalled();
      });

      // onClose should NOT be called on error
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should show loading text when isLoading is true', () => {
      render(<DeletePlaylistModal {...defaultProps} isLoading={true} />);

      expect(screen.getByText('Eliminando...')).toBeInTheDocument();
      expect(screen.queryByText('Eliminar')).not.toBeInTheDocument();
    });

    it('should disable cancel button when loading', () => {
      render(<DeletePlaylistModal {...defaultProps} isLoading={true} />);

      const cancelButton = screen.getByText('Cancelar');
      expect(cancelButton).toBeDisabled();
    });

    it('should disable delete button when loading', () => {
      render(<DeletePlaylistModal {...defaultProps} isLoading={true} />);

      const deleteButton = screen.getByText('Eliminando...');
      expect(deleteButton).toBeDisabled();
    });

    it('should not allow closing modal when loading', () => {
      const onClose = vi.fn();
      render(<DeletePlaylistModal {...defaultProps} isLoading={true} onClose={onClose} />);

      // The modal's onClose is set to empty function when loading
      // We can verify cancel button is disabled
      const cancelButton = screen.getByText('Cancelar');
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('different playlist names', () => {
    it('should display playlist name with special characters', () => {
      render(<DeletePlaylistModal {...defaultProps} playlistName="Rock & Roll's Best!" />);

      expect(screen.getByText(/"Rock & Roll's Best!"/)).toBeInTheDocument();
    });

    it('should display long playlist name', () => {
      const longName = 'This is a very long playlist name that should still be displayed correctly';
      render(<DeletePlaylistModal {...defaultProps} playlistName={longName} />);

      expect(screen.getByText(`"${longName}"`)).toBeInTheDocument();
    });

    it('should display empty playlist name', () => {
      render(<DeletePlaylistModal {...defaultProps} playlistName="" />);

      expect(screen.getByText('""')).toBeInTheDocument();
    });
  });

  describe('button states', () => {
    it('should have danger variant on delete button', () => {
      render(<DeletePlaylistModal {...defaultProps} />);

      const deleteButton = screen.getByText('Eliminar');
      expect(deleteButton.className).toContain('danger');
    });

    it('should have secondary variant on cancel button', () => {
      render(<DeletePlaylistModal {...defaultProps} />);

      const cancelButton = screen.getByText('Cancelar');
      expect(cancelButton.className).toContain('secondary');
    });
  });

  describe('accessibility', () => {
    it('should have proper button types', () => {
      render(<DeletePlaylistModal {...defaultProps} />);

      const cancelButton = screen.getByText('Cancelar');
      const deleteButton = screen.getByText('Eliminar');

      expect(cancelButton).toHaveAttribute('type', 'button');
      expect(deleteButton).toHaveAttribute('type', 'button');
    });
  });
});
