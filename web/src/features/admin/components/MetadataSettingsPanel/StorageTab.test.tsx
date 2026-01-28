import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StorageTab } from './StorageTab';

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
  Input: ({ value, onChange, onBlur, placeholder }: {
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: () => void;
    placeholder?: string;
  }) => (
    <input
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      data-testid="path-input"
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

describe('StorageTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock responses
    mockGet.mockResolvedValue({
      data: [
        { key: 'metadata.storage.location', value: 'centralized' },
        { key: 'metadata.storage.path', value: '/app/uploads/metadata' },
      ],
    });

    mockPost.mockResolvedValue({
      data: {
        valid: true,
        writable: true,
        exists: true,
        readOnly: false,
        spaceAvailable: '50GB',
        message: 'Ruta válida',
      },
    });

    mockPut.mockResolvedValue({ data: {} });
  });

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      mockGet.mockReturnValue(new Promise(() => {})); // Never resolves

      render(<StorageTab />);

      expect(screen.getByText('Cargando configuración...')).toBeInTheDocument();
    });
  });

  describe('After Loading', () => {
    it('should render title', async () => {
      render(<StorageTab />);

      await waitFor(() => {
        expect(screen.getByText('Configuración de Almacenamiento')).toBeInTheDocument();
      });
    });

    it('should render storage mode section', async () => {
      render(<StorageTab />);

      await waitFor(() => {
        expect(screen.getByText('Modo de almacenamiento')).toBeInTheDocument();
      });
    });

    it('should render storage mode options', async () => {
      render(<StorageTab />);

      await waitFor(() => {
        expect(screen.getByText('Centralizado')).toBeInTheDocument();
        expect(screen.getByText('Portable')).toBeInTheDocument();
      });
    });

    it('should show recommended badge for centralized', async () => {
      render(<StorageTab />);

      await waitFor(() => {
        expect(screen.getByText('Recomendado')).toBeInTheDocument();
      });
    });

    it('should render storage path section when centralized', async () => {
      render(<StorageTab />);

      await waitFor(() => {
        expect(screen.getByText('Ruta de almacenamiento')).toBeInTheDocument();
      });
    });

    it('should render path input', async () => {
      render(<StorageTab />);

      await waitFor(() => {
        expect(screen.getByTestId('path-input')).toBeInTheDocument();
      });
    });

    it('should render explore button', async () => {
      render(<StorageTab />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Explorar' })).toBeInTheDocument();
      });
    });

    it('should render info box', async () => {
      render(<StorageTab />);

      await waitFor(() => {
        expect(screen.getByText('Información importante:')).toBeInTheDocument();
      });
    });

    it('should render save button', async () => {
      render(<StorageTab />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Guardar configuración' })).toBeInTheDocument();
      });
    });
  });

  describe('Storage Mode Selection', () => {
    it('should have centralized mode selected by default', async () => {
      render(<StorageTab />);

      await waitFor(() => {
        const centralizedRadio = screen.getByRole('radio', { name: /centralizado/i });
        expect(centralizedRadio).toBeChecked();
      });
    });

    it('should switch to portable mode when selected', async () => {
      render(<StorageTab />);

      await waitFor(() => {
        expect(screen.getByRole('radio', { name: /portable/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('radio', { name: /portable/i }));

      expect(screen.getByRole('radio', { name: /portable/i })).toBeChecked();
    });

    it('should hide path section when portable mode selected', async () => {
      render(<StorageTab />);

      await waitFor(() => {
        expect(screen.getByText('Ruta de almacenamiento')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('radio', { name: /portable/i }));

      expect(screen.queryByText('Ruta de almacenamiento')).not.toBeInTheDocument();
    });
  });

  describe('Path Validation', () => {
    it('should show validation result after loading', async () => {
      render(<StorageTab />);

      await waitFor(() => {
        expect(screen.getByText('Ruta válida')).toBeInTheDocument();
      });
    });

    it('should validate path on blur', async () => {
      render(<StorageTab />);

      await waitFor(() => {
        expect(screen.getByTestId('path-input')).toBeInTheDocument();
      });

      const input = screen.getByTestId('path-input');
      fireEvent.change(input, { target: { value: '/new/path' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(
          '/admin/settings/validate-storage-path',
          { path: '/new/path' }
        );
      });
    });
  });

  describe('File Browser', () => {
    it('should open browser on explore click', async () => {
      mockPost.mockResolvedValueOnce({
        data: {
          valid: true,
          writable: true,
          exists: true,
          readOnly: false,
          spaceAvailable: '50GB',
          message: 'Ruta válida',
        },
      }).mockResolvedValueOnce({
        data: {
          path: '/app',
          directories: [
            { name: 'uploads', path: '/app/uploads', writable: true },
          ],
          parent: '/',
        },
      });

      render(<StorageTab />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Explorar' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Explorar' }));

      await waitFor(() => {
        expect(screen.getByText('Seleccionar carpeta')).toBeInTheDocument();
      });
    });

    it('should show current path in browser', async () => {
      mockPost.mockResolvedValueOnce({
        data: {
          valid: true,
          writable: true,
          exists: true,
          readOnly: false,
          spaceAvailable: '50GB',
          message: 'Ruta válida',
        },
      }).mockResolvedValueOnce({
        data: {
          path: '/app',
          directories: [],
          parent: '/',
        },
      });

      render(<StorageTab />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Explorar' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Explorar' }));

      await waitFor(() => {
        expect(screen.getByText('Ruta actual:')).toBeInTheDocument();
      });
    });
  });

  describe('Save Settings', () => {
    it('should call API on save', async () => {
      render(<StorageTab />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Guardar configuración' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Guardar configuración' }));

      await waitFor(() => {
        expect(mockPut).toHaveBeenCalledWith(
          '/admin/settings/metadata.storage.location',
          { value: 'centralized' }
        );
      });
    });

    it('should show success message after save', async () => {
      render(<StorageTab />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Guardar configuración' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Guardar configuración' }));

      await waitFor(() => {
        expect(screen.getByText('Configuración guardada correctamente')).toBeInTheDocument();
      });
    });
  });
});
