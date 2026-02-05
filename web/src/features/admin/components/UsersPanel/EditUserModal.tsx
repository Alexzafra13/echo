import { useState } from 'react';
import { Edit2 } from 'lucide-react';
import { Button, Modal } from '@shared/components/ui';
import { useUpdateUser } from '../../hooks/useUsers';
import { User } from '../../api/users.api';
import { logger } from '@shared/utils/logger';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import styles from './UserFormModal.module.css';

interface EditUserModalProps {
  user: User;
  onClose: () => void;
}

export function EditUserModal({ user, onClose }: EditUserModalProps) {
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
        submit: getApiErrorMessage(error, 'Error al actualizar usuario'),
      });
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Editar Usuario"
      icon={Edit2}
      subtitle={`ID: ${user.id}`}
    >
      <form onSubmit={handleSubmit} className={styles.form}>
          {user.isSystemAdmin && (
            <div className={styles.infoBox}>
              <p>
                Este es el administrador principal del sistema. No se pueden cambiar sus permisos.
              </p>
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.label}>
              Nombre de usuario (para iniciar sesión)
            </label>
            <input
              id="username"
              type="text"
              className={styles.input}
              value={user.username}
              disabled
            />
            <p className={styles.helpText}>
              El nombre de usuario no se puede cambiar
            </p>
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
                disabled={user.isSystemAdmin}
              />
              <span>Permisos de Administrador</span>
            </label>
            <p className={styles.helpText}>
              Los administradores tienen acceso completo al panel de administración
            </p>
          </div>

          <div className={styles.checkboxWrapper}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                disabled={user.isSystemAdmin}
              />
              <span>Cuenta Activa</span>
            </label>
            <p className={styles.helpText}>
              Las cuentas inactivas no pueden iniciar sesión
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
              disabled={updateUserMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
    </Modal>
  );
}
