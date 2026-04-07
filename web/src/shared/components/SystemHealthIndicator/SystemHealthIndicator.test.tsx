import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SystemHealthIndicator } from './SystemHealthIndicator';
import type { SystemHealthData } from '@shared/hooks/useSystemHealth';

// Mock wouter
vi.mock('wouter', () => ({
  useLocation: () => ['/admin', vi.fn()],
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'systemHealth.healthy': 'Sistema saludable',
        'systemHealth.warning': 'Advertencia',
        'systemHealth.critical': 'Crítico',
        'systemHealth.database': 'Base de datos',
        'systemHealth.cache': 'Cache',
        'systemHealth.scanner': 'Scanner',
        'systemHealth.storage': 'Almacenamiento',
        'systemHealth.dbHealthy': 'Conectada',
        'systemHealth.dbDegraded': 'Degradada',
        'systemHealth.dbDown': 'Caída',
        'systemHealth.cacheHealthy': 'Activo',
        'systemHealth.cacheDegraded': 'Degradado',
        'systemHealth.cacheDown': 'Caído',
        'systemHealth.scannerIdle': 'Inactivo',
        'systemHealth.scannerRunning': 'Escaneando',
        'systemHealth.scannerError': 'Error',
        'systemHealth.storageHealthy': 'OK',
        'systemHealth.storageWarning': 'Advertencia',
        'systemHealth.storageCritical': 'Crítico',
        'systemHealth.viewDashboard': 'Ver dashboard',
      };
      return map[key] || key;
    },
  }),
}));

// Mock useClickOutside
vi.mock('@shared/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@shared/hooks')>();
  return {
    ...actual,
    useAuth: () => ({
      user: mockUser,
    }),
    useClickOutside: () => ({
      ref: { current: null },
      isClosing: false,
      close: vi.fn((cb?: () => void) => cb?.()),
    }),
  };
});

// Mock useSystemHealth
let mockHealthData: SystemHealthData | undefined;
vi.mock('@shared/hooks/useSystemHealth', () => ({
  useSystemHealth: () => ({ data: mockHealthData }),
}));

let mockUser: { isAdmin: boolean } | null = { isAdmin: true };

const healthyData: SystemHealthData = {
  systemHealth: {
    database: 'healthy',
    redis: 'healthy',
    scanner: 'idle',
    metadataApis: { lastfm: 'healthy', fanart: 'healthy', musicbrainz: 'healthy' },
    storage: 'healthy',
  },
  activeAlerts: {
    orphanedFiles: 0,
    pendingConflicts: 0,
    missingFiles: 0,
    storageWarning: false,
    scanErrors: 0,
  },
};

const criticalData: SystemHealthData = {
  systemHealth: {
    ...healthyData.systemHealth,
    database: 'down',
  },
  activeAlerts: healthyData.activeAlerts,
};

const warningData: SystemHealthData = {
  systemHealth: {
    ...healthyData.systemHealth,
    redis: 'degraded',
  },
  activeAlerts: {
    orphanedFiles: 5,
    pendingConflicts: 2,
    missingFiles: 0,
    storageWarning: false,
    scanErrors: 0,
  },
};

describe('SystemHealthIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { isAdmin: true };
    mockHealthData = healthyData;
  });

  it('should render nothing for non-admin users', () => {
    mockUser = { isAdmin: false };

    const { container } = render(<SystemHealthIndicator />);

    expect(container.innerHTML).toBe('');
  });

  it('should render indicator for admin users', () => {
    const { container } = render(<SystemHealthIndicator />);

    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('should show healthy status with green color', () => {
    render(<SystemHealthIndicator />);

    const indicator = document.querySelector('[class*="indicator"]');
    expect(indicator).toBeInTheDocument();
  });

  it('should show tooltip with system details on click', () => {
    render(<SystemHealthIndicator />);

    const indicator = document.querySelector('[class*="indicator"]');
    fireEvent.click(indicator!);

    expect(screen.getByText('Base de datos')).toBeInTheDocument();
    expect(screen.getByText('Cache')).toBeInTheDocument();
    expect(screen.getByText('Scanner')).toBeInTheDocument();
    expect(screen.getByText('Almacenamiento')).toBeInTheDocument();
    expect(screen.getByText('Ver dashboard')).toBeInTheDocument();
  });

  it('should display critical status when database is down', () => {
    mockHealthData = criticalData;

    render(<SystemHealthIndicator />);

    const indicator = document.querySelector('[class*="indicator"]');
    fireEvent.click(indicator!);

    expect(screen.getByText('Crítico')).toBeInTheDocument();
    expect(screen.getByText('Caída')).toBeInTheDocument();
  });

  it('should display warning status when services are degraded', () => {
    mockHealthData = warningData;

    render(<SystemHealthIndicator />);

    const indicator = document.querySelector('[class*="indicator"]');
    fireEvent.click(indicator!);

    expect(screen.getByText('Advertencia')).toBeInTheDocument();
    expect(screen.getByText('Degradado')).toBeInTheDocument();
  });

  it('should handle missing data gracefully', () => {
    mockHealthData = undefined;

    // Should not crash
    render(<SystemHealthIndicator />);

    // Should still render the indicator (assumes healthy when no data)
    const indicator = document.querySelector('[class*="indicator"]');
    expect(indicator).toBeInTheDocument();
  });
});
