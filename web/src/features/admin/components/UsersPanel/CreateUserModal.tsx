import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Modal } from '@shared/components/ui';
import { useCreateUser } from '../../hooks/useUsers';
import { logger } from '@shared/utils/logger';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import styles from './UserFormModal.module.css';

interface CreateUserModalProps {
  onClose: () => void;
  onSuccess: (username: string, password: string) => void;
}

export function CreateUserModal({ onClose, onSuccess }: CreateUserModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    isAdmin: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createUserMutation = useCreateUser();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.username || formData.username.length < 3) {
      newErrors.username = t('admin.users.usernameMinLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const result = await createUserMutation.mutateAsync({
        username: formData.username,
        name: formData.name || undefined,
        isAdmin: formData.isAdmin,
      });

      onSuccess(result.user.username, result.temporaryPassword);
    } catch (error) {
      logger.error('Error creating user:', error);
      setErrors({
        submit: getApiErrorMessage(error, t('admin.users.createError')),
      });
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={t('admin.users.createTitle')}
      icon={UserPlus}
      subtitle={t('admin.users.autoPassword')}
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="username" className={styles.label}>
            {t('admin.users.usernameLabel')} <span className={styles.required}>*</span>
          </label>
          <input
            id="username"
            type="text"
            className={`${styles.input} ${errors.username ? styles.inputError : ''}`}
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder={t('admin.users.usernamePlaceholder')}
            required
            autoFocus
          />
          {errors.username && <span className={styles.errorText}>{errors.username}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="name" className={styles.label}>
            {t('admin.users.fullNameLabel')}
          </label>
          <input
            id="name"
            type="text"
            className={styles.input}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t('admin.users.fullNamePlaceholder')}
          />
        </div>

        <div className={styles.checkboxWrapper}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={formData.isAdmin}
              onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
            />
            <span>{t('admin.users.adminPermissions')}</span>
          </label>
          <p className={styles.helpText}>{t('admin.users.adminPermissionsHelp')}</p>
        </div>

        {errors.submit && <div className={styles.errorBox}>{errors.submit}</div>}

        <div className={styles.actions}>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={createUserMutation.isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={createUserMutation.isPending}>
            {createUserMutation.isPending ? t('common.creating') : t('admin.users.createButton')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
