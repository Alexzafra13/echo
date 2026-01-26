import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditPlaylistModal } from './EditPlaylistModal';
import type { Playlist } from '../../types';

describe('EditPlaylistModal', () => {
  const mockPlaylist: Playlist = {
    id: 'playlist-1',
    name: 'My Playlist',
    description: 'A great playlist',
    public: false,
    songCount: 10,
    duration: 3600,
    size: 100000000,
    ownerId: 'user-1',
    ownerName: 'Test User',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const defaultProps = {
    playlist: mockPlaylist,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render modal title', () => {
      render(<EditPlaylistModal {...defaultProps} />);

      expect(screen.getByText('Editar Playlist')).toBeInTheDocument();
    });

    it('should render form fields with current values', () => {
      render(<EditPlaylistModal {...defaultProps} />);

      const nameInput = screen.getByLabelText('Nombre de la playlist');
      expect(nameInput).toHaveValue('My Playlist');

      const descriptionInput = screen.getByLabelText('Descripción (opcional)');
      expect(descriptionInput).toHaveValue('A great playlist');
    });

    it('should render public checkbox unchecked for private playlist', () => {
      render(<EditPlaylistModal {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
      expect(screen.getByText('Solo visible para ti')).toBeInTheDocument();
    });

    it('should render public checkbox checked for public playlist', () => {
      const publicPlaylist = { ...mockPlaylist, public: true };
      render(<EditPlaylistModal {...defaultProps} playlist={publicPlaylist} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
      expect(screen.getByText('Visible en tu perfil público')).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      render(<EditPlaylistModal {...defaultProps} />);

      expect(screen.getByText('Cancelar')).toBeInTheDocument();
      expect(screen.getByText('Guardar Cambios')).toBeInTheDocument();
    });
  });

  describe('form interactions', () => {
    it('should update name when typing', () => {
      render(<EditPlaylistModal {...defaultProps} />);

      const nameInput = screen.getByLabelText('Nombre de la playlist');
      fireEvent.change(nameInput, { target: { value: 'New Name' } });

      expect(nameInput).toHaveValue('New Name');
    });

    it('should update description when typing', () => {
      render(<EditPlaylistModal {...defaultProps} />);

      const descriptionInput = screen.getByLabelText('Descripción (opcional)');
      fireEvent.change(descriptionInput, { target: { value: 'New description' } });

      expect(descriptionInput).toHaveValue('New description');
    });

    it('should toggle public checkbox', () => {
      render(<EditPlaylistModal {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();

      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
      expect(screen.getByText('Visible en tu perfil público')).toBeInTheDocument();

      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
      expect(screen.getByText('Solo visible para ti')).toBeInTheDocument();
    });

    it('should call onClose when cancel button is clicked', () => {
      render(<EditPlaylistModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Cancelar'));

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('form validation', () => {
    it('should disable submit button when name is empty', () => {
      render(<EditPlaylistModal {...defaultProps} />);

      const nameInput = screen.getByLabelText('Nombre de la playlist');
      fireEvent.change(nameInput, { target: { value: '' } });

      const submitButton = screen.getByText('Guardar Cambios');
      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button when name is only whitespace', () => {
      render(<EditPlaylistModal {...defaultProps} />);

      const nameInput = screen.getByLabelText('Nombre de la playlist');
      fireEvent.change(nameInput, { target: { value: '   ' } });

      const submitButton = screen.getByText('Guardar Cambios');
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when name has value', () => {
      render(<EditPlaylistModal {...defaultProps} />);

      const nameInput = screen.getByLabelText('Nombre de la playlist');
      fireEvent.change(nameInput, { target: { value: '' } });

      expect(screen.getByText('Guardar Cambios')).toBeDisabled();

      fireEvent.change(nameInput, { target: { value: 'Valid Name' } });

      expect(screen.getByText('Guardar Cambios')).not.toBeDisabled();
    });
  });

  describe('form submission', () => {
    it('should call onSubmit with updated data', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<EditPlaylistModal {...defaultProps} onSubmit={onSubmit} />);

      const nameInput = screen.getByLabelText('Nombre de la playlist');
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

      const descriptionInput = screen.getByLabelText('Descripción (opcional)');
      fireEvent.change(descriptionInput, { target: { value: 'Updated description' } });

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      fireEvent.click(screen.getByText('Guardar Cambios'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith('playlist-1', {
          name: 'Updated Name',
          description: 'Updated description',
          public: true,
        });
      });
    });

    it('should trim whitespace from name and description', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<EditPlaylistModal {...defaultProps} onSubmit={onSubmit} />);

      const nameInput = screen.getByLabelText('Nombre de la playlist');
      fireEvent.change(nameInput, { target: { value: '  Trimmed Name  ' } });

      const descriptionInput = screen.getByLabelText('Descripción (opcional)');
      fireEvent.change(descriptionInput, { target: { value: '  Trimmed desc  ' } });

      fireEvent.click(screen.getByText('Guardar Cambios'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith('playlist-1', {
          name: 'Trimmed Name',
          description: 'Trimmed desc',
          public: false,
        });
      });
    });

    it('should omit description if empty', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<EditPlaylistModal {...defaultProps} onSubmit={onSubmit} />);

      const descriptionInput = screen.getByLabelText('Descripción (opcional)');
      fireEvent.change(descriptionInput, { target: { value: '' } });

      fireEvent.click(screen.getByText('Guardar Cambios'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith('playlist-1', {
          name: 'My Playlist',
          description: undefined,
          public: false,
        });
      });
    });

    it('should call onClose after successful submission', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();
      render(<EditPlaylistModal {...defaultProps} onSubmit={onSubmit} onClose={onClose} />);

      fireEvent.click(screen.getByText('Guardar Cambios'));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should show error message on submission failure', async () => {
      const onSubmit = vi.fn().mockRejectedValue({
        response: { data: { message: 'Playlist name already exists' } },
      });
      render(<EditPlaylistModal {...defaultProps} onSubmit={onSubmit} />);

      // Ensure name has value so button is enabled
      const nameInput = screen.getByLabelText('Nombre de la playlist');
      fireEvent.change(nameInput, { target: { value: 'Valid Name' } });

      fireEvent.click(screen.getByText('Guardar Cambios'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });

      // Error is shown in the Input component's error prop
      await waitFor(() => {
        const errorElement = document.querySelector('[class*="error"]');
        expect(errorElement).toBeTruthy();
      });
    });

    it('should not close modal on submission failure', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'));
      const onClose = vi.fn();
      render(<EditPlaylistModal {...defaultProps} onSubmit={onSubmit} onClose={onClose} />);

      fireEvent.click(screen.getByText('Guardar Cambios'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });

      // onClose should NOT be called on error
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should show loading text when isLoading is true', () => {
      render(<EditPlaylistModal {...defaultProps} isLoading={true} />);

      expect(screen.getByText('Guardando...')).toBeInTheDocument();
      expect(screen.queryByText('Guardar Cambios')).not.toBeInTheDocument();
    });

    it('should disable all inputs when loading', () => {
      render(<EditPlaylistModal {...defaultProps} isLoading={true} />);

      const nameInput = screen.getByLabelText('Nombre de la playlist');
      const descriptionInput = screen.getByLabelText('Descripción (opcional)');
      const checkbox = screen.getByRole('checkbox');

      expect(nameInput).toBeDisabled();
      expect(descriptionInput).toBeDisabled();
      expect(checkbox).toBeDisabled();
    });

    it('should disable buttons when loading', () => {
      render(<EditPlaylistModal {...defaultProps} isLoading={true} />);

      const cancelButton = screen.getByText('Cancelar');
      const submitButton = screen.getByText('Guardando...');

      expect(cancelButton).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('edge cases', () => {
    it('should handle playlist without description', () => {
      const playlistNoDesc = { ...mockPlaylist, description: undefined };
      render(<EditPlaylistModal {...defaultProps} playlist={playlistNoDesc} />);

      const descriptionInput = screen.getByLabelText('Descripción (opcional)');
      expect(descriptionInput).toHaveValue('');
    });

    it('should handle playlist with null description', () => {
      const playlistNullDesc = { ...mockPlaylist, description: null as unknown as string };
      render(<EditPlaylistModal {...defaultProps} playlist={playlistNullDesc} />);

      const descriptionInput = screen.getByLabelText('Descripción (opcional)');
      expect(descriptionInput).toHaveValue('');
    });
  });
});
