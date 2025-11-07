import { useState } from 'react';
import { User, Lock, Shield, Calendar } from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { Sidebar } from '@features/home/components';
import { useAuth } from '@shared/hooks';
import { useChangePassword } from '../../hooks';
import styles from './ProfilePage.module.css';

/**
 * ProfilePage Component
 * User profile page with account information and password change
 * Follows the same layout pattern as HomePage and AlbumPage
 */
export function ProfilePage() {
  const { user } = useAuth();
  const { mutate: changePassword, isPending, isSuccess, isError, error } = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // Validations
    if (!currentPassword || !newPassword || !confirmPassword) {
      setValidationError('Todos los campos son obligatorios');
      return;
    }

    if (newPassword.length < 8) {
      setValidationError('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationError('Las contraseñas no coinciden');
      return;
    }

    if (currentPassword === newPassword) {
      setValidationError('La nueva contraseña debe ser diferente a la actual');
      return;
    }

    // Submit
    changePassword(
      {
        currentPassword,
        newPassword,
      },
      {
        onSuccess: () => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        },
      }
    );
  };

  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className={styles.profilePage}>
      <Sidebar />

      <main className={styles.profilePage__main}>
        <Header showBackButton />

        <div className={styles.profilePage__content}>
          <div className={styles.profilePage__header}>
            <h1>Mi Perfil</h1>
            <p className={styles.profilePage__subtitle}>Gestiona tu cuenta y preferencias</p>
          </div>

          <div className={styles.profilePage__sections}>
            {/* User Information Section */}
            <section className={styles.profilePage__section}>
              <div className={styles.profilePage__sectionHeader}>
                <User size={24} />
                <h2>Información de la cuenta</h2>
              </div>

              <div className={styles.profilePage__infoGrid}>
                <div className={styles.profilePage__infoItem}>
                  <label className={styles.profilePage__infoLabel}>
                    <User size={16} />
                    Usuario
                  </label>
                  <p className={styles.profilePage__infoValue}>{user?.username}</p>
                </div>

                <div className={styles.profilePage__infoItem}>
                  <label className={styles.profilePage__infoLabel}>
                    <Shield size={16} />
                    Rol
                  </label>
                  <p className={styles.profilePage__infoValue}>
                    <span className={user?.isAdmin ? styles.profilePage__badge_admin : styles.profilePage__badge_user}>
                      {user?.isAdmin ? 'Administrador' : 'Usuario'}
                    </span>
                  </p>
                </div>

                <div className={styles.profilePage__infoItem}>
                  <label className={styles.profilePage__infoLabel}>
                    <Calendar size={16} />
                    Miembro desde
                  </label>
                  <p className={styles.profilePage__infoValue}>{formatDate(user?.createdAt)}</p>
                </div>
              </div>
            </section>

            {/* Change Password Section */}
            <section className={styles.profilePage__section}>
              <div className={styles.profilePage__sectionHeader}>
                <Lock size={24} />
                <h2>Cambiar contraseña</h2>
              </div>

              <form onSubmit={handlePasswordSubmit} className={styles.profilePage__form}>
                <div className={styles.profilePage__formGroup}>
                  <label htmlFor="currentPassword" className={styles.profilePage__label}>
                    Contraseña actual
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={styles.profilePage__input}
                    placeholder="Ingresa tu contraseña actual"
                    disabled={isPending}
                  />
                </div>

                <div className={styles.profilePage__formGroup}>
                  <label htmlFor="newPassword" className={styles.profilePage__label}>
                    Nueva contraseña
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={styles.profilePage__input}
                    placeholder="Mínimo 8 caracteres"
                    disabled={isPending}
                  />
                </div>

                <div className={styles.profilePage__formGroup}>
                  <label htmlFor="confirmPassword" className={styles.profilePage__label}>
                    Confirmar nueva contraseña
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={styles.profilePage__input}
                    placeholder="Repite la nueva contraseña"
                    disabled={isPending}
                  />
                </div>

                {/* Error Messages */}
                {validationError && (
                  <div className={styles.profilePage__error}>
                    {validationError}
                  </div>
                )}

                {isError && (
                  <div className={styles.profilePage__error}>
                    {error instanceof Error ? error.message : 'Error al cambiar la contraseña. Verifica que la contraseña actual sea correcta.'}
                  </div>
                )}

                {/* Success Message */}
                {isSuccess && (
                  <div className={styles.profilePage__success}>
                    ✓ Contraseña cambiada exitosamente
                  </div>
                )}

                <button
                  type="submit"
                  className={styles.profilePage__submitButton}
                  disabled={isPending}
                >
                  {isPending ? 'Cambiando...' : 'Cambiar contraseña'}
                </button>
              </form>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
