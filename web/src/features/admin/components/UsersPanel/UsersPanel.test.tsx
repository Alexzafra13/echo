import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UsersPanel } from './UsersPanel';

// Mock shared hooks
vi.mock('@shared/hooks', () => ({
  useModal: () => ({
    isOpen: false,
    open: vi.fn(),
    close: vi.fn(),
    openWith: vi.fn(),
    data: null,
  }),
  useNotification: () => ({
    notification: null,
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
    showInfo: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

// Mock UI components
vi.mock('@shared/components/ui', () => ({
  Button: ({
    children,
    onClick,
    leftIcon,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    leftIcon?: React.ReactNode;
  }) => (
    <button onClick={onClick}>
      {leftIcon}
      {children}
    </button>
  ),
  InlineNotification: ({ message, onDismiss }: { message: string; onDismiss?: () => void }) => (
    <div data-testid="notification" onClick={onDismiss}>
      {message}
    </div>
  ),
  ConfirmDialog: () => null,
}));

// Mock sub-components
vi.mock('./CreateUserModal', () => ({
  CreateUserModal: () => <div data-testid="create-user-modal">Create User Modal</div>,
}));

vi.mock('./EditUserModal', () => ({
  EditUserModal: () => <div data-testid="edit-user-modal">Edit User Modal</div>,
}));

vi.mock('./CredentialsModal', () => ({
  CredentialsModal: () => <div data-testid="credentials-modal">Credentials Modal</div>,
}));

vi.mock('./UserRow', () => ({
  UserRow: ({
    user,
    onEdit,
    onDeactivate,
  }: {
    user: { id: string; username: string; isAdmin: boolean; isActive: boolean };
    onEdit: (u: { id: string }) => void;
    onDeactivate: (u: { id: string }) => void;
  }) => (
    <tr data-testid={`user-${user.id}`}>
      <td>{user.username}</td>
      <td>{user.isAdmin ? 'Admin' : 'User'}</td>
      <td>{user.isActive ? 'Active' : 'Inactive'}</td>
      <td>-</td>
      <td>
        <button onClick={() => onEdit(user)}>Edit</button>
        <button onClick={() => onDeactivate(user)}>Deactivate</button>
      </td>
    </tr>
  ),
}));

vi.mock('./SearchFilters', () => ({
  SearchFilters: ({
    searchQuery,
    onSearchChange,
    onRoleFilterChange,
    onStatusFilterChange,
  }: {
    searchQuery: string;
    onSearchChange: (val: string) => void;
    onRoleFilterChange: (val: string) => void;
    onStatusFilterChange: (val: string) => void;
  }) => (
    <div data-testid="search-filters">
      <input
        data-testid="search-input"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Buscar..."
      />
      <select data-testid="role-filter" onChange={(e) => onRoleFilterChange(e.target.value)}>
        <option value="all">All</option>
        <option value="admin">Admin</option>
        <option value="user">User</option>
      </select>
      <select data-testid="status-filter" onChange={(e) => onStatusFilterChange(e.target.value)}>
        <option value="all">All</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>
  ),
}));

vi.mock('./Pagination', () => ({
  Pagination: ({
    currentPage,
    totalPages,
    onPageChange,
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }) => (
    <div data-testid="pagination">
      <span>
        Page {currentPage} of {totalPages}
      </span>
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1}>
        Prev
      </button>
      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages}>
        Next
      </button>
    </div>
  ),
}));

// Mock users data
const mockUsers = [
  { id: '1', username: 'admin', name: 'Admin User', isAdmin: true, isActive: true },
  { id: '2', username: 'user1', name: 'Regular User', isAdmin: false, isActive: true },
  { id: '3', username: 'user2', name: 'Inactive User', isAdmin: false, isActive: false },
];

const mockHooksState = {
  users: mockUsers,
  isLoading: false,
  error: null as Error | null,
};

vi.mock('../../hooks/useUsers', () => ({
  useUsers: () => ({
    data: { users: mockHooksState.users },
    isLoading: mockHooksState.isLoading,
    error: mockHooksState.error,
  }),
  useDeleteUser: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useResetPassword: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ temporaryPassword: 'temp123' }),
    isPending: false,
  }),
  usePermanentlyDeleteUser: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useUpdateUser: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
}));

describe('UsersPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHooksState.users = mockUsers;
    mockHooksState.isLoading = false;
    mockHooksState.error = null;
  });

  describe('layout', () => {
    it('should render header', () => {
      render(<UsersPanel />);

      expect(screen.getByText('Gestión de Usuarios')).toBeInTheDocument();
      expect(screen.getByText(/Crea, edita y administra los usuarios/)).toBeInTheDocument();
    });

    it('should render create user button', () => {
      render(<UsersPanel />);

      expect(screen.getByText('Crear Usuario')).toBeInTheDocument();
    });

    it('should render search filters', () => {
      render(<UsersPanel />);

      expect(screen.getByTestId('search-filters')).toBeInTheDocument();
    });

    it('should render pagination', () => {
      render(<UsersPanel />);

      expect(screen.getByTestId('pagination')).toBeInTheDocument();
    });

    it('should show user count', () => {
      render(<UsersPanel />);

      expect(screen.getByText(/Total: 3 usuarios/)).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading message', () => {
      mockHooksState.isLoading = true;
      render(<UsersPanel />);

      expect(screen.getByText('Cargando usuarios...')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error message', () => {
      mockHooksState.error = new Error('Failed to load');
      render(<UsersPanel />);

      expect(screen.getByText('Error al cargar usuarios')).toBeInTheDocument();
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });
  });

  describe('users table', () => {
    it('should render users', () => {
      render(<UsersPanel />);

      expect(screen.getByTestId('user-1')).toBeInTheDocument();
      expect(screen.getByTestId('user-2')).toBeInTheDocument();
      expect(screen.getByTestId('user-3')).toBeInTheDocument();
    });

    it('should render table headers', () => {
      render(<UsersPanel />);

      expect(screen.getByText('Usuario')).toBeInTheDocument();
      expect(screen.getByText('Rol')).toBeInTheDocument();
      expect(screen.getByText('Estado')).toBeInTheDocument();
      expect(screen.getByText('Último acceso')).toBeInTheDocument();
      expect(screen.getByText('Acciones')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty message when no users', () => {
      mockHooksState.users = [];
      render(<UsersPanel />);

      expect(screen.getByText('No hay usuarios')).toBeInTheDocument();
    });
  });

  describe('filtering', () => {
    it('should filter by search query', () => {
      render(<UsersPanel />);

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'admin' } });

      // After filtering, only admin user should match
      expect(screen.getByTestId('user-1')).toBeInTheDocument();
    });

    it('should filter by role', () => {
      render(<UsersPanel />);

      const roleFilter = screen.getByTestId('role-filter');
      fireEvent.change(roleFilter, { target: { value: 'admin' } });

      // Admin filter applied
      expect(screen.getByTestId('user-1')).toBeInTheDocument();
    });

    it('should filter by status', () => {
      render(<UsersPanel />);

      const statusFilter = screen.getByTestId('status-filter');
      fireEvent.change(statusFilter, { target: { value: 'inactive' } });

      // Inactive filter applied - only user3 is inactive
      expect(screen.getByTestId('user-3')).toBeInTheDocument();
    });
  });
});
