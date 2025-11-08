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
    name: user.name || '',
    isAdmin: user.isAdmin,
    isActive: user.isActive,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateUserMutation = useUpdateUser();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
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
          name: formData.name || undefined,
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
                Editando: @{user.username}
              </p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
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
              autoFocus
            />
            <p className={styles.helpText}>
              Nombre para mostrar en la aplicación. El nombre de usuario (@{user.username}) no se puede cambiar.
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
