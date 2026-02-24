import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfilePage } from './ProfilePage';

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/profile', mockSetLocation],
  Link: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

// Mock state variables
const mockOpenModal = vi.fn();
const mockCloseModal = vi.fn();
const mockUpdateUser = vi.fn();
const mockChangePassword = vi.fn();
const mockUpdateProfile = vi.fn();
const mockUpdatePrivacy = vi.fn();

// Configurable mock state
const mockState = {
  isModalOpen: false,
  user: {
    id: 'user-1',
    username: 'testuser',
    name: 'Test User',
    isAdmin: false,
    hasAvatar: true,
    createdAt: '2023-01-15T10:30:00Z',
  },
  avatarTimestamp: 12345,
  passwordPending: false,
  passwordSuccess: false,
  passwordError: false,
  passwordErrorObj: null as Error | null | string,
  profilePending: false,
  profileSuccess: false,
  privacyPending: false,
  privacySuccess: false,
  privacyLoading: false,
  privacySettings: {
    isPublicProfile: false,
    showTopTracks: true,
    showTopArtists: true,
    showTopAlbums: true,
    showPlaylists: true,
    bio: '',
  },
};

// Mock shared hooks
vi.mock('@shared/hooks', () => ({
  useAuth: () => ({ user: mockState.user }),
  useModal: () => ({
    isOpen: mockState.isModalOpen,
    open: mockOpenModal,
    close: mockCloseModal,
  }),
  useDocumentTitle: vi.fn(),
  useDominantColor: vi.fn(() => '100, 150, 200'),
}));

// Mock auth store
vi.mock('@shared/store', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => {
    const state = {
      updateUser: mockUpdateUser,
      avatarTimestamp: mockState.avatarTimestamp,
    };
    return selector(state);
  },
}));

// Mock profile hooks
vi.mock('../../hooks', () => ({
  useChangePassword: () => ({
    mutate: mockChangePassword,
    isPending: mockState.passwordPending,
    isSuccess: mockState.passwordSuccess,
    isError: mockState.passwordError,
    error: mockState.passwordErrorObj,
  }),
  useUpdateProfile: () => ({
    mutate: mockUpdateProfile,
    isPending: mockState.profilePending,
    isSuccess: mockState.profileSuccess,
  }),
}));

// Mock privacy settings hooks
vi.mock('@features/settings/hooks', () => ({
  usePrivacySettings: () => ({
    data: mockState.privacyLoading ? null : mockState.privacySettings,
    isLoading: mockState.privacyLoading,
  }),
  useUpdatePrivacySettings: () => ({
    mutate: mockUpdatePrivacy,
    isPending: mockState.privacyPending,
    isSuccess: mockState.privacySuccess,
  }),
}));

// Mock avatar utils
vi.mock('@shared/utils/avatar.utils', () => ({
  getUserAvatarUrl: (id: string, _hasAvatar: boolean, timestamp: number) => `/api/users/${id}/avatar?t=${timestamp}`,
  handleAvatarError: vi.fn(),
  getUserInitials: (name: string | null, username: string) => (name || username || 'U').charAt(0).toUpperCase(),
}));

// Mock format utils
vi.mock('@shared/utils/format', () => ({
  formatDate: (date: string | null) => date ? '15/01/2023' : 'Fecha desconocida',
}));

// Mock color extractor
const mockExtractDominantColor = vi.fn(() => Promise.resolve('100, 150, 200'));
vi.mock('@shared/utils/colorExtractor', () => ({
  extractDominantColor: () => mockExtractDominantColor(),
}));

// Mock layout components
vi.mock('@shared/components/layout/Header', () => ({
  Header: ({ showBackButton, disableSearch }: { showBackButton?: boolean; disableSearch?: boolean }) => (
    <header data-testid="header" data-back-button={showBackButton} data-disable-search={disableSearch}>
      Header
    </header>
  ),
}));

vi.mock('@features/home/components', () => ({
  Sidebar: () => <nav data-testid="sidebar">Sidebar</nav>,
}));

// Mock avatar edit modal
vi.mock('../../components/AvatarEditModal', () => ({
  AvatarEditModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="avatar-edit-modal">
      <button onClick={onClose}>Close Modal</button>
    </div>
  ),
}));

// Helper to reset mock state
function resetMockState() {
  mockState.isModalOpen = false;
  mockState.user = {
    id: 'user-1',
    username: 'testuser',
    name: 'Test User',
    isAdmin: false,
    hasAvatar: true,
    createdAt: '2023-01-15T10:30:00Z',
  };
  mockState.avatarTimestamp = 12345;
  mockState.passwordPending = false;
  mockState.passwordSuccess = false;
  mockState.passwordError = false;
  mockState.passwordErrorObj = null;
  mockState.profilePending = false;
  mockState.profileSuccess = false;
  mockState.privacyPending = false;
  mockState.privacySuccess = false;
  mockState.privacyLoading = false;
  mockState.privacySettings = {
    isPublicProfile: false,
    showTopTracks: true,
    showTopArtists: true,
    showTopAlbums: true,
    showPlaylists: true,
    bio: '',
  };
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockState();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Layout', () => {
    it('should render sidebar and header', () => {
      render(<ProfilePage />);

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('should display profile title', () => {
      render(<ProfilePage />);

      expect(screen.getByRole('heading', { name: 'Perfil' })).toBeInTheDocument();
    });

    it('should display user name in subtitle', () => {
      render(<ProfilePage />);

      const nameElements = screen.getAllByText('Test User');
      expect(nameElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Avatar Section', () => {
    it('should display avatar image when user has avatar', () => {
      render(<ProfilePage />);

      const avatar = screen.getByAltText('Test User');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', expect.stringContaining('/api/users/user-1/avatar'));
    });

    it('should display avatar placeholder when user has no avatar', () => {
      mockState.user = {
        ...mockState.user,
        name: null,
        hasAvatar: false,
      };

      render(<ProfilePage />);

      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('should show edit overlay on avatar', () => {
      render(<ProfilePage />);

      expect(screen.getByText('Editar foto')).toBeInTheDocument();
    });

    it('should open avatar modal when avatar is clicked', () => {
      render(<ProfilePage />);

      const avatarContainer = screen.getByText('Editar foto').closest('div');
      fireEvent.click(avatarContainer!.parentElement!);

      expect(mockOpenModal).toHaveBeenCalled();
    });

    it('should render avatar edit modal when open', () => {
      mockState.isModalOpen = true;

      render(<ProfilePage />);

      expect(screen.getByTestId('avatar-edit-modal')).toBeInTheDocument();
    });
  });

  describe('Account Information Section', () => {
    it('should display section title', () => {
      render(<ProfilePage />);

      expect(screen.getByRole('heading', { name: 'Información de la cuenta' })).toBeInTheDocument();
    });

    it('should display username as read-only', () => {
      render(<ProfilePage />);

      const usernameElements = screen.getAllByText('testuser');
      expect(usernameElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Para iniciar sesión, no se puede cambiar')).toBeInTheDocument();
    });

    it('should display user name with edit button', () => {
      render(<ProfilePage />);

      const editButton = screen.getByRole('button', { name: 'Editar' });
      expect(editButton).toBeInTheDocument();
    });

    it('should display user role badge for regular user', () => {
      render(<ProfilePage />);

      expect(screen.getByText('Usuario')).toBeInTheDocument();
    });

    it('should display admin badge for admin user', () => {
      mockState.user = { ...mockState.user, isAdmin: true };

      render(<ProfilePage />);

      expect(screen.getByText('Administrador')).toBeInTheDocument();
    });

    it('should display member since date', () => {
      render(<ProfilePage />);

      expect(screen.getByText('15/01/2023')).toBeInTheDocument();
    });
  });

  describe('Name Editing', () => {
    it('should enter edit mode when edit button is clicked', () => {
      render(<ProfilePage />);

      const editButton = screen.getByRole('button', { name: 'Editar' });
      fireEvent.click(editButton);

      expect(screen.getByPlaceholderText('Tu nombre')).toBeInTheDocument();
    });

    it('should show save and cancel buttons in edit mode', () => {
      render(<ProfilePage />);

      fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

      expect(screen.getByTitle('Guardar')).toBeInTheDocument();
      expect(screen.getByTitle('Cancelar')).toBeInTheDocument();
    });

    it('should cancel editing and restore original name', () => {
      render(<ProfilePage />);

      fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

      const input = screen.getByPlaceholderText('Tu nombre');
      fireEvent.change(input, { target: { value: 'New Name' } });

      fireEvent.click(screen.getByTitle('Cancelar'));

      expect(screen.queryByPlaceholderText('Tu nombre')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
    });

    it('should not call updateProfile if name is unchanged', () => {
      render(<ProfilePage />);

      fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
      fireEvent.click(screen.getByTitle('Guardar'));

      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it('should call updateProfile with new name', () => {
      render(<ProfilePage />);

      fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

      const input = screen.getByPlaceholderText('Tu nombre');
      fireEvent.change(input, { target: { value: 'New Name' } });

      fireEvent.click(screen.getByTitle('Guardar'));

      expect(mockUpdateProfile).toHaveBeenCalledWith(
        { name: 'New Name' },
        expect.any(Object)
      );
    });

    it('should update auth store and exit edit mode on success', () => {
      mockUpdateProfile.mockImplementation((data, options) => {
        options.onSuccess({ name: 'New Name' });
      });

      render(<ProfilePage />);

      fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

      const input = screen.getByPlaceholderText('Tu nombre');
      fireEvent.change(input, { target: { value: 'New Name' } });

      fireEvent.click(screen.getByTitle('Guardar'));

      expect(mockUpdateUser).toHaveBeenCalledWith({ name: 'New Name' });
    });

    it('should show success message after profile update', () => {
      mockState.profileSuccess = true;

      render(<ProfilePage />);

      expect(screen.getByText('✓ Nombre actualizado')).toBeInTheDocument();
    });
  });

  describe('Privacy Settings Section', () => {
    it('should display section title', () => {
      render(<ProfilePage />);

      expect(screen.getByRole('heading', { name: /Perfil Público/i })).toBeInTheDocument();
    });

    it('should show loading state when privacy settings are loading', () => {
      mockState.privacyLoading = true;

      render(<ProfilePage />);

      expect(screen.getByText('Cargando...')).toBeInTheDocument();
    });

    it('should display public profile toggle', () => {
      render(<ProfilePage />);

      expect(screen.getByText('Perfil público')).toBeInTheDocument();
      expect(screen.getByText('Permite que otros usuarios vean tu perfil y estadísticas de escucha')).toBeInTheDocument();
    });

    it('should not show additional settings when profile is private', () => {
      render(<ProfilePage />);

      expect(screen.queryByText('Mostrar top canciones')).not.toBeInTheDocument();
      expect(screen.queryByText('Mostrar top artistas')).not.toBeInTheDocument();
    });

    it('should show additional settings when profile is toggled to public', () => {
      render(<ProfilePage />);

      // Toggle public profile
      const toggles = screen.getAllByRole('checkbox');
      fireEvent.click(toggles[0]); // Click public profile toggle

      expect(screen.getByText('Mostrar top canciones')).toBeInTheDocument();
      expect(screen.getByText('Mostrar top artistas')).toBeInTheDocument();
      expect(screen.getByText('Mostrar top álbumes')).toBeInTheDocument();
      expect(screen.getByText('Mostrar playlists públicas')).toBeInTheDocument();
    });

    it('should show bio textarea when profile is public', () => {
      render(<ProfilePage />);

      const toggles = screen.getAllByRole('checkbox');
      fireEvent.click(toggles[0]);

      expect(screen.getByPlaceholderText('Escribe algo sobre ti...')).toBeInTheDocument();
      expect(screen.getByText('0/500')).toBeInTheDocument();
    });

    it('should limit bio to 500 characters', () => {
      render(<ProfilePage />);

      const toggles = screen.getAllByRole('checkbox');
      fireEvent.click(toggles[0]);

      const textarea = screen.getByPlaceholderText('Escribe algo sobre ti...');
      const longText = 'a'.repeat(600);

      fireEvent.change(textarea, { target: { value: longText } });

      expect(screen.getByText('500/500')).toBeInTheDocument();
    });

    it('should show save button when changes are made', () => {
      render(<ProfilePage />);

      const toggles = screen.getAllByRole('checkbox');
      fireEvent.click(toggles[0]); // Toggle public profile

      expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument();
    });

    it('should call updatePrivacy with correct data', () => {
      render(<ProfilePage />);

      const toggles = screen.getAllByRole('checkbox');
      fireEvent.click(toggles[0]); // Toggle public profile

      const saveButton = screen.getByRole('button', { name: 'Guardar cambios' });
      fireEvent.click(saveButton);

      expect(mockUpdatePrivacy).toHaveBeenCalledWith({
        isPublicProfile: true,
        showTopTracks: true,
        showTopArtists: true,
        showTopAlbums: true,
        showPlaylists: true,
        bio: null,
      });
    });

    it('should show saving state on button', () => {
      mockState.privacyPending = true;

      render(<ProfilePage />);

      const toggles = screen.getAllByRole('checkbox');
      fireEvent.click(toggles[0]);

      expect(screen.getByRole('button', { name: 'Guardando...' })).toBeInTheDocument();
    });

    it('should show success message after saving', () => {
      mockState.privacySuccess = true;

      render(<ProfilePage />);

      expect(screen.getByText('Configuración guardada')).toBeInTheDocument();
    });

    it('should show preview link when profile is public', () => {
      render(<ProfilePage />);

      const toggles = screen.getAllByRole('checkbox');
      fireEvent.click(toggles[0]);

      const link = screen.getByText('Ver mi perfil público');
      expect(link).toBeInTheDocument();
      expect(link.closest('a')).toHaveAttribute('href', '/user/user-1');
    });
  });

  describe('Password Change Section', () => {
    it('should display section title', () => {
      render(<ProfilePage />);

      expect(screen.getByRole('heading', { name: /Seguridad/i })).toBeInTheDocument();
    });

    it('should display password form fields', () => {
      render(<ProfilePage />);

      expect(screen.getByLabelText('Contraseña actual')).toBeInTheDocument();
      expect(screen.getByLabelText('Nueva contraseña')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument();
    });

    it('should display submit button', () => {
      render(<ProfilePage />);

      expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeInTheDocument();
    });

    it('should show validation error when fields are empty', () => {
      render(<ProfilePage />);

      const submitButton = screen.getByRole('button', { name: 'Cambiar contraseña' });
      fireEvent.click(submitButton);

      expect(screen.getByText('Todos los campos son obligatorios')).toBeInTheDocument();
      expect(mockChangePassword).not.toHaveBeenCalled();
    });

    it('should show validation error when new password is too short', () => {
      render(<ProfilePage />);

      fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: 'currentpass' } });
      fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'short' } });
      fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'short' } });

      fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

      expect(screen.getByText('La nueva contraseña debe tener al menos 8 caracteres')).toBeInTheDocument();
      expect(mockChangePassword).not.toHaveBeenCalled();
    });

    it('should show validation error when passwords do not match', () => {
      render(<ProfilePage />);

      fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: 'currentpass' } });
      fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'newpassword123' } });
      fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'differentpass' } });

      fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

      expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
      expect(mockChangePassword).not.toHaveBeenCalled();
    });

    it('should show validation error when new password is same as current', () => {
      render(<ProfilePage />);

      fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: 'samepassword123' } });
      fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'samepassword123' } });
      fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'samepassword123' } });

      fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

      expect(screen.getByText('La nueva contraseña debe ser diferente a la actual')).toBeInTheDocument();
      expect(mockChangePassword).not.toHaveBeenCalled();
    });

    it('should call changePassword with valid data', () => {
      render(<ProfilePage />);

      fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: 'currentpass' } });
      fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'newpassword123' } });
      fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'newpassword123' } });

      fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

      expect(mockChangePassword).toHaveBeenCalledWith(
        { currentPassword: 'currentpass', newPassword: 'newpassword123' },
        expect.any(Object)
      );
    });

    it('should clear form fields on success', () => {
      mockChangePassword.mockImplementation((data, options) => {
        options.onSuccess();
      });

      render(<ProfilePage />);

      const currentInput = screen.getByLabelText('Contraseña actual');
      const newInput = screen.getByLabelText('Nueva contraseña');
      const confirmInput = screen.getByLabelText('Confirmar contraseña');

      fireEvent.change(currentInput, { target: { value: 'currentpass' } });
      fireEvent.change(newInput, { target: { value: 'newpassword123' } });
      fireEvent.change(confirmInput, { target: { value: 'newpassword123' } });

      fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

      expect(currentInput).toHaveValue('');
      expect(newInput).toHaveValue('');
      expect(confirmInput).toHaveValue('');
    });

    it('should show loading state while changing password', () => {
      mockState.passwordPending = true;

      render(<ProfilePage />);

      expect(screen.getByRole('button', { name: 'Cambiando...' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cambiando...' })).toBeDisabled();
    });

    it('should show success message after password change', () => {
      mockState.passwordSuccess = true;

      render(<ProfilePage />);

      expect(screen.getByText('Contraseña cambiada exitosamente')).toBeInTheDocument();
    });

    it('should show error message on password change failure', () => {
      mockState.passwordError = true;
      mockState.passwordErrorObj = new Error('La contraseña actual es incorrecta');

      render(<ProfilePage />);

      expect(screen.getByText('La contraseña actual es incorrecta')).toBeInTheDocument();
    });

    it('should show generic error message when error is not an Error instance', () => {
      mockState.passwordError = true;
      mockState.passwordErrorObj = 'string error';

      render(<ProfilePage />);

      expect(screen.getByText('Error al cambiar la contraseña. Verifica que la contraseña actual sea correcta.')).toBeInTheDocument();
    });

    it('should disable form fields while submitting', () => {
      mockState.passwordPending = true;

      render(<ProfilePage />);

      expect(screen.getByLabelText('Contraseña actual')).toBeDisabled();
      expect(screen.getByLabelText('Nueva contraseña')).toBeDisabled();
      expect(screen.getByLabelText('Confirmar contraseña')).toBeDisabled();
    });
  });

  describe('User without name', () => {
    beforeEach(() => {
      mockState.user = {
        id: 'user-1',
        username: 'testuser',
        name: null,
        isAdmin: false,
        hasAvatar: false,
        createdAt: '2023-01-15T10:30:00Z',
      };
    });

    it('should display "Sin nombre" when user has no name', () => {
      render(<ProfilePage />);

      expect(screen.getByText('Sin nombre')).toBeInTheDocument();
    });

    it('should display username in subtitle when no name', () => {
      render(<ProfilePage />);

      const subtitles = screen.getAllByText('testuser');
      expect(subtitles.length).toBeGreaterThan(0);
    });
  });

  describe('Dynamic background color', () => {
    it('should use dominant color from avatar via useDominantColor hook', () => {
      const { container } = render(<ProfilePage />);

      // The useDominantColor mock returns '100, 150, 200', which should be applied to the background
      const contentEl = container.querySelector('[class*="profilePage__content"]');
      expect(contentEl).toBeTruthy();
      if (contentEl) {
        const style = (contentEl as HTMLElement).getAttribute('style');
        expect(style).toContain('100, 150, 200');
      }
    });
  });
});
