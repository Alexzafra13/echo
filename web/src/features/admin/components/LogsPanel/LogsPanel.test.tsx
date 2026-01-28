import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LogsPanel } from './LogsPanel';

// Mock UI components
vi.mock('@shared/components/ui', () => ({
  Button: ({ children, onClick, disabled }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  InlineNotification: ({ type, message, onDismiss }: {
    type: string;
    message: string;
    onDismiss?: () => void;
  }) => (
    <div data-testid="notification" data-type={type}>
      {message}
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  ),
}));

// Mock API client
const mockGet = vi.fn();
vi.mock('@shared/services/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

// Mock utilities
vi.mock('@shared/utils/format', () => ({
  formatDateWithTime: (date: string) => `Formatted: ${date}`,
}));

vi.mock('@shared/utils/error.utils', () => ({
  getApiErrorMessage: () => 'Error al cargar logs',
}));

vi.mock('@shared/utils/logger', () => ({
  logger: { error: vi.fn() },
}));

// Mock log data
const mockLogs = [
  {
    id: 'log-1',
    level: 'error' as const,
    category: 'scanner',
    message: 'Failed to scan file',
    details: '{"file": "/music/test.mp3"}',
    userId: null,
    entityId: 'file-123',
    entityType: 'file',
    stackTrace: 'Error: ...',
    createdAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'log-2',
    level: 'warning' as const,
    category: 'metadata',
    message: 'Missing cover art',
    details: null,
    userId: null,
    entityId: 'album-456',
    entityType: 'album',
    stackTrace: null,
    createdAt: '2024-01-15T10:25:00Z',
  },
  {
    id: 'log-3',
    level: 'critical' as const,
    category: 'auth',
    message: 'Authentication failed',
    details: null,
    userId: 'user-1',
    entityId: null,
    entityType: null,
    stackTrace: null,
    createdAt: '2024-01-15T10:20:00Z',
  },
];

describe('LogsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({
      data: {
        logs: mockLogs,
        total: 25,
        limit: 10,
        offset: 0,
      },
    });
  });

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      mockGet.mockReturnValue(new Promise(() => {})); // Never resolves

      render(<LogsPanel />);

      expect(screen.getByText('Cargando logs...')).toBeInTheDocument();
    });
  });

  describe('Header', () => {
    it('should render title', async () => {
      render(<LogsPanel />);

      await waitFor(() => {
        expect(screen.getByText('Logs del Sistema')).toBeInTheDocument();
      });
    });
  });

  describe('Filters', () => {
    it('should render level filter', async () => {
      render(<LogsPanel />);

      await waitFor(() => {
        expect(screen.getByText('Nivel:')).toBeInTheDocument();
      });
    });

    it('should render category filter', async () => {
      render(<LogsPanel />);

      await waitFor(() => {
        expect(screen.getByText('Categoría:')).toBeInTheDocument();
      });
    });

    it('should have level options', async () => {
      render(<LogsPanel />);

      await waitFor(() => {
        expect(screen.getByText('Todos')).toBeInTheDocument();
        expect(screen.getByText('Crítico')).toBeInTheDocument();
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Advertencia')).toBeInTheDocument();
      });
    });

    it('should have category options', async () => {
      render(<LogsPanel />);

      await waitFor(() => {
        expect(screen.getByText('Todas')).toBeInTheDocument();
        expect(screen.getByText('Scanner')).toBeInTheDocument();
        expect(screen.getByText('Metadata')).toBeInTheDocument();
        expect(screen.getByText('Auth')).toBeInTheDocument();
      });
    });

    it('should filter by level on change', async () => {
      render(<LogsPanel />);

      await waitFor(() => {
        expect(screen.getByText('Logs del Sistema')).toBeInTheDocument();
      });

      const levelSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(levelSelect, { target: { value: 'error' } });

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith('/logs', {
          params: expect.objectContaining({ level: 'error' }),
        });
      });
    });

    it('should filter by category on change', async () => {
      render(<LogsPanel />);

      await waitFor(() => {
        expect(screen.getByText('Logs del Sistema')).toBeInTheDocument();
      });

      const categorySelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(categorySelect, { target: { value: 'scanner' } });

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith('/logs', {
          params: expect.objectContaining({ category: 'scanner' }),
        });
      });
    });
  });

  describe('Stats', () => {
    it('should show log count stats', async () => {
      render(<LogsPanel />);

      await waitFor(() => {
        expect(screen.getByText(/Mostrando 1-10 de 25 logs/)).toBeInTheDocument();
      });
    });
  });

  describe('Logs Display', () => {
    it('should render log cards', async () => {
      render(<LogsPanel />);

      await waitFor(() => {
        expect(screen.getByText('Failed to scan file')).toBeInTheDocument();
        expect(screen.getByText('Missing cover art')).toBeInTheDocument();
        expect(screen.getByText('Authentication failed')).toBeInTheDocument();
      });
    });

    it('should render level badges', async () => {
      render(<LogsPanel />);

      await waitFor(() => {
        expect(screen.getByText('ERROR')).toBeInTheDocument();
        expect(screen.getByText('ADVERTENCIA')).toBeInTheDocument();
        expect(screen.getByText('CRÍTICO')).toBeInTheDocument();
      });
    });

    it('should render category badges', async () => {
      render(<LogsPanel />);

      await waitFor(() => {
        expect(screen.getByText('SCANNER')).toBeInTheDocument();
        expect(screen.getByText('METADATA')).toBeInTheDocument();
        expect(screen.getByText('AUTH')).toBeInTheDocument();
      });
    });

    it('should show formatted dates', async () => {
      render(<LogsPanel />);

      await waitFor(() => {
        expect(screen.getByText('Formatted: 2024-01-15T10:30:00Z')).toBeInTheDocument();
      });
    });
  });

  describe('Expandable Details', () => {
    it('should expand log details on click', async () => {
      render(<LogsPanel />);

      await waitFor(() => {
        expect(screen.getByText('Failed to scan file')).toBeInTheDocument();
      });

      // Click first log to expand
      fireEvent.click(screen.getByText('Failed to scan file'));

      await waitFor(() => {
        expect(screen.getByText('Entity ID')).toBeInTheDocument();
        expect(screen.getByText('file-123')).toBeInTheDocument();
      });
    });

    it('should show stack trace when available', async () => {
      render(<LogsPanel />);

      await waitFor(() => {
        expect(screen.getByText('Failed to scan file')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Failed to scan file'));

      await waitFor(() => {
        expect(screen.getByText('Stack Trace')).toBeInTheDocument();
        expect(screen.getByText('Error: ...')).toBeInTheDocument();
      });
    });

    it('should show details JSON when available', async () => {
      render(<LogsPanel />);

      await waitFor(() => {
        expect(screen.getByText('Failed to scan file')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Failed to scan file'));

      await waitFor(() => {
        expect(screen.getByText('Detalles')).toBeInTheDocument();
      });
    });

    it('should collapse details on second click', async () => {
      render(<LogsPanel />);

      await waitFor(() => {
        expect(screen.getByText('Failed to scan file')).toBeInTheDocument();
      });

      // Click to expand
      fireEvent.click(screen.getByText('Failed to scan file'));

      await waitFor(() => {
        expect(screen.getByText('Entity ID')).toBeInTheDocument();
      });

      // Click to collapse
      fireEvent.click(screen.getByText('Failed to scan file'));

      await waitFor(() => {
        expect(screen.queryByText('Entity ID')).not.toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('should render pagination when total > limit', async () => {
      render(<LogsPanel />);

      await waitFor(() => {
        expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
      });
    });

    it('should render previous button', async () => {
      render(<LogsPanel />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /anterior/i })).toBeInTheDocument();
      });
    });

    it('should render next button', async () => {
      render(<LogsPanel />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /siguiente/i })).toBeInTheDocument();
      });
    });

    it('should disable previous button on first page', async () => {
      render(<LogsPanel />);

      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: /anterior/i });
        expect(prevButton).toBeDisabled();
      });
    });

    it('should navigate to next page on click', async () => {
      render(<LogsPanel />);

      await waitFor(() => {
        expect(screen.getByText('Logs del Sistema')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /siguiente/i }));

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith('/logs', {
          params: expect.objectContaining({ offset: 10 }),
        });
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no logs', async () => {
      mockGet.mockResolvedValue({
        data: {
          logs: [],
          total: 0,
          limit: 10,
          offset: 0,
        },
      });

      render(<LogsPanel />);

      await waitFor(() => {
        expect(screen.getByText('No hay logs que mostrar')).toBeInTheDocument();
      });
    });

    it('should show hint text in empty state', async () => {
      mockGet.mockResolvedValue({
        data: {
          logs: [],
          total: 0,
          limit: 10,
          offset: 0,
        },
      });

      render(<LogsPanel />);

      await waitFor(() => {
        expect(screen.getByText(/Solo se muestran logs de nivel WARNING/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error notification on API error', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      render(<LogsPanel />);

      await waitFor(() => {
        expect(screen.getByTestId('notification')).toBeInTheDocument();
        expect(screen.getByText('Error al cargar logs')).toBeInTheDocument();
      });
    });

    it('should dismiss error notification', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          data: { logs: mockLogs, total: 25, limit: 10, offset: 0 },
        });

      render(<LogsPanel />);

      await waitFor(() => {
        expect(screen.getByText('Error al cargar logs')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

      await waitFor(() => {
        expect(screen.queryByTestId('notification')).not.toBeInTheDocument();
      });
    });
  });
});
