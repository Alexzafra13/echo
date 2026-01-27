import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScannerPanel } from './ScannerPanel';

// Mock the hooks
vi.mock('../../hooks/useScanner', () => ({
  useScannerHistory: vi.fn(),
  useStartScan: vi.fn(),
}));

vi.mock('@shared/hooks/useScannerWebSocket', () => ({
  useScannerWebSocket: vi.fn(),
}));

vi.mock('@shared/store', () => ({
  useAuthStore: vi.fn(() => ({ accessToken: 'mock-token' })),
}));

vi.mock('@shared/utils/format', () => ({
  formatDateShort: vi.fn((date: string) => `Formatted: ${date}`),
}));

vi.mock('@shared/components/ui', () => ({
  CollapsibleInfo: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="collapsible-info">
      <span>{title}</span>
      <div>{children}</div>
    </div>
  ),
}));

import { useScannerHistory, useStartScan } from '../../hooks/useScanner';
import { useScannerWebSocket } from '@shared/hooks/useScannerWebSocket';

// Mock data
const mockHistoryData = {
  scans: [
    {
      id: 'scan-1',
      status: 'completed',
      startedAt: '2024-01-15T10:00:00Z',
      finishedAt: '2024-01-15T10:30:00Z',
      tracksAdded: 150,
      tracksUpdated: 25,
      tracksDeleted: 5,
    },
    {
      id: 'scan-2',
      status: 'failed',
      startedAt: '2024-01-14T08:00:00Z',
      tracksAdded: 0,
      tracksUpdated: 0,
      tracksDeleted: 0,
      errorMessage: 'Permission denied',
    },
  ],
  total: 2,
  page: 1,
  limit: 10,
};

const mockProgress = {
  scanId: 'scan-new',
  status: 'scanning',
  progress: 45,
  filesScanned: 450,
  totalFiles: 1000,
  tracksCreated: 100,
  albumsCreated: 20,
  artistsCreated: 15,
  coversExtracted: 18,
  errors: 2,
  currentFile: '/music/rock/song.mp3',
  message: 'Escaneando archivos...',
};

const mockLufsProgress = {
  isRunning: true,
  pendingTracks: 50,
  processedInSession: 100,
  estimatedTimeRemaining: '5 min',
};

describe('ScannerPanel', () => {
  const mockStartScan = vi.fn();
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(useScannerHistory).mockReturnValue({
      data: mockHistoryData,
      isLoading: false,
      refetch: mockRefetch,
    } as ReturnType<typeof useScannerHistory>);

    vi.mocked(useStartScan).mockReturnValue({
      mutate: mockStartScan,
      isPending: false,
      data: undefined,
    } as unknown as ReturnType<typeof useStartScan>);

    vi.mocked(useScannerWebSocket).mockReturnValue({
      progress: null,
      errors: [],
      completed: null,
      lufsProgress: null,
      isConnected: true,
      isCompleted: false,
      pauseScan: vi.fn(),
      cancelScan: vi.fn(),
      resumeScan: vi.fn(),
    });
  });

  describe('rendering', () => {
    it('should render panel title', () => {
      render(<ScannerPanel />);
      expect(screen.getByText('Librería Musical')).toBeInTheDocument();
    });

    it('should render panel description', () => {
      render(<ScannerPanel />);
      expect(
        screen.getByText('Escanea tu carpeta de música para importar canciones, álbumes y artistas')
      ).toBeInTheDocument();
    });

    it('should render scan button', () => {
      render(<ScannerPanel />);
      expect(screen.getByText('Escanear Ahora')).toBeInTheDocument();
    });

    it('should render collapsible info', () => {
      render(<ScannerPanel />);
      expect(screen.getByTestId('collapsible-info')).toBeInTheDocument();
      expect(screen.getByText('Escaneo de música')).toBeInTheDocument();
    });

    it('should render history toggle button', () => {
      render(<ScannerPanel />);
      expect(screen.getByText('Ver historial de escaneos')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading state for history when toggled', () => {
      vi.mocked(useScannerHistory).mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: mockRefetch,
      } as ReturnType<typeof useScannerHistory>);

      render(<ScannerPanel />);

      // Toggle history
      fireEvent.click(screen.getByText('Ver historial de escaneos'));

      expect(screen.getByText('Cargando historial...')).toBeInTheDocument();
    });
  });

  describe('latest scan status', () => {
    it('should show completed scan status', () => {
      render(<ScannerPanel />);
      expect(screen.getByText('Completado')).toBeInTheDocument();
    });

    it('should show scan stats for completed scan', () => {
      render(<ScannerPanel />);

      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('Añadidos')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('Actualizados')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Eliminados')).toBeInTheDocument();
    });

    it('should show failed scan status', () => {
      vi.mocked(useScannerHistory).mockReturnValue({
        data: {
          scans: [
            {
              id: 'scan-failed',
              status: 'failed',
              startedAt: '2024-01-15T10:00:00Z',
              tracksAdded: 0,
              tracksUpdated: 0,
              tracksDeleted: 0,
              errorMessage: 'Access denied to directory',
            },
          ],
          total: 1,
          page: 1,
          limit: 10,
        },
        isLoading: false,
        refetch: mockRefetch,
      } as ReturnType<typeof useScannerHistory>);

      render(<ScannerPanel />);

      expect(screen.getByText('Fallido')).toBeInTheDocument();
      expect(screen.getByText('Access denied to directory')).toBeInTheDocument();
    });

    it('should show running scan status', () => {
      vi.mocked(useScannerHistory).mockReturnValue({
        data: {
          scans: [
            {
              id: 'scan-running',
              status: 'running',
              startedAt: '2024-01-15T10:00:00Z',
              tracksAdded: 0,
              tracksUpdated: 0,
              tracksDeleted: 0,
            },
          ],
          total: 1,
          page: 1,
          limit: 10,
        },
        isLoading: false,
        refetch: mockRefetch,
      } as ReturnType<typeof useScannerHistory>);

      render(<ScannerPanel />);

      expect(screen.getByText('En progreso')).toBeInTheDocument();
    });

    it('should show pending scan status', () => {
      vi.mocked(useScannerHistory).mockReturnValue({
        data: {
          scans: [
            {
              id: 'scan-pending',
              status: 'pending',
              startedAt: '2024-01-15T10:00:00Z',
              tracksAdded: 0,
              tracksUpdated: 0,
              tracksDeleted: 0,
            },
          ],
          total: 1,
          page: 1,
          limit: 10,
        },
        isLoading: false,
        refetch: mockRefetch,
      } as ReturnType<typeof useScannerHistory>);

      render(<ScannerPanel />);

      expect(screen.getByText('Pendiente')).toBeInTheDocument();
    });
  });

  describe('scan button', () => {
    it('should start scan when clicking button', () => {
      render(<ScannerPanel />);

      fireEvent.click(screen.getByText('Escanear Ahora'));

      expect(mockStartScan).toHaveBeenCalledWith(
        { recursive: true, pruneDeleted: true },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
    });

    it('should show scanning state when scan is in progress', () => {
      vi.mocked(useStartScan).mockReturnValue({
        mutate: mockStartScan,
        isPending: true,
        data: undefined,
      } as unknown as ReturnType<typeof useStartScan>);

      render(<ScannerPanel />);

      expect(screen.getByText('Escaneando...')).toBeInTheDocument();
    });

    it('should disable button while scanning', () => {
      vi.mocked(useStartScan).mockReturnValue({
        mutate: mockStartScan,
        isPending: true,
        data: undefined,
      } as unknown as ReturnType<typeof useStartScan>);

      render(<ScannerPanel />);

      const button = screen.getByRole('button', { name: /escaneando/i });
      expect(button).toBeDisabled();
    });
  });

  describe('real-time progress', () => {
    it('should show progress bar when scanning', () => {
      vi.mocked(useScannerWebSocket).mockReturnValue({
        progress: mockProgress,
        errors: [],
        completed: null,
        lufsProgress: null,
        isConnected: true,
        isCompleted: false,
        pauseScan: vi.fn(),
        cancelScan: vi.fn(),
        resumeScan: vi.fn(),
      });

      vi.mocked(useStartScan).mockReturnValue({
        mutate: mockStartScan,
        isPending: false,
        data: { id: 'scan-new' },
      } as unknown as ReturnType<typeof useStartScan>);

      render(<ScannerPanel />);

      expect(screen.getByText('Escaneando archivos...')).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument();
    });

    it('should show real-time stats', () => {
      vi.mocked(useScannerWebSocket).mockReturnValue({
        progress: mockProgress,
        errors: [],
        completed: null,
        lufsProgress: null,
        isConnected: true,
        isCompleted: false,
        pauseScan: vi.fn(),
        cancelScan: vi.fn(),
        resumeScan: vi.fn(),
      });

      vi.mocked(useStartScan).mockReturnValue({
        mutate: mockStartScan,
        isPending: false,
        data: { id: 'scan-new' },
      } as unknown as ReturnType<typeof useStartScan>);

      render(<ScannerPanel />);

      expect(screen.getByText('100')).toBeInTheDocument(); // Tracks
      expect(screen.getByText('Tracks')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument(); // Albums
      expect(screen.getByText('Álbumes')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument(); // Artists
      expect(screen.getByText('Artistas')).toBeInTheDocument();
      expect(screen.getByText('18')).toBeInTheDocument(); // Covers
      expect(screen.getByText('Covers')).toBeInTheDocument();
    });

    it('should show file counter', () => {
      vi.mocked(useScannerWebSocket).mockReturnValue({
        progress: mockProgress,
        errors: [],
        completed: null,
        lufsProgress: null,
        isConnected: true,
        isCompleted: false,
        pauseScan: vi.fn(),
        cancelScan: vi.fn(),
        resumeScan: vi.fn(),
      });

      vi.mocked(useStartScan).mockReturnValue({
        mutate: mockStartScan,
        isPending: false,
        data: { id: 'scan-new' },
      } as unknown as ReturnType<typeof useStartScan>);

      render(<ScannerPanel />);

      expect(screen.getByText('450 / 1000 archivos procesados')).toBeInTheDocument();
    });

    it('should show error count when there are errors', () => {
      vi.mocked(useScannerWebSocket).mockReturnValue({
        progress: mockProgress,
        errors: [],
        completed: null,
        lufsProgress: null,
        isConnected: true,
        isCompleted: false,
        pauseScan: vi.fn(),
        cancelScan: vi.fn(),
        resumeScan: vi.fn(),
      });

      vi.mocked(useStartScan).mockReturnValue({
        mutate: mockStartScan,
        isPending: false,
        data: { id: 'scan-new' },
      } as unknown as ReturnType<typeof useStartScan>);

      render(<ScannerPanel />);

      expect(screen.getByText('2 errores')).toBeInTheDocument();
    });

    it('should show current file being processed', () => {
      vi.mocked(useScannerWebSocket).mockReturnValue({
        progress: mockProgress,
        errors: [],
        completed: null,
        lufsProgress: null,
        isConnected: true,
        isCompleted: false,
        pauseScan: vi.fn(),
        cancelScan: vi.fn(),
        resumeScan: vi.fn(),
      });

      vi.mocked(useStartScan).mockReturnValue({
        mutate: mockStartScan,
        isPending: false,
        data: { id: 'scan-new' },
      } as unknown as ReturnType<typeof useStartScan>);

      render(<ScannerPanel />);

      expect(screen.getByText('Procesando:')).toBeInTheDocument();
      expect(screen.getByText('song.mp3')).toBeInTheDocument();
    });

    it('should show connection status', () => {
      vi.mocked(useScannerWebSocket).mockReturnValue({
        progress: mockProgress,
        errors: [],
        completed: null,
        lufsProgress: null,
        isConnected: true,
        isCompleted: false,
        pauseScan: vi.fn(),
        cancelScan: vi.fn(),
        resumeScan: vi.fn(),
      });

      vi.mocked(useStartScan).mockReturnValue({
        mutate: mockStartScan,
        isPending: false,
        data: { id: 'scan-new' },
      } as unknown as ReturnType<typeof useStartScan>);

      render(<ScannerPanel />);

      expect(screen.getByText('🔌 Conectado')).toBeInTheDocument();
    });

    it('should show disconnected status', () => {
      vi.mocked(useScannerWebSocket).mockReturnValue({
        progress: mockProgress,
        errors: [],
        completed: null,
        lufsProgress: null,
        isConnected: false,
        isCompleted: false,
        pauseScan: vi.fn(),
        cancelScan: vi.fn(),
        resumeScan: vi.fn(),
      });

      vi.mocked(useStartScan).mockReturnValue({
        mutate: mockStartScan,
        isPending: false,
        data: { id: 'scan-new' },
      } as unknown as ReturnType<typeof useStartScan>);

      render(<ScannerPanel />);

      expect(screen.getByText('⚠️ Desconectado')).toBeInTheDocument();
    });
  });

  describe('LUFS analysis', () => {
    it('should show LUFS progress when running', () => {
      vi.mocked(useScannerWebSocket).mockReturnValue({
        progress: null,
        errors: [],
        completed: null,
        lufsProgress: mockLufsProgress,
        isConnected: true,
        isCompleted: false,
        pauseScan: vi.fn(),
        cancelScan: vi.fn(),
        resumeScan: vi.fn(),
      });

      render(<ScannerPanel />);

      expect(screen.getByText(/LUFS: 100\/150/)).toBeInTheDocument();
    });

    it('should show LUFS percentage', () => {
      vi.mocked(useScannerWebSocket).mockReturnValue({
        progress: null,
        errors: [],
        completed: null,
        lufsProgress: mockLufsProgress,
        isConnected: true,
        isCompleted: false,
        pauseScan: vi.fn(),
        cancelScan: vi.fn(),
        resumeScan: vi.fn(),
      });

      render(<ScannerPanel />);

      expect(screen.getByText('(67%)')).toBeInTheDocument();
    });

    it('should show LUFS estimated time', () => {
      vi.mocked(useScannerWebSocket).mockReturnValue({
        progress: null,
        errors: [],
        completed: null,
        lufsProgress: mockLufsProgress,
        isConnected: true,
        isCompleted: false,
        pauseScan: vi.fn(),
        cancelScan: vi.fn(),
        resumeScan: vi.fn(),
      });

      render(<ScannerPanel />);

      expect(screen.getByText('~5 min')).toBeInTheDocument();
    });

    it('should show LUFS when not running but pending tracks exist', () => {
      vi.mocked(useScannerWebSocket).mockReturnValue({
        progress: null,
        errors: [],
        completed: null,
        lufsProgress: {
          isRunning: false,
          pendingTracks: 25,
          processedInSession: 0,
          estimatedTimeRemaining: null,
        },
        isConnected: true,
        isCompleted: false,
        pauseScan: vi.fn(),
        cancelScan: vi.fn(),
        resumeScan: vi.fn(),
      });

      render(<ScannerPanel />);

      expect(screen.getByText(/LUFS: 0\/25/)).toBeInTheDocument();
    });

    it('should not show LUFS when no pending tracks', () => {
      vi.mocked(useScannerWebSocket).mockReturnValue({
        progress: null,
        errors: [],
        completed: null,
        lufsProgress: {
          isRunning: false,
          pendingTracks: 0,
          processedInSession: 50,
          estimatedTimeRemaining: null,
        },
        isConnected: true,
        isCompleted: false,
        pauseScan: vi.fn(),
        cancelScan: vi.fn(),
        resumeScan: vi.fn(),
      });

      render(<ScannerPanel />);

      expect(screen.queryByText(/LUFS:/)).not.toBeInTheDocument();
    });
  });

  describe('history', () => {
    it('should toggle history visibility', () => {
      render(<ScannerPanel />);

      // Initially history is hidden
      expect(screen.queryByText('+150')).not.toBeInTheDocument();

      // Toggle to show
      fireEvent.click(screen.getByText('Ver historial de escaneos'));

      // History should be visible
      expect(screen.getByText('+150')).toBeInTheDocument();
      expect(screen.getByText('~25')).toBeInTheDocument();
      expect(screen.getByText('-5')).toBeInTheDocument();
    });

    it('should change toggle button text when showing history', () => {
      render(<ScannerPanel />);

      fireEvent.click(screen.getByText('Ver historial de escaneos'));

      expect(screen.getByText('Ocultar historial de escaneos')).toBeInTheDocument();
    });

    it('should show empty history message', () => {
      vi.mocked(useScannerHistory).mockReturnValue({
        data: { scans: [], total: 0, page: 1, limit: 10 },
        isLoading: false,
        refetch: mockRefetch,
      } as ReturnType<typeof useScannerHistory>);

      render(<ScannerPanel />);

      fireEvent.click(screen.getByText('Ver historial de escaneos'));

      expect(screen.getByText('No hay escaneos anteriores')).toBeInTheDocument();
    });

    it('should show multiple scans in history', () => {
      render(<ScannerPanel />);

      fireEvent.click(screen.getByText('Ver historial de escaneos'));

      // Both scans should be visible
      expect(screen.getByText('+150')).toBeInTheDocument();
      expect(screen.getByText('+0')).toBeInTheDocument();
    });
  });

  describe('no scans', () => {
    it('should not show status card when no scans exist', () => {
      vi.mocked(useScannerHistory).mockReturnValue({
        data: { scans: [], total: 0, page: 1, limit: 10 },
        isLoading: false,
        refetch: mockRefetch,
      } as ReturnType<typeof useScannerHistory>);

      vi.mocked(useScannerWebSocket).mockReturnValue({
        progress: null,
        errors: [],
        completed: null,
        lufsProgress: null,
        isConnected: true,
        isCompleted: false,
        pauseScan: vi.fn(),
        cancelScan: vi.fn(),
        resumeScan: vi.fn(),
      });

      render(<ScannerPanel />);

      // Should not show status texts
      expect(screen.queryByText('Completado')).not.toBeInTheDocument();
      expect(screen.queryByText('Fallido')).not.toBeInTheDocument();
      expect(screen.queryByText('En progreso')).not.toBeInTheDocument();
    });
  });

  describe('scan completion', () => {
    it('should refetch history when scan completes', async () => {
      vi.mocked(useScannerWebSocket).mockReturnValue({
        progress: null,
        errors: [],
        completed: {
          scanId: 'scan-new',
          totalFiles: 1000,
          tracksCreated: 100,
          albumsCreated: 20,
          artistsCreated: 15,
          coversExtracted: 18,
          errors: 0,
          duration: 120,
          timestamp: '2024-01-15T10:30:00Z',
        },
        lufsProgress: null,
        isConnected: true,
        isCompleted: true,
        pauseScan: vi.fn(),
        cancelScan: vi.fn(),
        resumeScan: vi.fn(),
      });

      vi.mocked(useStartScan).mockReturnValue({
        mutate: mockStartScan,
        isPending: false,
        data: { id: 'scan-new' },
      } as unknown as ReturnType<typeof useStartScan>);

      render(<ScannerPanel />);

      // Wait for the timeout to trigger refetch
      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });
});
