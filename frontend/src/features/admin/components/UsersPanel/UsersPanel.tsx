import { useState, useMemo } from 'react';
import { Users as UsersIcon, UserPlus, Edit2, Trash2, Key, Search } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { useToast } from '@shared/context/ToastContext';
import { useUsers, useDeleteUser, useResetPassword, usePermanentlyDeleteUser } from '../../hooks/useUsers';
import { User } from '../../api/users.api';
import { CreateUserModal } from './CreateUserModal';
import { EditUserModal } from './EditUserModal';
import { CredentialsModal } from './CredentialsModal';
import { ConfirmDialog } from './ConfirmDialog';
import styles from './UsersPanel.module.css';

/**
 * UsersPanel Component
 * Panel de gestión de usuarios para administradores
 */
export function UsersPanel() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [credentialsData, setCredentialsData] = useState<{ username: string; password: string } | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToPermanentlyDelete, setUserToPermanentlyDelete] = useState<User | null>(null);
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Toast notifications
  const { addToast } = useToast();

  // Queries - Load all users for client-side filtering
  const { data, isLoading, error } = useUsers(0, 1000);
  const deleteUserMutation = useDeleteUser();
  const permanentlyDeleteUserMutation = usePermanentlyDeleteUser();
  const resetPasswordMutation = useResetPassword();

  // Handlers
  const handleCreateSuccess = (username: string, password: string) => {
    setIsCreateModalOpen(false);
    setCredentialsData({ username, password });
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      await deleteUserMutation.mutateAsync(userToDelete.id);
      setUserToDelete(null);
      addToast('Usuario desactivado correctamente', 'success');
    } catch (error) {
      console.error('Error deleting user:', error);
      addToast('Error al eliminar usuario. Por favor intenta de nuevo.', 'error');
    }
  };

  const handlePermanentlyDeleteClick = (user: User) => {
    setUserToPermanentlyDelete(user);
  };

  const handlePermanentlyDeleteConfirm = async () => {
    if (!userToPermanentlyDelete) return;

    try {
      await permanentlyDeleteUserMutation.mutateAsync(userToPermanentlyDelete.id);
      setUserToPermanentlyDelete(null);
      addToast('Usuario eliminado permanentemente', 'success');
    } catch (error) {
      console.error('Error permanently deleting user:', error);
      addToast('Error al eliminar usuario permanentemente. Por favor intenta de nuevo.', 'error');
    }
  };

  const handleResetPasswordClick = (user: User) => {
    setUserToResetPassword(user);
  };

  const handleResetPasswordConfirm = async () => {
    if (!userToResetPassword) return;

    try {
      const result = await resetPasswordMutation.mutateAsync(userToResetPassword.id);
      setUserToResetPassword(null);
      setCredentialsData({
        username: userToResetPassword.username,
        password: result.temporaryPassword,
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      addToast('Error al resetear contraseña. Por favor intenta de nuevo.', 'error');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const allUsers = data?.users || [];

  // Apply search and filters
  const filteredUsers = useMemo(() => {
    let filtered = allUsers;

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(query) ||
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
      );
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user =>
        roleFilter === 'admin' ? user.isAdmin : !user.isAdmin
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user =>
        statusFilter === 'active' ? user.isActive : !user.isActive
      );
    }

    return filtered;
  }, [allUsers, searchQuery, roleFilter, statusFilter]);

  // Pagination for filtered results
  const users = filteredUsers;
  const totalUsers = filteredUsers.length;
  const totalPages = Math.ceil(totalUsers / pageSize);

  // Paginate the filtered users
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return users.slice(startIndex, endIndex);
  }, [users, currentPage, pageSize]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleRoleFilterChange = (role: 'all' | 'admin' | 'user') => {
    setRoleFilter(role);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleStatusFilterChange = (status: 'all' | 'active' | 'inactive') => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page when filtering
  };

  if (isLoading) {
    return (
      <div className={styles.panel}>
        <div className={styles.loadingState}>
          <p>Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.panel}>
        <div className={styles.errorState}>
          <p>Error al cargar usuarios</p>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>Gestión de Usuarios</h2>
          <p className={styles.description}>
            Crea, edita y administra los usuarios del sistema.
            {filteredUsers.length !== allUsers.length
              ? ` Mostrando ${filteredUsers.length} de ${allUsers.length} usuarios`
              : ` Total: ${allUsers.length} usuarios`}
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<UserPlus size={18} />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Crear Usuario
        </Button>
      </div>

      {/* Search and Filters */}
      <div className={styles.searchFilters}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar por nombre, usuario o email..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label htmlFor="roleFilter">Rol:</label>
            <select
              id="roleFilter"
              value={roleFilter}
              onChange={(e) => handleRoleFilterChange(e.target.value as 'all' | 'admin' | 'user')}
              className={styles.filterSelect}
            >
              <option value="all">Todos</option>
              <option value="admin">Admin</option>
              <option value="user">Usuario</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="statusFilter">Estado:</label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value as 'all' | 'active' | 'inactive')}
              className={styles.filterSelect}
            >
              <option value="all">Todos</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {paginatedUsers.length === 0 ? (
        <div className={styles.emptyState}>
          <UsersIcon size={48} className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>
            {allUsers.length === 0 ? 'No hay usuarios' : 'No se encontraron resultados'}
          </h3>
          <p className={styles.emptyMessage}>
            {allUsers.length === 0
              ? 'Crea tu primer usuario haciendo clic en "Crear Usuario"'
              : 'Intenta ajustar los filtros o el término de búsqueda'}
          </p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Último acceso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className={styles.userInfo}>
                      <div className={styles.userName}>
                        {user.name || user.username}
                      </div>
                      {user.email && (
                        <div className={styles.userEmail}>{user.email}</div>
                      )}
                      {!user.name && (
                        <div className={styles.userEmail}>@{user.username}</div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        user.isAdmin ? styles.badgeAdmin : styles.badgeUser
                      }`}
                    >
                      {user.isAdmin ? 'Admin' : 'Usuario'}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        user.isActive ? styles.badgeActive : styles.badgeInactive
                      }`}
                    >
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>{formatDate(user.lastLoginAt)}</td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.actionButton}
                        onClick={() => handleEditClick(user)}
                        title="Editar usuario"
                      >
                        <Edit2 size={14} />
                        Editar
                      </button>
                      <button
                        className={styles.actionButton}
                        onClick={() => handleResetPasswordClick(user)}
                        title="Resetear contraseña"
                        disabled={!user.isActive}
                      >
                        <Key size={14} />
                        Reset
                      </button>
                      {user.isActive ? (
                        <button
                          className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                          onClick={() => handleDeleteClick(user)}
                          title="Desactivar usuario"
                        >
                          <Trash2 size={14} />
                          Desactivar
                        </button>
                      ) : (
                        <button
                          className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                          onClick={() => handlePermanentlyDeleteClick(user)}
                          title="Eliminar permanentemente (no se puede deshacer)"
                        >
                          <Trash2 size={14} />
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalUsers > 0 && (
        <div className={styles.pagination}>
          <div className={styles.paginationInfo}>
            Mostrando {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalUsers)} de {totalUsers}
          </div>

          <div className={styles.paginationControls}>
            <button
              className={styles.paginationButton}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Anterior
            </button>

            <div className={styles.paginationPages}>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    className={`${styles.paginationButton} ${currentPage === pageNum ? styles.paginationButtonActive : ''}`}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              className={styles.paginationButton}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Siguiente
            </button>
          </div>

          <div className={styles.paginationSize}>
            <label htmlFor="pageSize">Por página:</label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className={styles.paginationSelect}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      )}

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateUserModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}

      {credentialsData && (
        <CredentialsModal
          username={credentialsData.username}
          password={credentialsData.password}
          onClose={() => setCredentialsData(null)}
        />
      )}

      {userToDelete && (
        <ConfirmDialog
          title="Desactivar Usuario"
          message={`¿Estás seguro de que quieres desactivar al usuario "${userToDelete.name || userToDelete.username}"? El usuario ya no podrá iniciar sesión.`}
          confirmText="Desactivar"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setUserToDelete(null)}
          isLoading={deleteUserMutation.isPending}
        />
      )}

      {userToResetPassword && (
        <ConfirmDialog
          title="Resetear Contraseña"
          message={`¿Estás seguro de que quieres resetear la contraseña del usuario "${userToResetPassword.name || userToResetPassword.username}"? Se generará una contraseña temporal que deberás comunicarle al usuario.`}
          confirmText="Resetear"
          onConfirm={handleResetPasswordConfirm}
          onCancel={() => setUserToResetPassword(null)}
          isLoading={resetPasswordMutation.isPending}
        />
      )}

      {userToPermanentlyDelete && (
        <ConfirmDialog
          title="⚠️ Eliminar Permanentemente"
          message={`¿Estás COMPLETAMENTE seguro de que quieres ELIMINAR PERMANENTEMENTE al usuario "${userToPermanentlyDelete.name || userToPermanentlyDelete.username}"? Esta acción NO SE PUEDE DESHACER. Todos los datos del usuario serán eliminados de forma permanente de la base de datos.`}
          confirmText="Eliminar Permanentemente"
          onConfirm={handlePermanentlyDeleteConfirm}
          onCancel={() => setUserToPermanentlyDelete(null)}
          isLoading={permanentlyDeleteUserMutation.isPending}
        />
      )}
    </div>
  );
}
