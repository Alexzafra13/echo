import { useState } from 'react';
import { UserPlus } from 'lucide-react';
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
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    isAdmin: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createUserMutation = useCreateUser();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Username es obligatorio
    if (!formData.username || formData.username.length < 3) {
      newErrors.username = 'El username debe tener al menos 3 caracteres';
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
        submit: getApiErrorMessage(error, 'Error al crear usuario'),
      });
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Crear Usuario"
      icon={UserPlus}
      subtitle="Se generará una contraseña temporal automáticamente"
    >

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.label}>
              Username <span className={styles.required}>*</span>
            </label>
            <input
              id="username"
              type="text"
              className={`${styles.input} ${errors.username ? styles.inputError : ''}`}
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              placeholder="jperez"
              required
              autoFocus
            />
            {errors.username && (
              <span className={styles.errorText}>{errors.username}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.label}>
              Nombre Completo
            </label>
            <input
              id="name"
              type="text"
              className={styles.input}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Juan Pérez"
            />
          </div>

          <div className={styles.checkboxWrapper}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={formData.isAdmin}
                onChange={(e) =>
                  setFormData({ ...formData, isAdmin: e.target.checked })
                }
              />
              <span>Permisos de Administrador</span>
            </label>
            <p className={styles.helpText}>
              Los administradores tienen acceso completo al panel de administración
            </p>
          </div>

          {errors.submit && (
            <div className={styles.errorBox}>{errors.submit}</div>
          )}

          <div className={styles.actions}>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={createUserMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createUserMutation.isPending}
            >
              {createUserMutation.isPending ? 'Creando...' : 'Crear Usuario'}
            </Button>
          </div>
        </form>
    </Modal>
  );
}
