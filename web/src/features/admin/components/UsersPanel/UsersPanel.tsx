import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Users as UsersIcon, UserPlus, Shield, UserCheck, UserX } from 'lucide-react';
import { Button, InlineNotification, ConfirmDialog } from '@shared/components/ui';
import { useModal, useNotification } from '@shared/hooks';
import {
  useUsers,
  useDeleteUser,
  useResetPassword,
  usePermanentlyDeleteUser,
  useUpdateUser,
} from '../../hooks/useUsers';
import { User } from '../../api/users.service';
import { CreateUserModal } from './CreateUserModal';
import { EditUserModal } from './EditUserModal';
import { CredentialsModal } from './CredentialsModal';
import { UserRow } from './UserRow';
import { SearchFilters } from './SearchFilters';
import { Pagination } from './Pagination';
import { logger } from '@shared/utils/logger';
import styles from './UsersPanel.module.css';

/**
 * UsersPanel Component
 * Panel de gestión de usuarios para administradores
 */
export function UsersPanel() {
  const { t } = useTranslation();

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
  const { notification, showSuccess, showError, dismiss } = useNotification();

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
      showSuccess(t('admin.users.deactivateSuccess'));
    } catch (err) {
      if (import.meta.env.DEV) {
        logger.error('Error deleting user:', err);
      }
      showError(t('admin.users.deleteError'));
    }
  };

  const handlePermanentlyDeleteConfirm = async () => {
    if (!permanentDeleteModal.data) return;

    try {
      await permanentlyDeleteUserMutation.mutateAsync(permanentDeleteModal.data.id);
      permanentDeleteModal.close();
      showSuccess(t('admin.users.permanentDeleteSuccess'));
    } catch (err) {
      if (import.meta.env.DEV) {
        logger.error('Error permanently deleting user:', err);
      }
      showError(t('admin.users.permanentDeleteError'));
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
      showError(t('admin.users.resetPasswordError'));
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
      showSuccess(t('admin.users.reactivateSuccess'));
    } catch (err) {
      if (import.meta.env.DEV) {
        logger.error('Error reactivating user:', err);
      }
      showError(t('admin.users.reactivateError'));
    }
  };

  const allUsers = data?.users || [];

  // Compute user stats
  const userStats = useMemo(() => {
    const total = allUsers.length;
    const active = allUsers.filter((u) => u.isActive).length;
    const admins = allUsers.filter((u) => u.isAdmin).length;
    const inactive = allUsers.filter((u) => !u.isActive).length;
    return { total, active, admins, inactive };
  }, [allUsers]);

  // Apply search and filters
  const filteredUsers = useMemo(() => {
    let filtered = allUsers;

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.username.toLowerCase().includes(query) || user.name?.toLowerCase().includes(query)
      );
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) => (roleFilter === 'admin' ? user.isAdmin : !user.isAdmin));
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((user) =>
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

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handleRoleFilterChange = useCallback((role: 'all' | 'admin' | 'user') => {
    setRoleFilter(role);
    setCurrentPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((status: 'all' | 'active' | 'inactive') => {
    setStatusFilter(status);
    setCurrentPage(1);
  }, []);

  const handleEditOpen = useCallback((u: User) => editModal.openWith(u), [editModal]);
  const handleResetPasswordOpen = useCallback(
    (u: User) => resetPasswordModal.openWith(u),
    [resetPasswordModal]
  );
  const handleDeactivateOpen = useCallback((u: User) => deleteModal.openWith(u), [deleteModal]);
  const handleReactivateOpen = useCallback(
    (u: User) => reactivateModal.openWith(u),
    [reactivateModal]
  );
  const handlePermanentDeleteOpen = useCallback(
    (u: User) => permanentDeleteModal.openWith(u),
    [permanentDeleteModal]
  );

  if (isLoading) {
    return (
      <div className={styles.panel}>
        <div className={styles.loadingState}>
          <p>{t('admin.users.loadingUsers')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.panel}>
        <div className={styles.errorState}>
          <p>{t('admin.users.loadError')}</p>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  const getUserDisplayName = (user: User) => user.name || user.username;

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>{t('admin.users.title')}</h2>
          <p className={styles.description}>{t('admin.users.description')}</p>
        </div>
        <Button variant="primary" leftIcon={<UserPlus size={18} />} onClick={createModal.open}>
          {t('admin.users.createButton')}
        </Button>
      </div>

      {/* User Stats */}
      <div className={styles.statsRow}>
        <div className={`${styles.statPill} ${styles.statPillTotal}`}>
          <UsersIcon size={15} />
          <span className={styles.statPillValue}>{userStats.total}</span>
          <span className={styles.statPillLabel}>
            {t('admin.users.statsTotal', { count: userStats.total })}
          </span>
        </div>
        <div className={`${styles.statPill} ${styles.statPillActive}`}>
          <UserCheck size={15} />
          <span className={styles.statPillValue}>{userStats.active}</span>
          <span className={styles.statPillLabel}>{t('admin.users.statsActive')}</span>
        </div>
        <div className={`${styles.statPill} ${styles.statPillAdmin}`}>
          <Shield size={15} />
          <span className={styles.statPillValue}>{userStats.admins}</span>
          <span className={styles.statPillLabel}>{t('admin.users.statsAdmins')}</span>
        </div>
        {userStats.inactive > 0 && (
          <div className={`${styles.statPill} ${styles.statPillInactive}`}>
            <UserX size={15} />
            <span className={styles.statPillValue}>{userStats.inactive}</span>
            <span className={styles.statPillLabel}>{t('admin.users.statsInactive')}</span>
          </div>
        )}
        {filteredUsers.length !== allUsers.length && (
          <div className={styles.filterIndicator}>
            {t('admin.users.showingFiltered', {
              filtered: filteredUsers.length,
              total: allUsers.length,
            })}
          </div>
        )}
      </div>

      {/* Notification */}
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onDismiss={dismiss}
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
            {allUsers.length === 0 ? t('admin.users.noUsers') : t('admin.users.noResults')}
          </h3>
          <p className={styles.emptyMessage}>
            {allUsers.length === 0 ? t('admin.users.noUsersHint') : t('admin.users.noResultsHint')}
          </p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('admin.users.tableUser')}</th>
                <th>{t('admin.users.tableRole')}</th>
                <th>{t('admin.users.tableStatus')}</th>
                <th>{t('admin.users.tableLastAccess')}</th>
                <th>{t('admin.users.tableActions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onEdit={handleEditOpen}
                  onResetPassword={handleResetPasswordOpen}
                  onDeactivate={handleDeactivateOpen}
                  onReactivate={handleReactivateOpen}
                  onPermanentDelete={handlePermanentDeleteOpen}
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
        <CreateUserModal onClose={createModal.close} onSuccess={handleCreateSuccess} />
      )}

      {editModal.isOpen && editModal.data && (
        <EditUserModal user={editModal.data} onClose={editModal.close} />
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
          title={t('admin.users.deactivateTitle')}
          message={t('admin.users.deactivateConfirm', {
            name: getUserDisplayName(deleteModal.data),
          })}
          confirmText={t('admin.users.deactivateButton')}
          onConfirm={handleDeleteConfirm}
          onCancel={deleteModal.close}
          isLoading={deleteUserMutation.isPending}
        />
      )}

      {resetPasswordModal.isOpen && resetPasswordModal.data && (
        <ConfirmDialog
          title={t('admin.users.resetPasswordTitle')}
          message={t('admin.users.resetPasswordConfirm', {
            name: getUserDisplayName(resetPasswordModal.data),
          })}
          confirmText={t('admin.users.resetPasswordButton')}
          onConfirm={handleResetPasswordConfirm}
          onCancel={resetPasswordModal.close}
          isLoading={resetPasswordMutation.isPending}
        />
      )}

      {permanentDeleteModal.isOpen && permanentDeleteModal.data && (
        <ConfirmDialog
          title={t('admin.users.permanentDeleteTitle')}
          message={t('admin.users.permanentDeleteConfirm', {
            name: getUserDisplayName(permanentDeleteModal.data),
          })}
          confirmText={t('admin.users.permanentDeleteButton')}
          onConfirm={handlePermanentlyDeleteConfirm}
          onCancel={permanentDeleteModal.close}
          isLoading={permanentlyDeleteUserMutation.isPending}
        />
      )}

      {reactivateModal.isOpen && reactivateModal.data && (
        <ConfirmDialog
          title={t('admin.users.reactivateTitle')}
          message={t('admin.users.reactivateConfirm', {
            name: getUserDisplayName(reactivateModal.data),
          })}
          confirmText={t('admin.users.reactivateButton')}
          onConfirm={handleReactivateConfirm}
          onCancel={reactivateModal.close}
          isLoading={updateUserMutation.isPending}
        />
      )}
    </div>
  );
}
