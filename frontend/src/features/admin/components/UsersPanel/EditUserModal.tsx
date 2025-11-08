import { useState } from 'react';
import { Edit2, X } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { useUpdateUser } from '../../hooks/useUsers';
import { User } from '../../api/users.api';
import styles from './UserFormModal.module.css';

interface EditUserModalProps {
  user: User;
  onClose: () => void;
}

export function EditUserModal({ user, onClose }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    username: user.username,
    isAdmin: user.isAdmin,
    isActive: user.isActive,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateUserMutation = useUpdateUser();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.username || formData.username.trim().length === 0) {
      newErrors.username = 'El nombre de usuario es obligatorio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await updateUserMutation.mutateAsync({
        id: user.id,
        data: {
          isAdmin: formData.isAdmin,
          isActive: formData.isActive,
        },
      });

      onClose();
    } catch (error: any) {
      console.error('Error updating user:', error);
      setErrors({
        submit: error.response?.data?.message || 'Error al actualizar usuario',
      });
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.iconContainer}>
              <Edit2 size={24} />
            </div>
            <div>
              <h2 className={styles.title}>Editar Usuario</h2>
              <p className={styles.subtitle}>
                ID: {user.id}
              </p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {user.isSystemAdmin && (
            <div className={styles.infoBox}>
              <p>
                Este es el administrador principal del sistema. Solo se puede cambiar el nombre de usuario.
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
              className={`${styles.input} ${errors.username ? styles.inputError : ''}`}
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="usuario123"
              autoFocus
            />
            {errors.username && (
              <span className={styles.errorText}>{errors.username}</span>
            )}
            <p className={styles.helpText}>
              El nombre de usuario debe ser único en el sistema
            </p>
          </div>

          <div className={styles.formGroup}>
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

          <div className={styles.formGroup}>
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
      </div>
    </div>
  );
}
