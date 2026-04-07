import { forwardRef } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './LoginPage';

// Mock wouter
vi.mock('wouter', () => ({
  useLocation: () => ['/login', vi.fn()],
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'auth.username': 'Nombre de usuario',
        'auth.usernameLabel': 'Nombre de usuario',
        'auth.password': 'Contraseña',
        'auth.passwordLabel': 'Contraseña',
        'auth.login': 'Iniciar sesión',
        'auth.usernameRequired': 'El nombre de usuario es obligatorio',
        'auth.passwordRequired': 'La contraseña es obligatoria',
        'auth.loginError': 'Error al iniciar sesión',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock UI components - Input must use forwardRef for react-hook-form
vi.mock('@shared/components/ui', () => ({
  Button: ({
    children,
    disabled,
    loading,
    type,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    loading?: boolean;
    type?: string;
    [key: string]: unknown;
  }) => (
    <button
      disabled={disabled || loading}
      type={type as 'button' | 'submit' | 'reset'}
      data-loading={loading}
    >
      {children}
    </button>
  ),
  Input: forwardRef<HTMLInputElement, Record<string, unknown>>(
    ({ label, error, type, leftIcon: _li, ...rest }, ref) => (
      <div>
        <label htmlFor={rest.name as string}>{label as string}</label>
        <input
          ref={ref}
          id={rest.name as string}
          type={type as string}
          aria-label={label as string}
          {...rest}
        />
        {error && <span role="alert">{error as string}</span>}
      </div>
    )
  ),
}));

// Mock localStorage
vi.mock('@shared/utils/safeLocalStorage', () => ({
  safeLocalStorage: {
    getItem: vi.fn(() => '[]'),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

// Mock error utils
vi.mock('@shared/utils/error.utils', () => ({
  getApiErrorMessage: (_err: unknown, defaultMsg: string) => defaultMsg,
}));

// Mock useAuth
const mockLogin = vi.fn();
let mockIsLoggingIn = false;
let mockLoginError: Error | null = null;

vi.mock('@shared/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@shared/hooks')>();
  return {
    ...actual,
    useAuth: () => ({
      login: mockLogin,
      isLoggingIn: mockIsLoggingIn,
      loginError: mockLoginError,
    }),
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoggingIn = false;
    mockLoginError = null;
  });

  it('should render username and password fields', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText('Nombre de usuario')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
  });

  it('should render the login button', () => {
    render(<LoginPage />);

    expect(screen.getByText('Iniciar sesión')).toBeInTheDocument();
  });

  it('should call login with credentials on valid submission', async () => {
    render(<LoginPage />);

    const usernameInput = screen.getByLabelText('Nombre de usuario');
    const passwordInput = screen.getByLabelText('Contraseña');

    // react-hook-form needs native input event to detect changes
    fireEvent.input(usernameInput, { target: { value: 'myuser' } });
    fireEvent.input(passwordInput, { target: { value: 'mypassword' } });

    fireEvent.submit(screen.getByText('Iniciar sesión').closest('form')!);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: 'myuser',
        password: 'mypassword',
      });
    });
  });

  it('should show validation errors when fields are empty', async () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByText('Iniciar sesión'));

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should display login error when loginError is set', () => {
    mockLoginError = new Error('Bad credentials');

    render(<LoginPage />);

    expect(screen.getByText('Error al iniciar sesión')).toBeInTheDocument();
  });

  it('should disable form when isLoggingIn is true', () => {
    mockIsLoggingIn = true;

    render(<LoginPage />);

    const button = screen.getByText('Iniciar sesión');
    expect(button).toBeDisabled();
  });
});
