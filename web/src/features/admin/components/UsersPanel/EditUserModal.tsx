import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Edit2 } from 'lucide-react';
import { Button, Modal } from '@shared/components/ui';
import { useUpdateUser } from '../../hooks/useUsers';
import { User } from '../../api/users.service';
import { logger } from '@shared/utils/logger';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import styles from './UserFormModal.module.css';

interface EditUserModalProps {
  user: User;
  onClose: () => void;
}

export function EditUserModal({ user, onClose }: EditUserModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    isAdmin: user.isAdmin,
    isActive: user.isActive,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateUserMutation = useUpdateUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateUserMutation.mutateAsync({
        id: user.id,
        data: {
          isAdmin: formData.isAdmin,
          isActive: formData.isActive,
        },
      });

      onClose();
    } catch (error) {
      logger.error('Error updating user:', error);
      setErrors({
        submit: getApiErrorMessage(error, t('admin.users.updateError')),
      });
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={t('admin.users.editTitle')}
      icon={Edit2}
      subtitle={`ID: ${user.id}`}
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        {user.isSystemAdmin && (
          <div className={styles.infoBox}>
            <p>{t('admin.users.mainAdminNote')}</p>
          </div>
        )}

        <div className={styles.formGroup}>
          <label htmlFor="username" className={styles.label}>
            {t('admin.users.usernameLoginLabel')}
          </label>
          <input
            id="username"
            type="text"
            className={styles.input}
            value={user.username}
            disabled
          />
          <p className={styles.helpText}>{t('admin.users.usernameCannotChange')}</p>
        </div>

        <div className={styles.checkboxWrapper}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={formData.isAdmin}
              onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
              disabled={user.isSystemAdmin}
            />
            <span>{t('admin.users.adminPermissions')}</span>
          </label>
          <p className={styles.helpText}>{t('admin.users.adminPermissionsHelp')}</p>
        </div>

        <div className={styles.checkboxWrapper}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              disabled={user.isSystemAdmin}
            />
            <span>{t('admin.users.activeAccount')}</span>
          </label>
          <p className={styles.helpText}>{t('admin.users.inactiveAccountHelp')}</p>
        </div>

        {errors.submit && <div className={styles.errorBox}>{errors.submit}</div>}

        <div className={styles.actions}>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={updateUserMutation.isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={updateUserMutation.isPending}>
            {updateUserMutation.isPending ? t('common.saving') : t('common.saveChanges')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
