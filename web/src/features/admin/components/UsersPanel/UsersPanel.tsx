import { useState, useMemo } from 'react';
import { Users as UsersIcon, UserPlus, Edit2, Trash2, Key, Search, UserX, UserCheck } from 'lucide-react';
import { Button, InlineNotification, ConfirmDialog } from '@shared/components/ui';
import { useUsers, useDeleteUser, useResetPassword, usePermanentlyDeleteUser, useUpdateUser } from '../../hooks/useUsers';
import { User } from '../../api/users.api';
import { CreateUserModal } from './CreateUserModal';
import { EditUserModal } from './EditUserModal';
import { CredentialsModal } from './CredentialsModal';
import { getUserAvatarUrl, handleAvatarError, getUserInitials } from '@shared/utils/avatar.utils';
import { formatDateCompact } from '@shared/utils/format';
import { logger } from '@shared/utils/logger';
import styles from './UsersPanel.module.css';
import type { NotificationType } from '@shared/components/ui';

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
  const [userToReactivate, setUserToReactivate] = useState<User | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Inline notifications
  const [notification, setNotification] = useState<{ type: NotificationType; message: string } | null>(null);

  // Queries - Load all users for client-side filtering
  const { data, isLoading, error } = useUsers(0, 1000);
  const deleteUserMutation = useDeleteUser();
  const permanentlyDeleteUserMutation = usePermanentlyDeleteUser();
  const resetPasswordMutation = useResetPassword();
  const updateUserMutation = useUpdateUser();

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
      setNotification({ type: 'success', message: 'Usuario desactivado correctamente' });
    } catch (err) {
      if (import.meta.env.DEV) {
        logger.error('Error deleting user:', err);
      }
      setNotification({ type: 'error', message: 'Error al eliminar usuario. Por favor intenta de nuevo.' });
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
      setNotification({ type: 'success', message: 'Usuario eliminado permanentemente' });
    } catch (err) {
      if (import.meta.env.DEV) {
        logger.error('Error permanently deleting user:', err);
      }
      setNotification({ type: 'error', message: 'Error al eliminar usuario permanentemente. Por favor intenta de nuevo.' });
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
    } catch (err) {
      if (import.meta.env.DEV) {
        logger.error('Error resetting password:', err);
      }
      setNotification({ type: 'error', message: 'Error al resetear contraseña. Por favor intenta de nuevo.' });
    }
  };

  const handleReactivateClick = (user: User) => {
    setUserToReactivate(user);
  };

  const handleReactivateConfirm = async () => {
    if (!userToReactivate) return;

    try {
      await updateUserMutation.mutateAsync({
        id: userToReactivate.id,
        data: { isActive: true },
      });
      setUserToReactivate(null);
      setNotification({ type: 'success', message: 'Usuario reactivado correctamente' });
    } catch (err) {
      if (import.meta.env.DEV) {
        logger.error('Error reactivating user:', err);
      }
      setNotification({ type: 'error', message: 'Error al reactivar usuario. Por favor intenta de nuevo.' });
    }
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
        user.name?.toLowerCase().includes(query)
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

      {/* Notification */}
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Search and Filters */}
      <div className={styles.searchFilters}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar por nombre o usuario..."
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
                  <td data-label="Usuario">
                    <div className={styles.userInfo}>
                      <div className={styles.userAvatar}>
                        {user.avatarPath ? (
                          <img
                            src={getUserAvatarUrl(user.id)}
                            alt={user.name || user.username}
                            className={styles.userAvatarImage}
                            onError={handleAvatarError}
                          />
                        ) : (
                          <div className={styles.userAvatarPlaceholder}>
                            {getUserInitials(user.name, user.username)}
                          </div>
                        )}
                      </div>
                      <div className={styles.userDetails}>
                        <div className={styles.userName}>
                          {user.name || user.username}
                        </div>
                        {user.name && (
                          <div className={styles.userEmail}>@{user.username}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td data-label="Rol">
                    {user.isSystemAdmin ? (
                      <span className={`${styles.badge} ${styles.badgeSystemAdmin}`}>
                        Administrador Principal
                      </span>
                    ) : (
                      <span
                        className={`${styles.badge} ${
                          user.isAdmin ? styles.badgeAdmin : styles.badgeUser
                        }`}
                      >
                        {user.isAdmin ? 'Admin' : 'Usuario'}
                      </span>
                    )}
                  </td>
                  <td data-label="Estado">
                    <span
                      className={`${styles.badge} ${
                        user.isActive ? styles.badgeActive : styles.badgeInactive
                      }`}
                    >
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td data-label="Último acceso">{formatDateCompact(user.lastLoginAt)}</td>
                  <td data-label="Acciones">
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
                          className={`${styles.actionButton} ${styles.actionButtonWarning}`}
                          onClick={() => handleDeleteClick(user)}
                          title={user.isSystemAdmin ? "No se puede desactivar al administrador principal" : "Desactivar usuario (acción reversible)"}
                          disabled={user.isSystemAdmin}
                        >
                          <UserX size={14} />
                          Desactivar
                        </button>
                      ) : (
                        <button
                          className={`${styles.actionButton} ${styles.actionButtonSuccess}`}
                          onClick={() => handleReactivateClick(user)}
                          title="Reactivar usuario"
                        >
                          <UserCheck size={14} />
                          Reactivar
                        </button>
                      )}
                      <button
                        className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                        onClick={() => handlePermanentlyDeleteClick(user)}
                        title={user.isSystemAdmin ? "No se puede eliminar al administrador principal" : "Eliminar permanentemente (no se puede deshacer)"}
                        disabled={user.isSystemAdmin}
                      >
                        <Trash2 size={14} />
                        Eliminar
                      </button>
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

      {userToReactivate && (
        <ConfirmDialog
          title="Reactivar Usuario"
          message={`¿Estás seguro de que quieres reactivar al usuario "${userToReactivate.name || userToReactivate.username}"? El usuario podrá volver a iniciar sesión.`}
          confirmText="Reactivar"
          onConfirm={handleReactivateConfirm}
          onCancel={() => setUserToReactivate(null)}
          isLoading={updateUserMutation.isPending}
        />
      )}
    </div>
  );
}
