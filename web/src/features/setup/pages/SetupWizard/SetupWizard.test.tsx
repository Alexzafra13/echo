import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SetupWizard from './SetupWizard';

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/setup', mockSetLocation],
}));

// Mock UI components
vi.mock('@shared/components/ui', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    loading,
    type,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
    type?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      type={type as 'button' | 'submit' | 'reset'}
      data-loading={loading}
    >
      {children}
    </button>
  ),
  Input: ({
    label,
    error,
    placeholder,
    type,
    leftIcon,
    ...rest
  }: {
    label: string;
    error?: string;
    placeholder?: string;
    type?: string;
    leftIcon?: React.ReactNode;
    name?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  }) => (
    <div>
      <label htmlFor={rest.name}>{label}</label>
      <input
        id={rest.name}
        type={type}
        placeholder={placeholder}
        aria-invalid={!!error}
        {...rest}
      />
      {error && <span role="alert">{error}</span>}
    </div>
  ),
}));

// Mock error utils
vi.mock('@shared/utils/error.utils', () => ({
  getApiErrorMessage: (_err: unknown, defaultMsg: string) => defaultMsg,
}));

// Mock API functions
const mockGetSetupStatus = vi.fn();
const mockCreateAdmin = vi.fn();
const mockConfigureLibrary = vi.fn();
const mockBrowseDirectories = vi.fn();
const mockCompleteSetup = vi.fn();

vi.mock('../../api/setup.api', () => ({
  getSetupStatus: () => mockGetSetupStatus(),
  createAdmin: (data: unknown) => mockCreateAdmin(data),
  configureLibrary: (path: string) => mockConfigureLibrary(path),
  browseDirectories: (path: string) => mockBrowseDirectories(path),
  completeSetup: () => mockCompleteSetup(),
}));

describe('SetupWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      mockGetSetupStatus.mockReturnValue(new Promise(() => {}));

      render(<SetupWizard />);

      expect(screen.getByText('Verificando estado del servidor...')).toBeInTheDocument();
    });
  });

  describe('Redirection', () => {
    it('should redirect to login if setup is not needed', async () => {
      mockGetSetupStatus.mockResolvedValue({
        needsSetup: false,
        hasAdmin: true,
        hasMusicLibrary: true,
      });

      render(<SetupWizard />);

      await waitFor(() => {
        expect(mockSetLocation).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('Admin Step', () => {
    beforeEach(() => {
      mockGetSetupStatus.mockResolvedValue({
        needsSetup: true,
        hasAdmin: false,
        hasMusicLibrary: false,
      });
    });

    it('should display admin form when no admin exists', async () => {
      render(<SetupWizard />);

      await waitFor(() => {
        expect(screen.getByText('Crear cuenta de administrador')).toBeInTheDocument();
      });
    });

    it('should display form fields', async () => {
      render(<SetupWizard />);

      await waitFor(() => {
        expect(screen.getByText('Usuario')).toBeInTheDocument();
        expect(screen.getByText('Contraseña')).toBeInTheDocument();
        expect(screen.getByText('Confirmar contraseña')).toBeInTheDocument();
      });
    });

    it('should display next button', async () => {
      render(<SetupWizard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /siguiente/i })).toBeInTheDocument();
      });
    });

    it('should show progress steps', async () => {
      render(<SetupWizard />);

      await waitFor(() => {
        expect(screen.getByText('Cuenta Admin')).toBeInTheDocument();
        expect(screen.getByText('Biblioteca')).toBeInTheDocument();
        expect(screen.getByText('Finalizar')).toBeInTheDocument();
      });
    });
  });

  describe('Library Step', () => {
    beforeEach(() => {
      mockGetSetupStatus.mockResolvedValue({
        needsSetup: true,
        hasAdmin: true,
        hasMusicLibrary: false,
        mountedLibrary: { isMounted: true, path: '/mnt', fileCount: 0 },
      });
      mockBrowseDirectories.mockResolvedValue({
        currentPath: '/mnt',
        canGoUp: true,
        parentPath: '/',
        directories: [
          { name: 'music', path: '/mnt/music', readable: true, hasMusic: true },
          { name: 'other', path: '/mnt/other', readable: true, hasMusic: false },
        ],
      });
    });

    it('should display library step when admin exists', async () => {
      render(<SetupWizard />);

      await waitFor(() => {
        expect(screen.getByText('Selecciona tu biblioteca de música')).toBeInTheDocument();
      });
    });

    it('should show current path', async () => {
      render(<SetupWizard />);

      await waitFor(() => {
        expect(screen.getByText('/mnt')).toBeInTheDocument();
      });
    });

    it('should display directories', async () => {
      render(<SetupWizard />);

      await waitFor(() => {
        expect(screen.getByText('music')).toBeInTheDocument();
        expect(screen.getByText('other')).toBeInTheDocument();
      });
    });

    it('should show go up button', async () => {
      render(<SetupWizard />);

      await waitFor(() => {
        expect(screen.getByText('..')).toBeInTheDocument();
      });
    });

    it('should navigate into directory on click', async () => {
      render(<SetupWizard />);

      await waitFor(() => {
        expect(screen.getByText('music')).toBeInTheDocument();
      });

      mockBrowseDirectories.mockResolvedValue({
        currentPath: '/mnt/music',
        canGoUp: true,
        parentPath: '/mnt',
        directories: [],
      });

      fireEvent.click(screen.getByText('music'));

      await waitFor(() => {
        expect(mockBrowseDirectories).toHaveBeenCalledWith('/mnt/music');
      });
    });

    it('should show validation result after selection', async () => {
      mockConfigureLibrary.mockResolvedValue({
        valid: true,
        message: '1000 archivos encontrados',
        fileCount: 1000,
      });

      render(<SetupWizard />);

      await waitFor(() => {
        expect(screen.getByText('music')).toBeInTheDocument();
      });

      const selectButtons = screen.getAllByRole('button', { name: /seleccionar/i });
      fireEvent.click(selectButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('1000 archivos encontrados')).toBeInTheDocument();
      });
    });

    it('should show empty message when no subdirectories', async () => {
      mockBrowseDirectories.mockResolvedValue({
        currentPath: '/mnt/music',
        canGoUp: true,
        parentPath: '/mnt',
        directories: [],
      });

      render(<SetupWizard />);

      await waitFor(() => {
        expect(screen.getByText('No hay subdirectorios')).toBeInTheDocument();
      });
    });
  });

  describe('Quick Select', () => {
    it('should show quick select when music is auto-detected', async () => {
      mockGetSetupStatus.mockResolvedValue({
        needsSetup: true,
        hasAdmin: true,
        hasMusicLibrary: false,
        mountedLibrary: { isMounted: true, path: '/mnt/music', fileCount: 500 },
      });
      mockBrowseDirectories.mockResolvedValue({
        currentPath: '/',
        canGoUp: false,
        parentPath: null,
        directories: [],
      });

      render(<SetupWizard />);

      await waitFor(() => {
        expect(screen.getByText(/500/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /usar esta/i })).toBeInTheDocument();
      });
    });
  });

  describe('Complete Step', () => {
    beforeEach(() => {
      mockGetSetupStatus.mockResolvedValue({
        needsSetup: true,
        hasAdmin: true,
        hasMusicLibrary: true,
        musicLibraryPath: '/mnt/music',
      });
    });

    it('should display complete step summary', async () => {
      render(<SetupWizard />);

      await waitFor(() => {
        expect(screen.getByText('¡Casi listo!')).toBeInTheDocument();
        expect(screen.getByText('Cuenta de administrador creada')).toBeInTheDocument();
      });
    });

    it('should display library path in summary', async () => {
      render(<SetupWizard />);

      await waitFor(() => {
        // The summary shows "Biblioteca: {path}"
        const summaryItems = screen.getAllByText(/Biblioteca/i);
        expect(summaryItems.length).toBeGreaterThan(0);
      });
    });

    it('should display complete button', async () => {
      render(<SetupWizard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /completar configuración/i })).toBeInTheDocument();
      });
    });

    it('should advance to done step after completion', async () => {
      mockCompleteSetup.mockResolvedValue({});

      render(<SetupWizard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /completar configuración/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /completar configuración/i }));

      await waitFor(() => {
        expect(screen.getByText('¡Configuración completada!')).toBeInTheDocument();
      });
    });
  });

  describe('Done Step', () => {
    it('should show login button after completion', async () => {
      mockGetSetupStatus.mockResolvedValue({
        needsSetup: true,
        hasAdmin: true,
        hasMusicLibrary: true,
        musicLibraryPath: '/mnt/music',
      });
      mockCompleteSetup.mockResolvedValue({});

      render(<SetupWizard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /completar configuración/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /completar configuración/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /ir al inicio de sesión/i })).toBeInTheDocument();
      });
    });

    it('should redirect to login on button click', async () => {
      mockGetSetupStatus.mockResolvedValue({
        needsSetup: true,
        hasAdmin: true,
        hasMusicLibrary: true,
        musicLibraryPath: '/mnt/music',
      });
      mockCompleteSetup.mockResolvedValue({});

      render(<SetupWizard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /completar configuración/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /completar configuración/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /ir al inicio de sesión/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /ir al inicio de sesión/i }));

      expect(mockSetLocation).toHaveBeenCalledWith('/login');
    });
  });

  describe('Error Handling', () => {
    it('should show error on connection failure', async () => {
      mockGetSetupStatus.mockRejectedValue(new Error('Connection failed'));

      render(<SetupWizard />);

      await waitFor(() => {
        expect(screen.getByText('Error al conectar con el servidor')).toBeInTheDocument();
      });
    });

    it('should fallback to admin step on error', async () => {
      mockGetSetupStatus.mockRejectedValue(new Error('Connection failed'));

      render(<SetupWizard />);

      await waitFor(() => {
        expect(screen.getByText('Crear cuenta de administrador')).toBeInTheDocument();
      });
    });

    it('should show error on completion failure', async () => {
      mockGetSetupStatus.mockResolvedValue({
        needsSetup: true,
        hasAdmin: true,
        hasMusicLibrary: true,
        musicLibraryPath: '/mnt/music',
      });
      mockCompleteSetup.mockRejectedValue(new Error('Failed'));

      render(<SetupWizard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /completar configuración/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /completar configuración/i }));

      await waitFor(() => {
        expect(screen.getByText('Error al completar la configuración')).toBeInTheDocument();
      });
    });
  });

  describe('No Folders Mounted', () => {
    it('should show instructions when no folders are accessible', async () => {
      mockGetSetupStatus.mockResolvedValue({
        needsSetup: true,
        hasAdmin: true,
        hasMusicLibrary: false,
        mountedLibrary: { isMounted: false, path: '', fileCount: 0 },
      });
      mockBrowseDirectories.mockResolvedValue(null);

      render(<SetupWizard />);

      await waitFor(() => {
        expect(screen.getByText('No se encontraron carpetas accesibles')).toBeInTheDocument();
      });
    });
  });
});
