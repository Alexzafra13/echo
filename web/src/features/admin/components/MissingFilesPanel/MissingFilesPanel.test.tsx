import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MissingFilesPanel } from './MissingFilesPanel';

// Mock the API
vi.mock('../../api/missing-files.api', () => ({
  getMissingFiles: vi.fn(),
  purgeMissingFiles: vi.fn(),
  deleteMissingTrack: vi.fn(),
  updatePurgeMode: vi.fn(),
}));

vi.mock('@shared/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

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
  CollapsibleInfo: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="collapsible-info">
      <span>{title}</span>
      <div>{children}</div>
    </div>
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
  ConfirmDialog: ({
    title,
    message,
    confirmText,
    onConfirm,
    onCancel,
    isLoading,
  }: {
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
  }) => (
    <div data-testid="confirm-dialog">
      <h3>{title}</h3>
      <p>{message}</p>
      <button onClick={onCancel}>Cancelar</button>
      <button onClick={onConfirm} disabled={isLoading}>
        {confirmText}
      </button>
    </div>
  ),
}));

import {
  getMissingFiles,
  purgeMissingFiles,
  deleteMissingTrack,
  updatePurgeMode,
} from '../../api/missing-files.api';

// Mock data
const mockTracks = [
  {
    id: 'track-1',
    title: 'Comfortably Numb',
    path: '/music/pink_floyd/the_wall/comfortably_numb.mp3',
    albumName: 'The Wall',
    artistName: 'Pink Floyd',
    missingAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'track-2',
    title: 'Stairway to Heaven',
    path: '/music/led_zeppelin/iv/stairway.mp3',
    albumName: 'Led Zeppelin IV',
    artistName: 'Led Zeppelin',
    missingAt: '2024-01-14T08:00:00Z',
  },
];

const mockMissingFilesResponse = {
  tracks: mockTracks,
  count: 2,
  purgeMode: 'never',
};

describe('MissingFilesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('should show loading state initially', async () => {
      vi.mocked(getMissingFiles).mockImplementation(() => new Promise(() => {}));

      render(<MissingFilesPanel />);

      expect(screen.getByText('Cargando archivos desaparecidos...')).toBeInTheDocument();
    });
  });

  describe('rendering', () => {
    beforeEach(() => {
      vi.mocked(getMissingFiles).mockResolvedValue(mockMissingFilesResponse);
    });

    it('should render panel title', async () => {
      render(<MissingFilesPanel />);

      await waitFor(() => {
        expect(screen.getByText('Archivos Desaparecidos')).toBeInTheDocument();
      });
    });

    it('should render description', async () => {
      render(<MissingFilesPanel />);

      await waitFor(() => {
        expect(
          screen.getByText('Tracks marcados como desaparecidos (archivo no encontrado en disco)')
        ).toBeInTheDocument();
      });
    });

    it('should render track count', async () => {
      render(<MissingFilesPanel />);

      await waitFor(() => {
        expect(screen.getByText('Tracks desaparecidos:')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should render purge mode', async () => {
      render(<MissingFilesPanel />);

      await waitFor(() => {
        expect(screen.getByText('Modo de purga:')).toBeInTheDocument();
        expect(screen.getByText('Nunca eliminar')).toBeInTheDocument();
      });
    });

    it('should render refresh button', async () => {
      render(<MissingFilesPanel />);

      await waitFor(() => {
        expect(screen.getByText('Actualizar')).toBeInTheDocument();
      });
    });

    it('should render collapsible info', async () => {
      render(<MissingFilesPanel />);

      await waitFor(() => {
        expect(screen.getByTestId('collapsible-info')).toBeInTheDocument();
        expect(screen.getByText('Sobre los archivos desaparecidos')).toBeInTheDocument();
      });
    });
  });

  describe('purge mode labels', () => {
    it('should show "Nunca eliminar" for never mode', async () => {
      vi.mocked(getMissingFiles).mockResolvedValue({
        ...mockMissingFilesResponse,
        purgeMode: 'never',
      });

      render(<MissingFilesPanel />);

      await waitFor(() => {
        expect(screen.getByText('Nunca eliminar')).toBeInTheDocument();
      });
    });

    it('should show "Eliminar inmediatamente" for always mode', async () => {
      vi.mocked(getMissingFiles).mockResolvedValue({
        ...mockMissingFilesResponse,
        purgeMode: 'always',
      });

      render(<MissingFilesPanel />);

      await waitFor(() => {
        expect(screen.getByText('Eliminar inmediatamente')).toBeInTheDocument();
      });
    });

    it('should show days for after_days mode', async () => {
      vi.mocked(getMissingFiles).mockResolvedValue({
        ...mockMissingFilesResponse,
        purgeMode: 'after_days:30',
      });

      render(<MissingFilesPanel />);

      await waitFor(() => {
        expect(screen.getByText('Eliminar despues de 30 dias')).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    it('should show empty state when no missing files', async () => {
      vi.mocked(getMissingFiles).mockResolvedValue({
        tracks: [],
        count: 0,
        purgeMode: 'never',
      });

      render(<MissingFilesPanel />);

      await waitFor(() => {
        expect(screen.getByText('No hay archivos desaparecidos')).toBeInTheDocument();
        expect(
          screen.getByText('Todos los archivos de tu biblioteca estan presentes en disco')
        ).toBeInTheDocument();
      });
    });

    it('should not show purge button when no tracks', async () => {
      vi.mocked(getMissingFiles).mockResolvedValue({
        tracks: [],
        count: 0,
        purgeMode: 'never',
      });

      render(<MissingFilesPanel />);

      await waitFor(() => {
        expect(screen.getByText('No hay archivos desaparecidos')).toBeInTheDocument();
      });

      expect(screen.queryByText('Purgar Todos')).not.toBeInTheDocument();
    });
  });

  describe('tracks list', () => {
    beforeEach(() => {
      vi.mocked(getMissingFiles).mockResolvedValue(mockMissingFilesResponse);
    });

    it('should render track titles', async () => {
      render(<MissingFilesPanel />);

      await waitFor(() => {
        expect(screen.getByText('Comfortably Numb')).toBeInTheDocument();
        expect(screen.getByText('Stairway to Heaven')).toBeInTheDocument();
      });
    });

    it('should render artist names', async () => {
      render(<MissingFilesPanel />);

      await waitFor(() => {
        expect(screen.getByText('Pink Floyd')).toBeInTheDocument();
        expect(screen.getByText('Led Zeppelin')).toBeInTheDocument();
      });
    });

    it('should render album names', async () => {
      render(<MissingFilesPanel />);

      await waitFor(() => {
        expect(screen.getByText('The Wall')).toBeInTheDocument();
        expect(screen.getByText('Led Zeppelin IV')).toBeInTheDocument();
      });
    });

    it('should render file paths', async () => {
      render(<MissingFilesPanel />);

      await waitFor(() => {
        expect(
          screen.getByText('/music/pink_floyd/the_wall/comfortably_numb.mp3')
        ).toBeInTheDocument();
      });
    });
  });

  describe('refresh', () => {
    it('should reload data when clicking refresh button', async () => {
      vi.mocked(getMissingFiles).mockResolvedValue(mockMissingFilesResponse);

      render(<MissingFilesPanel />);

      await waitFor(() => {
        expect(screen.getByText('Actualizar')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Actualizar'));

      await waitFor(() => {
        // Initial load + refresh
        expect(getMissingFiles).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('delete track', () => {
    beforeEach(() => {
      vi.mocked(getMissingFiles).mockResolvedValue(mockMissingFilesResponse);
    });

    it('should delete track when clicking delete button', async () => {
      vi.mocked(deleteMissingTrack).mockResolvedValue({
        success: true,
        message: 'Track eliminado correctamente',
      });

      render(<MissingFilesPanel />);

      await waitFor(() => {
        expect(screen.getByText('Comfortably Numb')).toBeInTheDocument();
      });

      // Find delete buttons
      const deleteButtons = screen.getAllByTitle('Eliminar track');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(deleteMissingTrack).toHaveBeenCalledWith('track-1');
      });
    });

    it('should show success notification after deleting', async () => {
      vi.mocked(deleteMissingTrack).mockResolvedValue({
        success: true,
        message: 'Track eliminado correctamente',
      });

      render(<MissingFilesPanel />);

      await waitFor(() => {
        expect(screen.getByText('Comfortably Numb')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Eliminar track');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('notification')).toBeInTheDocument();
        expect(screen.getByText('Track eliminado correctamente')).toBeInTheDocument();
      });
    });

    it('should show error notification on delete failure', async () => {
      vi.mocked(deleteMissingTrack).mockResolvedValue({
        success: false,
        message: 'Error al eliminar',
      });

      render(<MissingFilesPanel />);

      await waitFor(() => {
        expect(screen.getByText('Comfortably Numb')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Eliminar track');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Error al eliminar')).toBeInTheDocument();
      });
    });

    it('should remove track from list after successful delete', async () => {
      vi.mocked(deleteMissingTrack).mockResolvedValue({
        success: true,
        message: 'Track eliminado correctamente',
      });

      render(<MissingFilesPanel />);

      await waitFor(() => {
        expect(screen.getByText('Comfortably Numb')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Eliminar track');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText('Comfortably Numb')).not.toBeInTheDocument();
      });
    });
  });

  describe('purge all', () => {
    beforeEach(() => {
      vi.mocked(getMissingFiles).mockResolvedValue(mockMissingFilesResponse);
    });

    it('should show purge button when there are tracks', async () => {
      render(<MissingFilesPanel />);

      await waitFor(() => {
        expect(screen.getByText('Purgar Todos')).toBeInTheDocument();
      });
    });

    it('should show confirm dialog when clicking purge', async () => {
      render(<MissingFilesPanel />);

      await waitFor(() => {
        expect(screen.getByText('Purgar Todos')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Purgar Todos'));

      await waitFor(() => {
        expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
        expect(screen.getByText('Purgar Archivos Desaparecidos')).toBeInTheDocument();
      });
    });

    it('should cancel purge when clicking cancel', async () => {
      render(<MissingFilesPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Purgar Todos'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cancelar'));

      await waitFor(() => {
        expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
      });
    });

    it('should purge all tracks when confirming', async () => {
      vi.mocked(purgeMissingFiles).mockResolvedValue({
        success: true,
        deleted: 2,
        message: '2 tracks eliminados',
      });

      render(<MissingFilesPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Purgar Todos'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
      });

      // Find confirm button (second button in dialog)
      const confirmButton = screen.getAllByRole('button').find(
        (btn) => btn.textContent === 'Purgar Todos' && btn.closest('[data-testid="confirm-dialog"]')
      );
      if (confirmButton) {
        fireEvent.click(confirmButton);
      }

      await waitFor(() => {
        expect(purgeMissingFiles).toHaveBeenCalled();
      });
    });

    it('should show success notification after purging', async () => {
      vi.mocked(purgeMissingFiles).mockResolvedValue({
        success: true,
        deleted: 2,
        message: '2 tracks eliminados',
      });

      render(<MissingFilesPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Purgar Todos'));
      });

      await waitFor(() => {
        const buttons = screen.getAllByText('Purgar Todos');
        const confirmBtn = buttons.find((btn) => btn.closest('[data-testid="confirm-dialog"]'));
        if (confirmBtn) fireEvent.click(confirmBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('2 tracks eliminados')).toBeInTheDocument();
      });
    });
  });

  describe('settings modal', () => {
    beforeEach(() => {
      vi.mocked(getMissingFiles).mockResolvedValue(mockMissingFilesResponse);
    });

    it('should open settings modal when clicking settings button', async () => {
      render(<MissingFilesPanel />);

      await waitFor(() => {
        expect(screen.getByTitle('Configuracion de purga')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle('Configuracion de purga'));

      await waitFor(() => {
        expect(screen.getByText('Configuracion de Purga')).toBeInTheDocument();
      });
    });

    it('should show purge mode options', async () => {
      render(<MissingFilesPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByTitle('Configuracion de purga'));
      });

      await waitFor(() => {
        expect(screen.getByText('Mantener tracks desaparecidos indefinidamente')).toBeInTheDocument();
        expect(
          screen.getByText('Eliminar tracks tan pronto se detecte que el archivo no existe')
        ).toBeInTheDocument();
      });
    });

    it('should close modal when clicking cancel', async () => {
      render(<MissingFilesPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByTitle('Configuracion de purga'));
      });

      await waitFor(() => {
        expect(screen.getByText('Configuracion de Purga')).toBeInTheDocument();
      });

      // Find cancel button in modal
      const cancelButton = screen.getAllByRole('button').find(
        (btn) => btn.textContent === 'Cancelar'
      );
      if (cancelButton) {
        fireEvent.click(cancelButton);
      }

      await waitFor(() => {
        expect(screen.queryByText('Configuracion de Purga')).not.toBeInTheDocument();
      });
    });

    it('should save settings when clicking save', async () => {
      vi.mocked(updatePurgeMode).mockResolvedValue({ success: true });

      render(<MissingFilesPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByTitle('Configuracion de purga'));
      });

      await waitFor(() => {
        expect(screen.getByText('Guardar')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Guardar'));

      await waitFor(() => {
        expect(updatePurgeMode).toHaveBeenCalledWith('never');
      });
    });

    it('should show success notification after saving settings', async () => {
      vi.mocked(updatePurgeMode).mockResolvedValue({ success: true });

      render(<MissingFilesPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByTitle('Configuracion de purga'));
      });

      await waitFor(() => {
        fireEvent.click(screen.getByText('Guardar'));
      });

      await waitFor(() => {
        expect(screen.getByText('Configuracion guardada')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should show error notification when loading fails', async () => {
      vi.mocked(getMissingFiles).mockRejectedValue(new Error('Network error'));

      render(<MissingFilesPanel />);

      await waitFor(() => {
        expect(screen.getByText('Error al cargar archivos desaparecidos')).toBeInTheDocument();
      });
    });

    it('should show error notification when purge fails', async () => {
      vi.mocked(getMissingFiles).mockResolvedValue(mockMissingFilesResponse);
      vi.mocked(purgeMissingFiles).mockRejectedValue(new Error('Purge failed'));

      render(<MissingFilesPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Purgar Todos'));
      });

      await waitFor(() => {
        const buttons = screen.getAllByText('Purgar Todos');
        const confirmBtn = buttons.find((btn) => btn.closest('[data-testid="confirm-dialog"]'));
        if (confirmBtn) fireEvent.click(confirmBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('Error al purgar archivos')).toBeInTheDocument();
      });
    });

    it('should show error notification when delete fails', async () => {
      vi.mocked(getMissingFiles).mockResolvedValue(mockMissingFilesResponse);
      vi.mocked(deleteMissingTrack).mockRejectedValue(new Error('Delete failed'));

      render(<MissingFilesPanel />);

      await waitFor(() => {
        expect(screen.getByText('Comfortably Numb')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Eliminar track');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Error al eliminar track')).toBeInTheDocument();
      });
    });

    it('should show error notification when saving settings fails', async () => {
      vi.mocked(getMissingFiles).mockResolvedValue(mockMissingFilesResponse);
      vi.mocked(updatePurgeMode).mockRejectedValue(new Error('Save failed'));

      render(<MissingFilesPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByTitle('Configuracion de purga'));
      });

      await waitFor(() => {
        fireEvent.click(screen.getByText('Guardar'));
      });

      await waitFor(() => {
        expect(screen.getByText('Error al guardar configuracion')).toBeInTheDocument();
      });
    });
  });
});
