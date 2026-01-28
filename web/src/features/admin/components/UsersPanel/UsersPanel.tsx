import { useState, useMemo } from 'react';
import { Users as UsersIcon, UserPlus } from 'lucide-react';
import { Button, InlineNotification, ConfirmDialog } from '@shared/components/ui';
import { useModal } from '@shared/hooks';
import { useUsers, useDeleteUser, useResetPassword, usePermanentlyDeleteUser, useUpdateUser } from '../../hooks/useUsers';
import { User } from '../../api/users.api';
import { CreateUserModal } from './CreateUserModal';
import { EditUserModal } from './EditUserModal';
import { CredentialsModal } from './CredentialsModal';
import { UserRow, SearchFilters, Pagination } from './components';
import { logger } from '@shared/utils/logger';
import styles from './UsersPanel.module.css';
import type { NotificationType } from '@shared/components/ui';

/**
 * UsersPanel Component
 * Panel de gestión de usuarios para administradores
 */
export function UsersPanel() {
  // Modal states using useModal hook
  const createModal = useModal();
  const editModal = useModal<User>();
  const credentialsModal = useModal<{ username: string; password: string }>();
  const deleteModal = useModal<User>();
  const permanentDeleteModal = useModal<User>();
  const resetPasswordModal = useModal<User>();
  const reactivateModal = useModal<User>();

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
    createModal.close();
    credentialsModal.openWith({ username, password });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.data) return;

    try {
      await deleteUserMutation.mutateAsync(deleteModal.data.id);
      deleteModal.close();
      setNotification({ type: 'success', message: 'Usuario desactivado correctamente' });
    } catch (err) {
      if (import.meta.env.DEV) {
        logger.error('Error deleting user:', err);
      }
      setNotification({ type: 'error', message: 'Error al eliminar usuario. Por favor intenta de nuevo.' });
    }
  };

  const handlePermanentlyDeleteConfirm = async () => {
    if (!permanentDeleteModal.data) return;

    try {
      await permanentlyDeleteUserMutation.mutateAsync(permanentDeleteModal.data.id);
      permanentDeleteModal.close();
      setNotification({ type: 'success', message: 'Usuario eliminado permanentemente' });
    } catch (err) {
      if (import.meta.env.DEV) {
        logger.error('Error permanently deleting user:', err);
      }
      setNotification({ type: 'error', message: 'Error al eliminar usuario permanentemente. Por favor intenta de nuevo.' });
    }
  };

  const handleResetPasswordConfirm = async () => {
    if (!resetPasswordModal.data) return;

    try {
      const result = await resetPasswordMutation.mutateAsync(resetPasswordModal.data.id);
      const username = resetPasswordModal.data.username;
      resetPasswordModal.close();
      credentialsModal.openWith({
        username,
        password: result.temporaryPassword,
      });
    } catch (err) {
      if (import.meta.env.DEV) {
        logger.error('Error resetting password:', err);
      }
      setNotification({ type: 'error', message: 'Error al resetear contraseña. Por favor intenta de nuevo.' });
    }
  };

  const handleReactivateConfirm = async () => {
    if (!reactivateModal.data) return;

    try {
      await updateUserMutation.mutateAsync({
        id: reactivateModal.data.id,
        data: { isActive: true },
      });
      reactivateModal.close();
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
  const totalUsers = filteredUsers.length;
  const totalPages = Math.ceil(totalUsers / pageSize);

  // Paginate the filtered users
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage, pageSize]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleRoleFilterChange = (role: 'all' | 'admin' | 'user') => {
    setRoleFilter(role);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (status: 'all' | 'active' | 'inactive') => {
    setStatusFilter(status);
    setCurrentPage(1);
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
          onClick={createModal.open}
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
          autoHideMs={3000}
        />
      )}

      {/* Search and Filters */}
      <SearchFilters
        searchQuery={searchQuery}
        roleFilter={roleFilter}
        statusFilter={statusFilter}
        onSearchChange={handleSearchChange}
        onRoleFilterChange={handleRoleFilterChange}
        onStatusFilterChange={handleStatusFilterChange}
      />

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
                <UserRow
                  key={user.id}
                  user={user}
                  onEdit={(u) => editModal.openWith(u)}
                  onResetPassword={(u) => resetPasswordModal.openWith(u)}
                  onDeactivate={(u) => deleteModal.openWith(u)}
                  onReactivate={(u) => reactivateModal.openWith(u)}
                  onPermanentDelete={(u) => permanentDeleteModal.openWith(u)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalUsers={totalUsers}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* Modals */}
      {createModal.isOpen && (
        <CreateUserModal
          onClose={createModal.close}
          onSuccess={handleCreateSuccess}
        />
      )}

      {editModal.isOpen && editModal.data && (
        <EditUserModal
          user={editModal.data}
          onClose={editModal.close}
        />
      )}

      {credentialsModal.isOpen && credentialsModal.data && (
        <CredentialsModal
          username={credentialsModal.data.username}
          password={credentialsModal.data.password}
          onClose={credentialsModal.close}
        />
      )}

      {deleteModal.isOpen && deleteModal.data && (
        <ConfirmDialog
          title="Desactivar Usuario"
          message={`¿Estás seguro de que quieres desactivar al usuario "${deleteModal.data.name || deleteModal.data.username}"? El usuario ya no podrá iniciar sesión.`}
          confirmText="Desactivar"
          onConfirm={handleDeleteConfirm}
          onCancel={deleteModal.close}
          isLoading={deleteUserMutation.isPending}
        />
      )}

      {resetPasswordModal.isOpen && resetPasswordModal.data && (
        <ConfirmDialog
          title="Resetear Contraseña"
          message={`¿Estás seguro de que quieres resetear la contraseña del usuario "${resetPasswordModal.data.name || resetPasswordModal.data.username}"? Se generará una contraseña temporal que deberás comunicarle al usuario.`}
          confirmText="Resetear"
          onConfirm={handleResetPasswordConfirm}
          onCancel={resetPasswordModal.close}
          isLoading={resetPasswordMutation.isPending}
        />
      )}

      {permanentDeleteModal.isOpen && permanentDeleteModal.data && (
        <ConfirmDialog
          title="⚠️ Eliminar Permanentemente"
          message={`¿Estás COMPLETAMENTE seguro de que quieres ELIMINAR PERMANENTEMENTE al usuario "${permanentDeleteModal.data.name || permanentDeleteModal.data.username}"? Esta acción NO SE PUEDE DESHACER. Todos los datos del usuario serán eliminados de forma permanente de la base de datos.`}
          confirmText="Eliminar Permanentemente"
          onConfirm={handlePermanentlyDeleteConfirm}
          onCancel={permanentDeleteModal.close}
          isLoading={permanentlyDeleteUserMutation.isPending}
        />
      )}

      {reactivateModal.isOpen && reactivateModal.data && (
        <ConfirmDialog
          title="Reactivar Usuario"
          message={`¿Estás seguro de que quieres reactivar al usuario "${reactivateModal.data.name || reactivateModal.data.username}"? El usuario podrá volver a iniciar sesión.`}
          confirmText="Reactivar"
          onConfirm={handleReactivateConfirm}
          onCancel={reactivateModal.close}
          isLoading={updateUserMutation.isPending}
        />
      )}
    </div>
  );
}
