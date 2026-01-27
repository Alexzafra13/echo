import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UsersPanel } from './UsersPanel';
import * as useUsersModule from '../../hooks/useUsers';
import type { User } from '../../api/users.api';

// Mock the hooks
vi.mock('../../hooks/useUsers', () => ({
  useUsers: vi.fn(),
  useDeleteUser: vi.fn(),
  usePermanentlyDeleteUser: vi.fn(),
  useResetPassword: vi.fn(),
  useUpdateUser: vi.fn(),
}));

// Mock child modals to simplify testing
vi.mock('./CreateUserModal', () => ({
  CreateUserModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="create-user-modal">
      <button onClick={onClose}>Close Create Modal</button>
    </div>
  ),
}));

vi.mock('./EditUserModal', () => ({
  EditUserModal: ({ user, onClose }: { user: User; onClose: () => void }) => (
    <div data-testid="edit-user-modal">
      Editing: {user.username}
      <button onClick={onClose}>Close Edit Modal</button>
    </div>
  ),
}));

vi.mock('./CredentialsModal', () => ({
  CredentialsModal: ({ username, onClose }: { username: string; onClose: () => void }) => (
    <div data-testid="credentials-modal">
      Credentials for: {username}
      <button onClick={onClose}>Close Credentials Modal</button>
    </div>
  ),
}));

const mockUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    name: 'Admin User',
    isAdmin: true,
    isSystemAdmin: true,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    lastLoginAt: '2024-01-15T10:00:00.000Z',
  },
  {
    id: '2',
    username: 'john',
    name: 'John Doe',
    isAdmin: false,
    isSystemAdmin: false,
    isActive: true,
    createdAt: '2024-01-02T00:00:00.000Z',
    lastLoginAt: '2024-01-14T09:00:00.000Z',
  },
  {
    id: '3',
    username: 'jane',
    name: 'Jane Smith',
    isAdmin: true,
    isSystemAdmin: false,
    isActive: false,
    createdAt: '2024-01-03T00:00:00.000Z',
    lastLoginAt: '2024-01-10T08:00:00.000Z',
  },
];

const mockMutationReturn = {
  mutateAsync: vi.fn(),
  isPending: false,
};

describe('UsersPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(useUsersModule.useUsers).mockReturnValue({
      data: { users: mockUsers, total: 3 },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useUsersModule.useUsers>);

    vi.mocked(useUsersModule.useDeleteUser).mockReturnValue(mockMutationReturn as unknown as ReturnType<typeof useUsersModule.useDeleteUser>);
    vi.mocked(useUsersModule.usePermanentlyDeleteUser).mockReturnValue(mockMutationReturn as unknown as ReturnType<typeof useUsersModule.usePermanentlyDeleteUser>);
    vi.mocked(useUsersModule.useResetPassword).mockReturnValue(mockMutationReturn as unknown as ReturnType<typeof useUsersModule.useResetPassword>);
    vi.mocked(useUsersModule.useUpdateUser).mockReturnValue(mockMutationReturn as unknown as ReturnType<typeof useUsersModule.useUpdateUser>);
  });

  describe('loading state', () => {
    it('should show loading message when loading', () => {
      vi.mocked(useUsersModule.useUsers).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as unknown as ReturnType<typeof useUsersModule.useUsers>);

      render(<UsersPanel />);
      expect(screen.getByText('Cargando usuarios...')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error message when there is an error', () => {
      vi.mocked(useUsersModule.useUsers).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to load users'),
      } as unknown as ReturnType<typeof useUsersModule.useUsers>);

      render(<UsersPanel />);
      expect(screen.getByText('Error al cargar usuarios')).toBeInTheDocument();
      expect(screen.getByText('Failed to load users')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no users exist', () => {
      vi.mocked(useUsersModule.useUsers).mockReturnValue({
        data: { users: [], total: 0 },
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useUsersModule.useUsers>);

      render(<UsersPanel />);
      expect(screen.getByText('No hay usuarios')).toBeInTheDocument();
    });
  });

  describe('users list', () => {
    it('should render users table with all users', () => {
      render(<UsersPanel />);

      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should show correct user count in description', () => {
      render(<UsersPanel />);
      expect(screen.getByText(/Total: 3 usuarios/)).toBeInTheDocument();
    });

    it('should display admin badges correctly', () => {
      render(<UsersPanel />);
      expect(screen.getByText('Administrador Principal')).toBeInTheDocument();
      expect(screen.getAllByText('Admin').length).toBeGreaterThanOrEqual(1);
      // "Usuario" appears in table header, filter option, and badge - check badge exists
      expect(screen.getAllByText('Usuario').length).toBeGreaterThanOrEqual(1);
    });

    it('should display status badges correctly', () => {
      render(<UsersPanel />);
      // "Activo" appears in filter option + 2 user badges = 3
      expect(screen.getAllByText('Activo').length).toBeGreaterThanOrEqual(2);
      // "Inactivo" appears in filter option + 1 user badge
      expect(screen.getAllByText('Inactivo').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('search functionality', () => {
    it('should filter users by search query', () => {
      render(<UsersPanel />);

      const searchInput = screen.getByPlaceholderText('Buscar por nombre o usuario...');
      fireEvent.change(searchInput, { target: { value: 'john' } });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Admin User')).not.toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('should show no results message when search has no matches', () => {
      render(<UsersPanel />);

      const searchInput = screen.getByPlaceholderText('Buscar por nombre o usuario...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No se encontraron resultados')).toBeInTheDocument();
    });

    it('should be case insensitive', () => {
      render(<UsersPanel />);

      const searchInput = screen.getByPlaceholderText('Buscar por nombre o usuario...');
      fireEvent.change(searchInput, { target: { value: 'JOHN' } });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('filter functionality', () => {
    it('should filter by admin role', () => {
      render(<UsersPanel />);

      const roleSelect = screen.getByLabelText('Rol:');
      fireEvent.change(roleSelect, { target: { value: 'admin' } });

      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('should filter by user role', () => {
      render(<UsersPanel />);

      const roleSelect = screen.getByLabelText('Rol:');
      fireEvent.change(roleSelect, { target: { value: 'user' } });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Admin User')).not.toBeInTheDocument();
    });

    it('should filter by active status', () => {
      render(<UsersPanel />);

      const statusSelect = screen.getByLabelText('Estado:');
      fireEvent.change(statusSelect, { target: { value: 'active' } });

      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('should filter by inactive status', () => {
      render(<UsersPanel />);

      const statusSelect = screen.getByLabelText('Estado:');
      fireEvent.change(statusSelect, { target: { value: 'inactive' } });

      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.queryByText('Admin User')).not.toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('should combine filters correctly', () => {
      render(<UsersPanel />);

      const roleSelect = screen.getByLabelText('Rol:');
      const statusSelect = screen.getByLabelText('Estado:');

      fireEvent.change(roleSelect, { target: { value: 'admin' } });
      fireEvent.change(statusSelect, { target: { value: 'inactive' } });

      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.queryByText('Admin User')).not.toBeInTheDocument();
    });
  });

  describe('create user modal', () => {
    it('should open create user modal when button clicked', () => {
      render(<UsersPanel />);

      const createButton = screen.getByText('Crear Usuario');
      fireEvent.click(createButton);

      expect(screen.getByTestId('create-user-modal')).toBeInTheDocument();
    });

    it('should close create user modal', () => {
      render(<UsersPanel />);

      fireEvent.click(screen.getByText('Crear Usuario'));
      expect(screen.getByTestId('create-user-modal')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Close Create Modal'));
      expect(screen.queryByTestId('create-user-modal')).not.toBeInTheDocument();
    });
  });

  describe('edit user modal', () => {
    it('should open edit modal when edit button clicked', () => {
      render(<UsersPanel />);

      const editButtons = screen.getAllByText('Editar');
      fireEvent.click(editButtons[0]);

      expect(screen.getByTestId('edit-user-modal')).toBeInTheDocument();
    });

    it('should close edit modal', () => {
      render(<UsersPanel />);

      fireEvent.click(screen.getAllByText('Editar')[0]);
      expect(screen.getByTestId('edit-user-modal')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Close Edit Modal'));
      expect(screen.queryByTestId('edit-user-modal')).not.toBeInTheDocument();
    });
  });

  describe('user actions', () => {
    it('should disable deactivate button for system admin', () => {
      render(<UsersPanel />);

      const deactivateButtons = screen.getAllByText('Desactivar');
      // First user is system admin
      expect(deactivateButtons[0]).toBeDisabled();
    });

    it('should disable permanently delete button for system admin', () => {
      render(<UsersPanel />);

      const deleteButtons = screen.getAllByText('Eliminar');
      // First user is system admin
      expect(deleteButtons[0]).toBeDisabled();
    });

    it('should show reactivate button for inactive users', () => {
      render(<UsersPanel />);

      // Jane Smith is inactive
      expect(screen.getByText('Reactivar')).toBeInTheDocument();
    });

    it('should disable reset password for inactive users', () => {
      render(<UsersPanel />);

      const resetButtons = screen.getAllByText('Reset');
      // Jane Smith (3rd user) is inactive
      expect(resetButtons[2]).toBeDisabled();
    });

    it('should open deactivate confirmation dialog', () => {
      render(<UsersPanel />);

      const deactivateButtons = screen.getAllByText('Desactivar');
      // Click on second user (John Doe)
      fireEvent.click(deactivateButtons[1]);

      expect(screen.getByText('Desactivar Usuario')).toBeInTheDocument();
      // John Doe appears in both table and dialog
      expect(screen.getAllByText(/John Doe/).length).toBeGreaterThanOrEqual(1);
    });

    it('should open reset password confirmation dialog', () => {
      render(<UsersPanel />);

      const resetButtons = screen.getAllByText('Reset');
      fireEvent.click(resetButtons[1]); // John Doe

      expect(screen.getByText('Resetear Contraseña')).toBeInTheDocument();
    });

    it('should open permanently delete confirmation dialog', () => {
      render(<UsersPanel />);

      const deleteButtons = screen.getAllByText('Eliminar');
      fireEvent.click(deleteButtons[1]); // John Doe

      expect(screen.getByText('⚠️ Eliminar Permanentemente')).toBeInTheDocument();
    });

    it('should open reactivate confirmation dialog', () => {
      render(<UsersPanel />);

      fireEvent.click(screen.getByText('Reactivar'));

      expect(screen.getByText('Reactivar Usuario')).toBeInTheDocument();
    });
  });

  describe('pagination', () => {
    it('should show pagination info', () => {
      render(<UsersPanel />);

      expect(screen.getByText(/Mostrando 1 - 3 de 3/)).toBeInTheDocument();
    });

    it('should change page size', () => {
      render(<UsersPanel />);

      const pageSizeSelect = screen.getByLabelText('Por página:');
      fireEvent.change(pageSizeSelect, { target: { value: '10' } });

      expect(pageSizeSelect).toHaveValue('10');
    });
  });

  describe('mutation handlers', () => {
    it('should call deleteUser mutation when deactivate confirmed', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      vi.mocked(useUsersModule.useDeleteUser).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as unknown as ReturnType<typeof useUsersModule.useDeleteUser>);

      render(<UsersPanel />);

      // Open deactivate dialog for John Doe
      const deactivateButtons = screen.getAllByText('Desactivar');
      fireEvent.click(deactivateButtons[1]);

      // Find and click confirm button in dialog
      const confirmButtons = screen.getAllByRole('button', { name: /Desactivar/i });
      const dialogConfirmButton = confirmButtons[confirmButtons.length - 1];
      fireEvent.click(dialogConfirmButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith('2');
      });
    });

    it('should call resetPassword mutation when reset confirmed', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({ temporaryPassword: 'temp123' });
      vi.mocked(useUsersModule.useResetPassword).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as unknown as ReturnType<typeof useUsersModule.useResetPassword>);

      render(<UsersPanel />);

      // Open reset dialog for John Doe
      const resetButtons = screen.getAllByText('Reset');
      fireEvent.click(resetButtons[1]);

      // Find and click confirm button in dialog
      const confirmButtons = screen.getAllByRole('button', { name: /Resetear/i });
      const dialogConfirmButton = confirmButtons[confirmButtons.length - 1];
      fireEvent.click(dialogConfirmButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith('2');
      });
    });

    it('should show credentials modal after password reset', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({ temporaryPassword: 'temp123' });
      vi.mocked(useUsersModule.useResetPassword).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as unknown as ReturnType<typeof useUsersModule.useResetPassword>);

      render(<UsersPanel />);

      const resetButtons = screen.getAllByText('Reset');
      fireEvent.click(resetButtons[1]);

      const confirmButtons = screen.getAllByRole('button', { name: /Resetear/i });
      fireEvent.click(confirmButtons[confirmButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getByTestId('credentials-modal')).toBeInTheDocument();
        expect(screen.getByText('Credentials for: john')).toBeInTheDocument();
      });
    });
  });
});
