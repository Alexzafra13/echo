import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProvidersTab } from './ProvidersTab';

// Mock UI components
vi.mock('@shared/components/ui', () => ({
  Button: ({ children, onClick, disabled, loading }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled || loading}>
      {loading ? 'Loading...' : children}
    </button>
  ),
  Input: ({ value, onChange, placeholder, disabled }: {
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    disabled?: boolean;
  }) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      data-testid="api-key-input"
    />
  ),
}));

// Mock API client
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();

vi.mock('@shared/services/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
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

describe('ProvidersTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock responses
    mockGet.mockResolvedValue({
      data: [
        { key: 'metadata.auto_enrich.enabled', value: 'true' },
        { key: 'metadata.lastfm.api_key', value: 'test-lastfm-key' },
        { key: 'metadata.fanart.api_key', value: '' },
      ],
    });

    mockPost.mockResolvedValue({
      data: { valid: true, message: 'API key válida' },
    });

    mockPut.mockResolvedValue({ data: {} });
  });

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      mockGet.mockReturnValue(new Promise(() => {})); // Never resolves

      render(<ProvidersTab />);

      expect(screen.getByText('Cargando configuración...')).toBeInTheDocument();
    });
  });

  describe('Auto-enrichment Section', () => {
    it('should render auto-enrichment title', async () => {
      render(<ProvidersTab />);

      await waitFor(() => {
        expect(screen.getByText('Auto-enrichment')).toBeInTheDocument();
      });
    });

    it('should render auto-enrichment description', async () => {
      render(<ProvidersTab />);

      await waitFor(() => {
        expect(screen.getByText(/enriquece automáticamente/i)).toBeInTheDocument();
      });
    });

    it('should render checkbox with label', async () => {
      render(<ProvidersTab />);

      await waitFor(() => {
        expect(screen.getByText(/activar auto-enrichment/i)).toBeInTheDocument();
      });
    });

    it('should have checkbox checked when enabled', async () => {
      render(<ProvidersTab />);

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeChecked();
      });
    });

    it('should toggle checkbox on click', async () => {
      render(<ProvidersTab />);

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeChecked();
      });

      fireEvent.click(screen.getByRole('checkbox'));

      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });
  });

  describe('Cover Art Archive Section', () => {
    it('should render Cover Art Archive card', async () => {
      render(<ProvidersTab />);

      await waitFor(() => {
        expect(screen.getByText('Cover Art Archive')).toBeInTheDocument();
      });
    });

    it('should show as always enabled', async () => {
      render(<ProvidersTab />);

      await waitFor(() => {
        expect(screen.getByText('Activado')).toBeInTheDocument();
      });
    });

    it('should show description about no API key needed', async () => {
      render(<ProvidersTab />);

      await waitFor(() => {
        expect(screen.getByText(/no requiere API key/i)).toBeInTheDocument();
      });
    });
  });

  describe('Last.fm Section', () => {
    it('should render Last.fm card', async () => {
      render(<ProvidersTab />);

      await waitFor(() => {
        expect(screen.getByText('Last.fm')).toBeInTheDocument();
      });
    });

    it('should render Last.fm description', async () => {
      render(<ProvidersTab />);

      await waitFor(() => {
        expect(screen.getByText(/biografías de artistas/i)).toBeInTheDocument();
      });
    });

    it('should render API key input placeholder', async () => {
      render(<ProvidersTab />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/last.fm/i)).toBeInTheDocument();
      });
    });

    it('should render validate button for Last.fm', async () => {
      render(<ProvidersTab />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button', { name: /validar/i });
        expect(buttons.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should render link to get API key', async () => {
      render(<ProvidersTab />);

      await waitFor(() => {
        const links = screen.getAllByText(/obtener api key/i);
        expect(links.length).toBeGreaterThan(0);
      });
    });

    it('should call validate API on button click', async () => {
      render(<ProvidersTab />);

      await waitFor(() => {
        expect(screen.getByText('Last.fm')).toBeInTheDocument();
      });

      const validateButtons = screen.getAllByRole('button', { name: /validar/i });
      fireEvent.click(validateButtons[0]);

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/admin/settings/validate-api-key', {
          service: 'lastfm',
          apiKey: 'test-lastfm-key',
        });
      });
    });
  });

  describe('Fanart.tv Section', () => {
    it('should render Fanart.tv card', async () => {
      render(<ProvidersTab />);

      await waitFor(() => {
        expect(screen.getByText('Fanart.tv')).toBeInTheDocument();
      });
    });

    it('should render Fanart.tv description', async () => {
      render(<ProvidersTab />);

      await waitFor(() => {
        expect(screen.getByText(/imágenes de artistas/i)).toBeInTheDocument();
      });
    });

    it('should render API key input placeholder for Fanart.tv', async () => {
      render(<ProvidersTab />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/fanart.tv/i)).toBeInTheDocument();
      });
    });
  });

  describe('Info Box', () => {
    it('should render info box', async () => {
      render(<ProvidersTab />);

      await waitFor(() => {
        expect(screen.getByText(/sobre los proveedores/i)).toBeInTheDocument();
      });
    });

    it('should render info text', async () => {
      render(<ProvidersTab />);

      await waitFor(() => {
        expect(screen.getByText(/cover art archive está siempre activado/i)).toBeInTheDocument();
      });
    });
  });

  describe('Save Button', () => {
    it('should render save button', async () => {
      render(<ProvidersTab />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
      });
    });

    it('should call save on button click', async () => {
      render(<ProvidersTab />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

      await waitFor(() => {
        expect(mockPut).toHaveBeenCalled();
      });
    });

    it('should show success message after save', async () => {
      render(<ProvidersTab />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

      await waitFor(() => {
        expect(screen.getByText(/configuración guardada/i)).toBeInTheDocument();
      });
    });
  });

  describe('API Key Validation', () => {
    it('should show validation success message', async () => {
      render(<ProvidersTab />);

      await waitFor(() => {
        expect(screen.getByText('Last.fm')).toBeInTheDocument();
      });

      const validateButtons = screen.getAllByRole('button', { name: /validar/i });
      fireEvent.click(validateButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('API key válida')).toBeInTheDocument();
      });
    });

    it('should show validation error message', async () => {
      mockPost.mockResolvedValueOnce({
        data: { valid: false, message: 'API key inválida' },
      });

      render(<ProvidersTab />);

      await waitFor(() => {
        expect(screen.getByText('Last.fm')).toBeInTheDocument();
      });

      const validateButtons = screen.getAllByRole('button', { name: /validar/i });
      fireEvent.click(validateButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('API key inválida')).toBeInTheDocument();
      });
    });
  });

  describe('Input Changes', () => {
    it('should update Last.fm key on input change', async () => {
      render(<ProvidersTab />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/last.fm/i)).toBeInTheDocument();
      });

      const lastfmInput = screen.getByPlaceholderText(/last.fm/i);
      fireEvent.change(lastfmInput, { target: { value: 'new-key' } });

      expect(lastfmInput).toHaveValue('new-key');
    });

    it('should update Fanart.tv key on input change', async () => {
      render(<ProvidersTab />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/fanart.tv/i)).toBeInTheDocument();
      });

      const fanartInput = screen.getByPlaceholderText(/fanart.tv/i);
      fireEvent.change(fanartInput, { target: { value: 'fanart-key' } });

      expect(fanartInput).toHaveValue('fanart-key');
    });
  });
});
