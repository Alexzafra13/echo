import { useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { useCreateUser } from '../../hooks/useUsers';
import styles from './UserFormModal.module.css';

interface CreateUserModalProps {
  onClose: () => void;
  onSuccess: (username: string, password: string) => void;
}

export function CreateUserModal({ onClose, onSuccess }: CreateUserModalProps) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
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

    // Email opcional pero debe ser válido
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
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
        email: formData.email || undefined,
        name: formData.name || undefined,
        isAdmin: formData.isAdmin,
      });

      onSuccess(result.user.username, result.temporaryPassword);
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Error creating user:', error);
      }
      setErrors({
        submit: error.response?.data?.message || 'Error al crear usuario',
      });
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.iconContainer}>
              <UserPlus size={24} />
            </div>
            <div>
              <h2 className={styles.title}>Crear Usuario</h2>
              <p className={styles.subtitle}>
                Se generará una contraseña temporal automáticamente
              </p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

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

          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              id="email"
              type="email"
              className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="juan@example.com"
            />
            {errors.email && (
              <span className={styles.errorText}>{errors.email}</span>
            )}
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
      </div>
    </div>
  );
}
