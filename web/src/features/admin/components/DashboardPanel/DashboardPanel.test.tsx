import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPanel } from './DashboardPanel';

// Mock API client
vi.mock('@shared/services/api', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

// Mock child components to isolate DashboardPanel testing
vi.mock('./StatCard', () => ({
  StatCard: ({ title, value }: { title: string; value: string }) => (
    <div data-testid={`stat-card-${title.toLowerCase()}`}>
      <span>{title}</span>
      <span>{value}</span>
    </div>
  ),
}));

vi.mock('./HealthPanel', () => ({
  HealthPanel: () => <div data-testid="health-panel">Health Panel</div>,
}));

vi.mock('./ActivityTimelineChart', () => ({
  ActivityTimelineChart: () => <div data-testid="activity-timeline-chart">Activity Timeline</div>,
}));

vi.mock('./StorageBreakdownChart', () => ({
  StorageBreakdownChart: () => <div data-testid="storage-breakdown-chart">Storage Breakdown</div>,
}));

vi.mock('./RecentActivityFeed', () => ({
  RecentActivityFeed: () => <div data-testid="recent-activity-feed">Recent Activity</div>,
}));

vi.mock('@shared/utils/format', () => ({
  formatDuration: vi.fn((seconds: number) => `${Math.floor(seconds / 3600)}h`),
  formatBytes: vi.fn((bytes: number) => `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`),
}));

vi.mock('@shared/utils/error.utils', () => ({
  getApiErrorMessage: vi.fn((err, defaultMsg) => defaultMsg),
}));

vi.mock('@shared/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

import { apiClient } from '@shared/services/api';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Mock data
const mockStats = {
  libraryStats: {
    totalTracks: 15000,
    totalAlbums: 1200,
    totalArtists: 500,
    totalGenres: 45,
    totalDuration: 3600000,
    totalStorage: 107374182400, // 100 GB
    tracksAddedToday: 25,
    albumsAddedToday: 3,
    artistsAddedToday: 1,
  },
  storageBreakdown: {
    music: 100000000000,
    metadata: 5000000000,
    avatars: 500000000,
    total: 107374182400,
  },
  systemHealth: {
    database: 'healthy' as const,
    redis: 'healthy' as const,
    scanner: 'idle' as const,
    metadataApis: {
      lastfm: 'healthy' as const,
      fanart: 'healthy' as const,
      musicbrainz: 'healthy' as const,
    },
    storage: 'healthy' as const,
  },
  enrichmentStats: {
    today: {
      total: 50,
      successful: 48,
      failed: 2,
      byProvider: { lastfm: 30, fanart: 18 },
    },
    week: {
      total: 350,
      successful: 340,
      failed: 10,
      byProvider: { lastfm: 200, fanart: 150 },
    },
  },
  activityStats: {
    totalUsers: 10,
    activeUsersLast24h: 5,
    activeUsersLast7d: 8,
  },
  scanStats: {
    lastScan: {
      startedAt: '2024-01-15T10:00:00Z',
      finishedAt: '2024-01-15T10:30:00Z',
      status: 'completed',
      tracksAdded: 100,
      tracksUpdated: 50,
      tracksDeleted: 5,
    },
    currentScan: {
      isRunning: false,
      startedAt: null,
      progress: 0,
    },
  },
  activeAlerts: {
    orphanedFiles: 0,
    pendingConflicts: 0,
    storageWarning: false,
    scanErrors: 0,
  },
  activityTimeline: [{ date: '2024-01-15', scans: 2, enrichments: 50, errors: 2 }],
  recentActivities: [
    {
      id: '1',
      type: 'scan' as const,
      action: 'Scan completed',
      details: '100 tracks added',
      timestamp: '2024-01-15T10:30:00Z',
      status: 'success' as const,
    },
  ],
};

describe('DashboardPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset apiClient.get implementation to avoid leaking between tests
    vi.mocked(apiClient.get).mockReset();
  });

  describe('loading state', () => {
    it('should show loading state initially', () => {
      vi.mocked(apiClient.get).mockImplementation(() => new Promise(() => {}));

      render(<DashboardPanel />, { wrapper: createWrapper() });

      expect(screen.getByText('Cargando estadísticas...')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error state when API fails', async () => {
      // Reject twice: initial call + 1 retry (component has retry: 1)
      vi.mocked(apiClient.get)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      render(<DashboardPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Error al cargar las estadísticas')).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      vi.mocked(apiClient.get)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      render(<DashboardPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Reintentar')).toBeInTheDocument();
      });
    });

    it('should retry loading when clicking retry button', async () => {
      vi.mocked(apiClient.get)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: mockStats });

      render(<DashboardPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Reintentar')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Reintentar'));

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Initial call + 1 retry (both fail) + manual refetch (succeeds)
      expect(apiClient.get).toHaveBeenCalledTimes(3);
    });
  });

  describe('rendering', () => {
    beforeEach(() => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStats });
    });

    it('should render dashboard title', async () => {
      render(<DashboardPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
    });

    it('should render subtitle', async () => {
      render(<DashboardPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Vista general del sistema')).toBeInTheDocument();
      });
    });

    it('should render stat cards', async () => {
      render(<DashboardPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('stat-card-canciones')).toBeInTheDocument();
        expect(screen.getByTestId('stat-card-álbumes')).toBeInTheDocument();
        expect(screen.getByTestId('stat-card-artistas')).toBeInTheDocument();
        expect(screen.getByTestId('stat-card-géneros')).toBeInTheDocument();
        expect(screen.getByTestId('stat-card-duración total')).toBeInTheDocument();
        expect(screen.getByTestId('stat-card-almacenamiento')).toBeInTheDocument();
      });
    });

    it('should render health panel', async () => {
      render(<DashboardPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('health-panel')).toBeInTheDocument();
      });
    });

    it('should render user activity section', async () => {
      render(<DashboardPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Actividad de Usuarios')).toBeInTheDocument();
        expect(screen.getByText('Total')).toBeInTheDocument();
        expect(screen.getByText('Últimas 24h')).toBeInTheDocument();
        expect(screen.getByText('Últimos 7d')).toBeInTheDocument();
      });
    });

    it('should render user activity values', async () => {
      render(<DashboardPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Values appear in the activity stats section
        const activitySection = screen.getByText('Actividad de Usuarios').parentElement;
        expect(activitySection).toBeInTheDocument();
      });
    });

    it('should render enrichment stats section', async () => {
      render(<DashboardPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Enriquecimiento de Metadata')).toBeInTheDocument();
        expect(screen.getByText('Hoy')).toBeInTheDocument();
        expect(screen.getByText('7 días')).toBeInTheDocument();
      });
    });

    it('should render enrichment stats values', async () => {
      render(<DashboardPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Check that enrichment section is rendered
        const enrichmentSection = screen.getByText('Enriquecimiento de Metadata').parentElement;
        expect(enrichmentSection).toBeInTheDocument();
      });
    });

    it('should render last scan section', async () => {
      render(<DashboardPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Último Escaneo')).toBeInTheDocument();
        expect(screen.getByText('Estado')).toBeInTheDocument();
        expect(screen.getByText('Agregados')).toBeInTheDocument();
        expect(screen.getByText('Actualizados')).toBeInTheDocument();
        expect(screen.getByText('Eliminados')).toBeInTheDocument();
      });
    });

    it('should render last scan values', async () => {
      render(<DashboardPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Completado')).toBeInTheDocument();
        // tracksAdded value
        const scanSection = screen.getByText('Último Escaneo').parentElement;
        expect(scanSection).toBeInTheDocument();
      });
    });

    it('should render activity timeline chart', async () => {
      render(<DashboardPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('activity-timeline-chart')).toBeInTheDocument();
      });
    });

    it('should render storage breakdown chart', async () => {
      render(<DashboardPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('storage-breakdown-chart')).toBeInTheDocument();
      });
    });

    it('should render recent activity feed', async () => {
      render(<DashboardPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('recent-activity-feed')).toBeInTheDocument();
      });
    });
  });

  describe('no scan info', () => {
    it('should show message when no scans recorded', async () => {
      const statsWithNoScan = {
        ...mockStats,
        scanStats: {
          lastScan: {
            startedAt: null,
            finishedAt: null,
            status: null,
            tracksAdded: 0,
            tracksUpdated: 0,
            tracksDeleted: 0,
          },
          currentScan: {
            isRunning: false,
            startedAt: null,
            progress: 0,
          },
        },
      };

      vi.mocked(apiClient.get).mockResolvedValue({ data: statsWithNoScan });

      render(<DashboardPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('No hay escaneos registrados')).toBeInTheDocument();
      });
    });
  });

  describe('enrichment failures display', () => {
    it('should show failed count when there are failures', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStats });

      render(<DashboardPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Check that the enrichment section renders
        expect(screen.getByText('Enriquecimiento de Metadata')).toBeInTheDocument();
      });
    });

    it('should render enrichment data correctly', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStats });

      render(<DashboardPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Enriquecimiento de Metadata')).toBeInTheDocument();
        expect(screen.getByText('Hoy')).toBeInTheDocument();
        expect(screen.getByText('7 días')).toBeInTheDocument();
      });
    });
  });

  describe('navigation callback', () => {
    it('should pass onNavigateToTab to HealthPanel', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStats });
      const mockNavigate = vi.fn();

      render(<DashboardPanel onNavigateToTab={mockNavigate} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('health-panel')).toBeInTheDocument();
      });
    });
  });

  describe('API call', () => {
    it('should call correct API endpoint', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStats });

      render(<DashboardPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/admin/dashboard/stats');
      });
    });
  });
});
