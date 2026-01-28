import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MaintenanceTab } from './MaintenanceTab';

// Mock the API client
vi.mock('@shared/services/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock the logger
vi.mock('@shared/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock formatBytes
vi.mock('@shared/utils/format', () => ({
  formatBytes: (bytes: number) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  },
}));

// Mock error utils
vi.mock('@shared/utils/error.utils', () => ({
  getApiErrorMessage: (_err: unknown, defaultMsg: string) => defaultMsg,
}));

// Mock MissingFilesPanel
vi.mock('../MissingFilesPanel', () => ({
  MissingFilesPanel: () => <div data-testid="missing-files-panel">Missing Files Panel</div>,
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

import { apiClient } from '@shared/services/api';

// Mock data
const mockStats = {
  totalSize: 1073741824, // 1 GB
  totalFiles: 1500,
  artistsWithMetadata: 50,
  albumsWithCovers: 200,
  orphanedFiles: 0,
};

const mockStatsWithOrphans = {
  ...mockStats,
  orphanedFiles: 10,
};

const mockPaths = {
  dataPath: '/data/echo',
  musicPath: '/music',
  metadataPath: '/data/echo/metadata',
  albumCoversPath: '/data/echo/covers',
  artistImagesPath: '/data/echo/artists',
  userUploadsPath: '/data/echo/uploads',
  isReadOnlyMusic: false,
};

const mockPathsReadOnly = {
  ...mockPaths,
  isReadOnlyMusic: true,
};

const mockCleanupResult = {
  filesRemoved: 5,
  spaceFree: 52428800, // 50 MB
  orphanedFiles: [],
  errors: [],
};

const mockCleanupResultWithErrors = {
  filesRemoved: 3,
  spaceFree: 31457280,
  orphanedFiles: [],
  errors: ['Error deleting file1.jpg', 'Error deleting file2.jpg'],
};

const mockPopulateResult = {
  albumsUpdated: 150,
  artistsUpdated: 45,
  duration: 2500,
};

describe('MaintenanceTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('loading state', () => {
    it('should show loading state initially', async () => {
      vi.mocked(apiClient.get).mockImplementation(() => new Promise(() => {}));

      render(<MaintenanceTab />);

      expect(screen.getByText('Cargando estadísticas...')).toBeInTheDocument();
    });
  });

  describe('storage stats rendering', () => {
    beforeEach(() => {
      vi.mocked(apiClient.get).mockImplementation((url: string) => {
        if (url === '/maintenance/storage/stats') {
          return Promise.resolve({ data: mockStats });
        }
        if (url === '/maintenance/storage/paths') {
          return Promise.resolve({ data: mockPaths });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });
    });

    it('should render storage section title', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(screen.getByText('Almacenamiento')).toBeInTheDocument();
      });
    });

    it('should render total size', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(screen.getByText('Tamaño Total')).toBeInTheDocument();
        expect(screen.getByText('1.0 GB')).toBeInTheDocument();
      });
    });

    it('should render total files count', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(screen.getByText('Archivos Totales')).toBeInTheDocument();
        expect(screen.getByText('1500')).toBeInTheDocument();
      });
    });

    it('should render artist images count', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(screen.getByText('Imágenes de Artistas')).toBeInTheDocument();
        expect(screen.getByText('50')).toBeInTheDocument();
      });
    });

    it('should render album images count', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(screen.getByText('Imágenes de Álbumes')).toBeInTheDocument();
        expect(screen.getByText('200')).toBeInTheDocument();
      });
    });

    it('should render refresh button', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(screen.getByText('Actualizar')).toBeInTheDocument();
      });
    });

    it('should not render orphaned files card when count is zero', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(screen.getByText('Tamaño Total')).toBeInTheDocument();
      });

      expect(screen.queryByText('Archivos Huérfanos')).not.toBeInTheDocument();
    });
  });

  describe('orphaned files warning', () => {
    beforeEach(() => {
      vi.mocked(apiClient.get).mockImplementation((url: string) => {
        if (url === '/maintenance/storage/stats') {
          return Promise.resolve({ data: mockStatsWithOrphans });
        }
        if (url === '/maintenance/storage/paths') {
          return Promise.resolve({ data: mockPaths });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });
    });

    it('should render orphaned files card when count is greater than zero', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(screen.getByText('Archivos Huérfanos')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
      });
    });
  });

  describe('storage paths rendering', () => {
    beforeEach(() => {
      vi.mocked(apiClient.get).mockImplementation((url: string) => {
        if (url === '/maintenance/storage/stats') {
          return Promise.resolve({ data: mockStats });
        }
        if (url === '/maintenance/storage/paths') {
          return Promise.resolve({ data: mockPaths });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });
    });

    it('should render storage paths section', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(screen.getByText('Rutas de Almacenamiento')).toBeInTheDocument();
      });
    });

    it('should render data path', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(screen.getByText('Datos')).toBeInTheDocument();
        expect(screen.getByText('/data/echo')).toBeInTheDocument();
      });
    });

    it('should render music path', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(screen.getByText('Música')).toBeInTheDocument();
        expect(screen.getByText('/music')).toBeInTheDocument();
      });
    });

    it('should render metadata path', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(screen.getByText('Metadatos externos')).toBeInTheDocument();
        expect(screen.getByText('/data/echo/metadata')).toBeInTheDocument();
      });
    });

    it('should render album covers path', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(screen.getByText('Carátulas de álbumes')).toBeInTheDocument();
        expect(screen.getByText('/data/echo/covers')).toBeInTheDocument();
      });
    });

    it('should render artist images path', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(screen.getByText('Imágenes de artistas')).toBeInTheDocument();
        expect(screen.getByText('/data/echo/artists')).toBeInTheDocument();
      });
    });

    it('should render user uploads path', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(screen.getByText('Avatares de usuarios')).toBeInTheDocument();
        expect(screen.getByText('/data/echo/uploads')).toBeInTheDocument();
      });
    });
  });

  describe('read-only music path', () => {
    beforeEach(() => {
      vi.mocked(apiClient.get).mockImplementation((url: string) => {
        if (url === '/maintenance/storage/stats') {
          return Promise.resolve({ data: mockStats });
        }
        if (url === '/maintenance/storage/paths') {
          return Promise.resolve({ data: mockPathsReadOnly });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });
    });

    it('should show read-only badge for music path when isReadOnlyMusic is true', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(screen.getByText('Solo lectura')).toBeInTheDocument();
      });
    });
  });

  describe('cleanup section', () => {
    beforeEach(() => {
      vi.mocked(apiClient.get).mockImplementation((url: string) => {
        if (url === '/maintenance/storage/stats') {
          return Promise.resolve({ data: mockStats });
        }
        if (url === '/maintenance/storage/paths') {
          return Promise.resolve({ data: mockPaths });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });
    });

    it('should render cleanup section title', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(screen.getByText('Limpieza')).toBeInTheDocument();
      });
    });

    it('should render cleanup section description', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(
          screen.getByText('Elimina archivos huérfanos y limpia el caché de metadata')
        ).toBeInTheDocument();
      });
    });

    it('should render orphaned files cleanup action', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(screen.getByText('Limpiar Archivos Huérfanos')).toBeInTheDocument();
        expect(
          screen.getByText(
            'Elimina archivos de metadata que no están asociados a ningún artista o álbum'
          )
        ).toBeInTheDocument();
      });
    });

    it('should render cache cleanup action', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        // There are multiple "Limpiar Caché" elements (title and button)
        expect(screen.getAllByText('Limpiar Caché').length).toBeGreaterThanOrEqual(1);
        expect(
          screen.getByText('Elimina el caché de respuestas de APIs externas (Last.fm, Fanart.tv)')
        ).toBeInTheDocument();
      });
    });

    it('should render sort names generation action', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(screen.getByText('Generar Nombres de Ordenamiento')).toBeInTheDocument();
        expect(
          screen.getByText(
            'Genera orderAlbumName y orderArtistName para álbumes existentes (necesario para orden alfabético)'
          )
        ).toBeInTheDocument();
      });
    });

    it('should render cleanup button', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(screen.getByText('Ejecutar Limpieza')).toBeInTheDocument();
      });
    });

    it('should render cache button', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        // There are multiple "Limpiar Caché" elements (title and button)
        const cacheElements = screen.getAllByText('Limpiar Caché');
        const cacheButton = cacheElements.find((el) => el.tagName === 'BUTTON');
        expect(cacheButton).toBeInTheDocument();
      });
    });

    it('should render generate names button', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(screen.getByText('Generar Nombres')).toBeInTheDocument();
      });
    });
  });

  describe('cleanup confirmation dialog', () => {
    beforeEach(() => {
      vi.mocked(apiClient.get).mockImplementation((url: string) => {
        if (url === '/maintenance/storage/stats') {
          return Promise.resolve({ data: mockStats });
        }
        if (url === '/maintenance/storage/paths') {
          return Promise.resolve({ data: mockPaths });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });
    });

    it('should show cleanup confirm dialog when clicking cleanup button', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(screen.getByText('Ejecutar Limpieza')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Ejecutar Limpieza'));

      await waitFor(() => {
        expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
        // There are multiple "Limpiar Archivos Huérfanos" (title and dialog heading)
        expect(screen.getAllByText('Limpiar Archivos Huérfanos').length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should close cleanup dialog when clicking cancel', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Ejecutar Limpieza'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cancelar'));

      await waitFor(() => {
        expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
      });
    });

    it('should run cleanup when confirming', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockCleanupResult });

      render(<MaintenanceTab />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Ejecutar Limpieza'));
      });

      await waitFor(() => {
        const confirmButton = screen
          .getAllByRole('button')
          .find((btn) => btn.textContent === 'Ejecutar Limpieza' && btn.closest('[data-testid="confirm-dialog"]'));
        if (confirmButton) fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/maintenance/cleanup/orphaned?dryRun=false');
      });
    });
  });

  describe('cleanup result', () => {
    beforeEach(() => {
      vi.mocked(apiClient.get).mockImplementation((url: string) => {
        if (url === '/maintenance/storage/stats') {
          return Promise.resolve({ data: mockStats });
        }
        if (url === '/maintenance/storage/paths') {
          return Promise.resolve({ data: mockPaths });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });
    });

    it('should show cleanup result after successful cleanup', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockCleanupResult });

      render(<MaintenanceTab />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Ejecutar Limpieza'));
      });

      await waitFor(() => {
        const confirmButton = screen
          .getAllByRole('button')
          .find((btn) => btn.textContent === 'Ejecutar Limpieza' && btn.closest('[data-testid="confirm-dialog"]'));
        if (confirmButton) fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Limpieza completada')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('archivos eliminados')).toBeInTheDocument();
        expect(screen.getByText('50.0 MB')).toBeInTheDocument();
        expect(screen.getByText('recuperados')).toBeInTheDocument();
      });
    });

    it('should show errors count when cleanup has errors', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockCleanupResultWithErrors });

      render(<MaintenanceTab />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Ejecutar Limpieza'));
      });

      await waitFor(() => {
        const confirmButton = screen
          .getAllByRole('button')
          .find((btn) => btn.textContent === 'Ejecutar Limpieza' && btn.closest('[data-testid="confirm-dialog"]'));
        if (confirmButton) fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('errores')).toBeInTheDocument();
      });
    });

    it('should auto-hide cleanup result after 5 seconds', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockCleanupResult });

      render(<MaintenanceTab />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Ejecutar Limpieza'));
      });

      await waitFor(() => {
        const confirmButton = screen
          .getAllByRole('button')
          .find((btn) => btn.textContent === 'Ejecutar Limpieza' && btn.closest('[data-testid="confirm-dialog"]'));
        if (confirmButton) fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Limpieza completada')).toBeInTheDocument();
      });

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Limpieza completada')).not.toBeInTheDocument();
      });
    });
  });

  describe('cache cleanup', () => {
    beforeEach(() => {
      vi.mocked(apiClient.get).mockImplementation((url: string) => {
        if (url === '/maintenance/storage/stats') {
          return Promise.resolve({ data: mockStats });
        }
        if (url === '/maintenance/storage/paths') {
          return Promise.resolve({ data: mockPaths });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });
    });

    it('should show cache confirm dialog when clicking cache button', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        // There are multiple "Limpiar Caché" elements (title and button)
        expect(screen.getAllByText('Limpiar Caché').length).toBeGreaterThanOrEqual(1);
      });

      // Find the button in the action card (not the title)
      const cacheButtons = screen.getAllByText('Limpiar Caché');
      const cacheButton = cacheButtons.find((btn) => btn.tagName === 'BUTTON');
      if (cacheButton) fireEvent.click(cacheButton);

      await waitFor(() => {
        expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
        expect(screen.getByText('Limpiar Caché de Metadata')).toBeInTheDocument();
      });
    });

    it('should clear cache when confirming', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });

      render(<MaintenanceTab />);

      await waitFor(() => {
        const cacheButtons = screen.getAllByText('Limpiar Caché');
        const cacheButton = cacheButtons.find((btn) => btn.tagName === 'BUTTON');
        if (cacheButton) fireEvent.click(cacheButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
      });

      const confirmButton = screen
        .getAllByRole('button')
        .find((btn) => btn.textContent === 'Limpiar Caché' && btn.closest('[data-testid="confirm-dialog"]'));
      if (confirmButton) fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/admin/settings/cache/clear');
      });
    });

    it('should show success notification after clearing cache', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });

      render(<MaintenanceTab />);

      await waitFor(() => {
        const cacheButtons = screen.getAllByText('Limpiar Caché');
        const cacheButton = cacheButtons.find((btn) => btn.tagName === 'BUTTON');
        if (cacheButton) fireEvent.click(cacheButton);
      });

      await waitFor(() => {
        const confirmButton = screen
          .getAllByRole('button')
          .find((btn) => btn.textContent === 'Limpiar Caché' && btn.closest('[data-testid="confirm-dialog"]'));
        if (confirmButton) fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Caché limpiado correctamente')).toBeInTheDocument();
      });
    });
  });

  describe('populate sort names', () => {
    beforeEach(() => {
      vi.mocked(apiClient.get).mockImplementation((url: string) => {
        if (url === '/maintenance/storage/stats') {
          return Promise.resolve({ data: mockStats });
        }
        if (url === '/maintenance/storage/paths') {
          return Promise.resolve({ data: mockPaths });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });
    });

    it('should call populate endpoint when clicking generate names button', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockPopulateResult });

      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(screen.getByText('Generar Nombres')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Generar Nombres'));

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/maintenance/populate-sort-names');
      });
    });

    it('should show populate result after successful operation', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockPopulateResult });

      render(<MaintenanceTab />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Generar Nombres'));
      });

      await waitFor(() => {
        expect(screen.getByText('Nombres generados correctamente')).toBeInTheDocument();
        expect(screen.getByText('150')).toBeInTheDocument();
        expect(screen.getByText('álbumes actualizados')).toBeInTheDocument();
        expect(screen.getByText('45')).toBeInTheDocument();
        expect(screen.getByText('artistas actualizados')).toBeInTheDocument();
        expect(screen.getByText('2.50s')).toBeInTheDocument();
      });
    });

    it('should auto-hide populate result after 5 seconds', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockPopulateResult });

      render(<MaintenanceTab />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Generar Nombres'));
      });

      await waitFor(() => {
        expect(screen.getByText('Nombres generados correctamente')).toBeInTheDocument();
      });

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Nombres generados correctamente')).not.toBeInTheDocument();
      });
    });

    it('should show error when populate fails', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Populate failed'));

      render(<MaintenanceTab />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Generar Nombres'));
      });

      await waitFor(() => {
        expect(screen.getByText('Error al generar nombres de ordenamiento')).toBeInTheDocument();
      });
    });
  });

  describe('refresh stats', () => {
    beforeEach(() => {
      vi.mocked(apiClient.get).mockImplementation((url: string) => {
        if (url === '/maintenance/storage/stats') {
          return Promise.resolve({ data: mockStats });
        }
        if (url === '/maintenance/storage/paths') {
          return Promise.resolve({ data: mockPaths });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });
    });

    it('should reload stats when clicking refresh button', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(screen.getByText('Actualizar')).toBeInTheDocument();
      });

      // Clear mocks to count new calls
      vi.mocked(apiClient.get).mockClear();
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStats });

      fireEvent.click(screen.getByText('Actualizar'));

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/maintenance/storage/stats');
      });
    });

    it('should show updating text while refreshing', async () => {
      let resolveStats: (value: unknown) => void;
      vi.mocked(apiClient.get).mockImplementation((url: string) => {
        if (url === '/maintenance/storage/stats') {
          return new Promise((resolve) => {
            resolveStats = resolve;
          });
        }
        if (url === '/maintenance/storage/paths') {
          return Promise.resolve({ data: mockPaths });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      render(<MaintenanceTab />);

      // Wait for initial load to show loading text
      expect(screen.getByText('Cargando estadísticas...')).toBeInTheDocument();

      // Resolve the promise
      resolveStats!({ data: mockStats });

      await waitFor(() => {
        expect(screen.getByText('Actualizar')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should show error message when stats loading fails', async () => {
      vi.mocked(apiClient.get).mockImplementation((url: string) => {
        if (url === '/maintenance/storage/stats') {
          return Promise.reject(new Error('Network error'));
        }
        if (url === '/maintenance/storage/paths') {
          return Promise.resolve({ data: mockPaths });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(screen.getByText('Error al cargar estadísticas')).toBeInTheDocument();
      });
    });

    it('should show error notification when cleanup fails', async () => {
      vi.mocked(apiClient.get).mockImplementation((url: string) => {
        if (url === '/maintenance/storage/stats') {
          return Promise.resolve({ data: mockStats });
        }
        if (url === '/maintenance/storage/paths') {
          return Promise.resolve({ data: mockPaths });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Cleanup failed'));

      render(<MaintenanceTab />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Ejecutar Limpieza'));
      });

      await waitFor(() => {
        const confirmButton = screen
          .getAllByRole('button')
          .find((btn) => btn.textContent === 'Ejecutar Limpieza' && btn.closest('[data-testid="confirm-dialog"]'));
        if (confirmButton) fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Error al ejecutar limpieza')).toBeInTheDocument();
      });
    });

    it('should show error notification when cache clear fails', async () => {
      vi.mocked(apiClient.get).mockImplementation((url: string) => {
        if (url === '/maintenance/storage/stats') {
          return Promise.resolve({ data: mockStats });
        }
        if (url === '/maintenance/storage/paths') {
          return Promise.resolve({ data: mockPaths });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Cache clear failed'));

      render(<MaintenanceTab />);

      await waitFor(() => {
        const cacheButtons = screen.getAllByText('Limpiar Caché');
        const cacheButton = cacheButtons.find((btn) => btn.tagName === 'BUTTON');
        if (cacheButton) fireEvent.click(cacheButton);
      });

      await waitFor(() => {
        const confirmButton = screen
          .getAllByRole('button')
          .find((btn) => btn.textContent === 'Limpiar Caché' && btn.closest('[data-testid="confirm-dialog"]'));
        if (confirmButton) fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Error al limpiar caché')).toBeInTheDocument();
      });
    });
  });

  describe('missing files panel', () => {
    beforeEach(() => {
      vi.mocked(apiClient.get).mockImplementation((url: string) => {
        if (url === '/maintenance/storage/stats') {
          return Promise.resolve({ data: mockStats });
        }
        if (url === '/maintenance/storage/paths') {
          return Promise.resolve({ data: mockPaths });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });
    });

    it('should render MissingFilesPanel', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(screen.getByTestId('missing-files-panel')).toBeInTheDocument();
      });
    });
  });

  describe('collapsible info', () => {
    beforeEach(() => {
      vi.mocked(apiClient.get).mockImplementation((url: string) => {
        if (url === '/maintenance/storage/stats') {
          return Promise.resolve({ data: mockStats });
        }
        if (url === '/maintenance/storage/paths') {
          return Promise.resolve({ data: mockPaths });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });
    });

    it('should render collapsible info section', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(screen.getByTestId('collapsible-info')).toBeInTheDocument();
        expect(screen.getByText('Sobre la limpieza')).toBeInTheDocument();
      });
    });

    it('should render info content', async () => {
      render(<MaintenanceTab />);

      await waitFor(() => {
        expect(
          screen.getByText(
            'La limpieza eliminará archivos que no están referenciados en la base de datos. Se recomienda ejecutarla periódicamente para liberar espacio en disco.'
          )
        ).toBeInTheDocument();
        expect(
          screen.getByText('El caché se reconstruirá automáticamente cuando sea necesario.')
        ).toBeInTheDocument();
      });
    });
  });

  describe('notification dismissal', () => {
    beforeEach(() => {
      vi.mocked(apiClient.get).mockImplementation((url: string) => {
        if (url === '/maintenance/storage/stats') {
          return Promise.resolve({ data: mockStats });
        }
        if (url === '/maintenance/storage/paths') {
          return Promise.resolve({ data: mockPaths });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });
    });

    it('should dismiss notification when clicking dismiss button', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });

      render(<MaintenanceTab />);

      await waitFor(() => {
        const cacheButtons = screen.getAllByText('Limpiar Caché');
        const cacheButton = cacheButtons.find((btn) => btn.tagName === 'BUTTON');
        if (cacheButton) fireEvent.click(cacheButton);
      });

      await waitFor(() => {
        const confirmButton = screen
          .getAllByRole('button')
          .find((btn) => btn.textContent === 'Limpiar Caché' && btn.closest('[data-testid="confirm-dialog"]'));
        if (confirmButton) fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Caché limpiado correctamente')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Dismiss'));

      await waitFor(() => {
        expect(screen.queryByText('Caché limpiado correctamente')).not.toBeInTheDocument();
      });
    });
  });
});
