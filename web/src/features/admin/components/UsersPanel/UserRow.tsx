import { memo } from 'react';
import { Edit2, Trash2, Key, UserX, UserCheck } from 'lucide-react';
import { User } from '../../api/users.api';
import { getUserAvatarUrl, handleAvatarError, getUserInitials } from '@shared/utils/avatar.utils';
import { formatDateCompact } from '@shared/utils/format';
import styles from './UsersPanel.module.css';

interface UserRowProps {
  user: User;
  onEdit: (user: User) => void;
  onResetPassword: (user: User) => void;
  onDeactivate: (user: User) => void;
  onReactivate: (user: User) => void;
  onPermanentDelete: (user: User) => void;
}

export const UserRow = memo(function UserRow({
  user,
  onEdit,
  onResetPassword,
  onDeactivate,
  onReactivate,
  onPermanentDelete,
}: UserRowProps) {
  return (
    <tr>
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
            onClick={() => onEdit(user)}
            title="Editar usuario"
          >
            <Edit2 size={14} />
            Editar
          </button>
          <button
            className={styles.actionButton}
            onClick={() => onResetPassword(user)}
            title="Resetear contraseña"
            disabled={!user.isActive}
          >
            <Key size={14} />
            Reset
          </button>
          {user.isActive ? (
            <button
              className={`${styles.actionButton} ${styles.actionButtonWarning}`}
              onClick={() => onDeactivate(user)}
              title={user.isSystemAdmin ? "No se puede desactivar al administrador principal" : "Desactivar usuario (acción reversible)"}
              disabled={user.isSystemAdmin}
            >
              <UserX size={14} />
              Desactivar
            </button>
          ) : (
            <button
              className={`${styles.actionButton} ${styles.actionButtonSuccess}`}
              onClick={() => onReactivate(user)}
              title="Reactivar usuario"
            >
              <UserCheck size={14} />
              Reactivar
            </button>
          )}
          <button
            className={`${styles.actionButton} ${styles.actionButtonDanger}`}
            onClick={() => onPermanentDelete(user)}
            title={user.isSystemAdmin ? "No se puede eliminar al administrador principal" : "Eliminar permanentemente (no se puede deshacer)"}
            disabled={user.isSystemAdmin}
          >
            <Trash2 size={14} />
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  );
});
