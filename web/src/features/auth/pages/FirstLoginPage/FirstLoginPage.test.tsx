import { forwardRef } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FirstLoginPage from './FirstLoginPage';

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/first-login', mockSetLocation],
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'auth.firstLogin.welcomeTitle': 'Bienvenido',
        'auth.firstLogin.pageSubtitle': 'Configura tu cuenta',
        'auth.firstLogin.description': 'Debes cambiar tu contraseña',
        'auth.firstLogin.usernameLabel': 'Nombre de usuario',
        'auth.firstLogin.usernameMinLength': 'Mínimo 3 caracteres',
        'auth.firstLogin.usernameMaxLength': 'Máximo 50 caracteres',
        'auth.firstLogin.usernamePattern': 'Solo letras, números y guión bajo',
        'auth.firstLogin.newPasswordLabel': 'Nueva contraseña',
        'auth.firstLogin.passwordMinLength': 'Mínimo 8 caracteres',
        'auth.firstLogin.passwordUppercase': 'Debe tener mayúscula',
        'auth.firstLogin.passwordLowercase': 'Debe tener minúscula',
        'auth.firstLogin.passwordNumber': 'Debe tener número',
        'auth.firstLogin.passwordSpecial': 'Debe tener carácter especial',
        'auth.firstLogin.confirmPasswordLabel': 'Confirmar contraseña',
        'auth.firstLogin.passwordMismatch': 'Las contraseñas no coinciden',
        'auth.firstLogin.requirementsTitle': 'Requisitos',
        'auth.firstLogin.continueButton': 'Continuar',
        'auth.firstLogin.logoutButton': 'Cerrar sesión',
        'auth.firstLogin.keepCurrentHint': 'Dejar vacío para mantener: ',
        'auth.firstLogin.footerText': 'Puedes cambiar esto después',
        'auth.firstLogin.updateError': 'Error al actualizar',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock UI components - Input must use forwardRef for react-hook-form
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
    [key: string]: unknown;
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

// Mock useAuth
const mockLogout = vi.fn();
vi.mock('@shared/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@shared/hooks')>();
  return {
    ...actual,
    useAuth: () => ({
      user: { id: '1', username: 'testuser', isAdmin: false, mustChangePassword: true },
      logout: mockLogout,
    }),
  };
});

// Mock authStore
const mockUpdateUser = vi.fn();
vi.mock('@shared/store', () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ updateUser: mockUpdateUser }),
}));

// Mock apiClient
const mockPut = vi.fn();
vi.mock('@shared/services/api', () => ({
  default: {
    put: (...args: unknown[]) => mockPut(...args),
  },
}));

// Mock error utils
vi.mock('@shared/utils/error.utils', () => ({
  getApiErrorMessage: (_err: unknown, defaultMsg: string) => defaultMsg,
}));

describe('FirstLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPut.mockResolvedValue({ data: {} });
  });

  it('should render the form with username, password, and confirm password fields', () => {
    render(<FirstLoginPage />);

    expect(screen.getByLabelText('Nombre de usuario')).toBeInTheDocument();
    expect(screen.getByLabelText('Nueva contraseña')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument();
  });

  it('should render submit and logout buttons', () => {
    render(<FirstLoginPage />);

    expect(screen.getByText('Continuar')).toBeInTheDocument();
    expect(screen.getByText('Cerrar sesión')).toBeInTheDocument();
  });

  it('should display password requirement indicators', () => {
    render(<FirstLoginPage />);

    expect(screen.getByText('Requisitos')).toBeInTheDocument();
  });

  it('should call logout when logout button is clicked', () => {
    render(<FirstLoginPage />);

    fireEvent.click(screen.getByText('Cerrar sesión'));

    expect(mockLogout).toHaveBeenCalled();
  });

  const fillAndSubmitForm = (
    password = 'NewPass1!',
    confirmPassword = 'NewPass1!',
    username?: string
  ) => {
    if (username) {
      fireEvent.input(screen.getByLabelText('Nombre de usuario'), {
        target: { value: username },
      });
    }
    fireEvent.input(screen.getByLabelText('Nueva contraseña'), {
      target: { value: password },
    });
    fireEvent.input(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: confirmPassword },
    });

    const form = screen.getByText('Continuar').closest('form');
    fireEvent.submit(form!);
  };

  it('should call PUT /users/password on valid submission', async () => {
    render(<FirstLoginPage />);

    fillAndSubmitForm();

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith('/users/password', {
        newPassword: 'NewPass1!',
      });
    });
  });

  it('should call PUT /users/profile when username is changed', async () => {
    render(<FirstLoginPage />);

    fillAndSubmitForm('NewPass1!', 'NewPass1!', 'newusername');

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith('/users/profile', {
        username: 'newusername',
      });
    });
  });

  it('should NOT call PUT /users/profile when username is unchanged', async () => {
    render(<FirstLoginPage />);

    fillAndSubmitForm();

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith('/users/password', expect.anything());
    });

    // Only password call, no profile call
    const profileCalls = mockPut.mock.calls.filter(
      (call: unknown[]) => call[0] === '/users/profile'
    );
    expect(profileCalls).toHaveLength(0);
  });

  it('should update store mustChangePassword=false and redirect to /home after success', async () => {
    render(<FirstLoginPage />);

    fillAndSubmitForm();

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ mustChangePassword: false });
      expect(mockSetLocation).toHaveBeenCalledWith('/home');
    });
  });

  it('should display error message when API call fails', async () => {
    mockPut.mockRejectedValueOnce(new Error('Server error'));

    render(<FirstLoginPage />);

    fillAndSubmitForm();

    await waitFor(() => {
      expect(screen.getByText('Error al actualizar')).toBeInTheDocument();
    });
  });
});
