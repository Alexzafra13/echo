import { useState } from 'react';
import { Users as UsersIcon, UserPlus, Edit2, Trash2, Key } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { useToast } from '@shared/context/ToastContext';
import { useUsers, useDeleteUser, useResetPassword } from '../../hooks/useUsers';
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
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);

  // Toast notifications
  const { addToast } = useToast();

  // Queries
  const { data, isLoading, error } = useUsers();
  const deleteUserMutation = useDeleteUser();
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

  const users = data?.users || [];

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>Gestión de Usuarios</h2>
          <p className={styles.description}>
            Crea, edita y administra los usuarios del sistema. Total: {users.length} usuarios
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

      {/* Table */}
      {users.length === 0 ? (
        <div className={styles.emptyState}>
          <UsersIcon size={48} className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>No hay usuarios</h3>
          <p className={styles.emptyMessage}>
            Crea tu primer usuario haciendo clic en "Crear Usuario"
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
              {users.map((user) => (
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
                      <button
                        className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                        onClick={() => handleDeleteClick(user)}
                        title="Desactivar usuario"
                        disabled={!user.isActive}
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
    </div>
  );
}
