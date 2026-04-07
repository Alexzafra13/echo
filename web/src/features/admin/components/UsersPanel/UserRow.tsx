import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Edit2, Trash2, Key, UserX, UserCheck } from 'lucide-react';
import { User } from '../../api/users.service';
import { UserAvatar } from '@shared/components/ui';
import { formatDateCompact } from '@shared/utils/format';
import styles from './UserRow.module.css';

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
  const { t } = useTranslation();
  return (
    <tr>
      <td data-label={t('admin.users.dataLabelUser')}>
        <div className={styles.userInfo}>
          <UserAvatar
            userId={user.id}
            hasAvatar={!!user.avatarPath}
            username={user.name || user.username}
            size={44}
            showInitials
          />
          <div className={styles.userDetails}>
            <div className={styles.userName}>{user.name || user.username}</div>
            {user.name && <div className={styles.userEmail}>@{user.username}</div>}
          </div>
        </div>
      </td>
      <td data-label={t('admin.users.dataLabelRole')}>
        {user.isSystemAdmin ? (
          <span className={`${styles.badge} ${styles.badgeSystemAdmin}`}>
            {t('admin.users.roleSystemAdmin')}
          </span>
        ) : (
          <span
            className={`${styles.badge} ${user.isAdmin ? styles.badgeAdmin : styles.badgeUser}`}
          >
            {user.isAdmin ? t('admin.users.roleAdmin') : t('admin.users.roleUser')}
          </span>
        )}
      </td>
      <td data-label={t('admin.users.dataLabelStatus')}>
        <span
          className={`${styles.badge} ${user.isActive ? styles.badgeActive : styles.badgeInactive}`}
        >
          {user.isActive ? t('admin.users.statusActive') : t('admin.users.statusInactive')}
        </span>
      </td>
      <td data-label={t('admin.users.dataLabelLastAccess')}>
        {formatDateCompact(user.lastLoginAt)}
      </td>
      <td data-label={t('admin.users.dataLabelActions')}>
        <div className={styles.actions}>
          <button
            className={styles.actionButton}
            onClick={() => onEdit(user)}
            title={
              user.isSystemAdmin
                ? t('admin.users.editTooltipDisabled')
                : t('admin.users.editTooltip')
            }
            disabled={user.isSystemAdmin}
          >
            <Edit2 size={14} />
            {t('admin.users.editUser')}
          </button>
          <button
            className={styles.actionButton}
            onClick={() => onResetPassword(user)}
            title={
              user.isSystemAdmin
                ? t('admin.users.resetTooltipDisabled')
                : t('admin.users.resetPasswordTitle')
            }
            disabled={!user.isActive || user.isSystemAdmin}
          >
            <Key size={14} />
            {t('admin.users.resetPasswordShort')}
          </button>
          {user.isActive ? (
            <button
              className={`${styles.actionButton} ${styles.actionButtonWarning}`}
              onClick={() => onDeactivate(user)}
              title={
                user.isSystemAdmin
                  ? t('admin.users.deactivateTooltipDisabled')
                  : t('admin.users.deactivateTooltip')
              }
              disabled={user.isSystemAdmin}
            >
              <UserX size={14} />
              {t('admin.users.deactivateShort')}
            </button>
          ) : (
            <button
              className={`${styles.actionButton} ${styles.actionButtonSuccess}`}
              onClick={() => onReactivate(user)}
              title={t('admin.users.reactivateTooltip')}
            >
              <UserCheck size={14} />
              {t('admin.users.reactivateShort')}
            </button>
          )}
          <button
            className={`${styles.actionButton} ${styles.actionButtonDanger}`}
            onClick={() => onPermanentDelete(user)}
            title={
              user.isSystemAdmin
                ? t('admin.users.permanentDeleteTooltipDisabled')
                : t('admin.users.permanentDeleteTooltip')
            }
            disabled={user.isSystemAdmin}
          >
            <Trash2 size={14} />
            {t('admin.users.deleteShort')}
          </button>
        </div>
      </td>
    </tr>
  );
});
