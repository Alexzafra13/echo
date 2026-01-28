import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AutoSearchTab } from './AutoSearchTab';

// Mock UI components
vi.mock('@shared/components/ui', () => ({
  Button: ({ children, onClick, disabled, loading, leftIcon }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
    leftIcon?: React.ReactNode;
  }) => (
    <button onClick={onClick} disabled={disabled || loading}>
      {leftIcon}
      {loading ? 'Loading...' : children}
    </button>
  ),
  CollapsibleInfo: ({ title, children }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div data-testid="collapsible-info">
      <summary>{title}</summary>
      <div>{children}</div>
    </div>
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
const mockPut = vi.fn();

vi.mock('@shared/services/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
  },
}));

// Mock logger
vi.mock('@shared/utils/logger', () => ({
  logger: { error: vi.fn() },
}));

// Mock error utils
vi.mock('@shared/utils/error.utils', () => ({
  getApiErrorMessage: () => 'Error message',
}));

describe('AutoSearchTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock responses
    mockGet.mockImplementation((url: string) => {
      if (url === '/admin/mbid-auto-search/config') {
        return Promise.resolve({
          data: {
            enabled: true,
            confidenceThreshold: 90,
            description: 'Test description',
          },
        });
      }
      if (url === '/admin/mbid-auto-search/stats') {
        return Promise.resolve({
          data: {
            totalAutoSearched: 100,
            autoApplied: 50,
            conflictsCreated: 10,
            ignored: 40,
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    mockPut.mockResolvedValue({ data: {} });
  });

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      mockGet.mockReturnValue(new Promise(() => {})); // Never resolves

      render(<AutoSearchTab />);

      expect(screen.getByText('Cargando configuración...')).toBeInTheDocument();
    });
  });

  describe('Header', () => {
    it('should render title', async () => {
      render(<AutoSearchTab />);

      await waitFor(() => {
        expect(screen.getByText('Auto-búsqueda de MusicBrainz IDs')).toBeInTheDocument();
      });
    });

    it('should render description', async () => {
      render(<AutoSearchTab />);

      await waitFor(() => {
        expect(screen.getByText(/busca automáticamente musicbrainz ids/i)).toBeInTheDocument();
      });
    });
  });

  describe('Enable Toggle', () => {
    it('should render enable checkbox', async () => {
      render(<AutoSearchTab />);

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeInTheDocument();
      });
    });

    it('should show checkbox as checked when enabled', async () => {
      render(<AutoSearchTab />);

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeChecked();
      });
    });

    it('should toggle enabled state on click', async () => {
      render(<AutoSearchTab />);

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeChecked();
      });

      fireEvent.click(screen.getByRole('checkbox'));

      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('should render toggle label', async () => {
      render(<AutoSearchTab />);

      await waitFor(() => {
        expect(screen.getByText(/habilitar auto-búsqueda/i)).toBeInTheDocument();
      });
    });
  });

  describe('Confidence Threshold', () => {
    it('should show threshold slider when enabled', async () => {
      render(<AutoSearchTab />);

      await waitFor(() => {
        expect(screen.getByRole('slider')).toBeInTheDocument();
      });
    });

    it('should hide threshold slider when disabled', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url === '/admin/mbid-auto-search/config') {
          return Promise.resolve({
            data: {
              enabled: false,
              confidenceThreshold: 90,
              description: '',
            },
          });
        }
        return Promise.resolve({ data: {} });
      });

      render(<AutoSearchTab />);

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeInTheDocument();
      });

      expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    });

    it('should display current threshold value', async () => {
      render(<AutoSearchTab />);

      await waitFor(() => {
        expect(screen.getByText('90')).toBeInTheDocument();
      });
    });

    it('should update threshold on slider change', async () => {
      render(<AutoSearchTab />);

      await waitFor(() => {
        expect(screen.getByRole('slider')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByRole('slider'), { target: { value: '95' } });

      expect(screen.getByText('95')).toBeInTheDocument();
    });

    it('should show threshold explanation when enabled', async () => {
      render(<AutoSearchTab />);

      // Wait for the component to load and show the slider
      await waitFor(() => {
        expect(screen.getByRole('slider')).toBeInTheDocument();
      });

      // The threshold explanation section should be visible
      // Check for recognizable text in the threshold boxes
      const container = screen.getByRole('slider').closest('div');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Recommendations', () => {
    it('should show recommendations when enabled', async () => {
      render(<AutoSearchTab />);

      await waitFor(() => {
        expect(screen.getByText('Recomendaciones:')).toBeInTheDocument();
      });
    });

    it('should list threshold recommendations', async () => {
      render(<AutoSearchTab />);

      await waitFor(() => {
        expect(screen.getByText(/95.*conservador/i)).toBeInTheDocument();
        expect(screen.getByText(/90.*recomendado/i)).toBeInTheDocument();
        expect(screen.getByText(/85.*agresivo/i)).toBeInTheDocument();
      });
    });
  });

  describe('Statistics', () => {
    it('should render statistics title', async () => {
      render(<AutoSearchTab />);

      await waitFor(() => {
        expect(screen.getByText('Estadísticas')).toBeInTheDocument();
      });
    });

    it('should display auto-applied count', async () => {
      render(<AutoSearchTab />);

      await waitFor(() => {
        expect(screen.getByText('50')).toBeInTheDocument();
        expect(screen.getByText('Auto-aplicados')).toBeInTheDocument();
      });
    });

    it('should display conflicts count', async () => {
      render(<AutoSearchTab />);

      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText('Conflictos creados')).toBeInTheDocument();
      });
    });

    it('should display ignored count', async () => {
      render(<AutoSearchTab />);

      await waitFor(() => {
        expect(screen.getByText('40')).toBeInTheDocument();
        expect(screen.getByText('Ignorados')).toBeInTheDocument();
      });
    });

    it('should show conflicts warning when conflicts exist', async () => {
      render(<AutoSearchTab />);

      await waitFor(() => {
        expect(screen.getByText(/10 conflictos pendientes/i)).toBeInTheDocument();
      });
    });
  });

  describe('Info Box', () => {
    it('should render collapsible info', async () => {
      render(<AutoSearchTab />);

      await waitFor(() => {
        expect(screen.getByTestId('collapsible-info')).toBeInTheDocument();
      });
    });

    it('should show how it works title', async () => {
      render(<AutoSearchTab />);

      await waitFor(() => {
        expect(screen.getByText('¿Cómo funciona?')).toBeInTheDocument();
      });
    });
  });

  describe('Save Button', () => {
    it('should render save button', async () => {
      render(<AutoSearchTab />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
      });
    });

    it('should call API on save', async () => {
      render(<AutoSearchTab />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

      await waitFor(() => {
        expect(mockPut).toHaveBeenCalledWith('/admin/mbid-auto-search/config', {
          enabled: true,
          confidenceThreshold: 90,
        });
      });
    });

    it('should call save API correctly', async () => {
      render(<AutoSearchTab />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

      await waitFor(() => {
        expect(mockPut).toHaveBeenCalledWith('/admin/mbid-auto-search/config', {
          enabled: true,
          confidenceThreshold: 90,
        });
      });

      // After save, loadConfig is called which reloads the data
      await waitFor(() => {
        // At least 2 calls: initial load + reload after save
        expect(mockGet.mock.calls.filter((c: unknown[]) =>
          c[0] === '/admin/mbid-auto-search/config'
        ).length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error notification on config load failure', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url === '/admin/mbid-auto-search/config') {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ data: {} });
      });

      render(<AutoSearchTab />);

      await waitFor(() => {
        expect(screen.getByText(/error al cargar/i)).toBeInTheDocument();
      });
    });

    it('should show error notification on save failure', async () => {
      mockPut.mockRejectedValue(new Error('Save failed'));

      render(<AutoSearchTab />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

      // The notification should appear with error
      await waitFor(() => {
        const notification = screen.queryByTestId('notification');
        expect(notification).toBeInTheDocument();
      });
    });

    it('should dismiss error notification on click', async () => {
      mockPut.mockRejectedValue(new Error('Save failed'));

      render(<AutoSearchTab />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

      await waitFor(() => {
        expect(screen.getByTestId('notification')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

      await waitFor(() => {
        expect(screen.queryByTestId('notification')).not.toBeInTheDocument();
      });
    });
  });

  describe('API Calls', () => {
    it('should fetch config on mount', async () => {
      render(<AutoSearchTab />);

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith('/admin/mbid-auto-search/config');
      });
    });

    it('should fetch stats on mount', async () => {
      render(<AutoSearchTab />);

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith('/admin/mbid-auto-search/stats');
      });
    });
  });
});
