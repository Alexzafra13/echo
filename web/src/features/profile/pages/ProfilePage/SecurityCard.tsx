import { useState } from 'react';
import { Lock, Check, X } from 'lucide-react';
import { useChangePassword } from '../../hooks';
import { validatePasswordStrength, passwordRequirementLabels } from '@shared/utils/password.utils';
import styles from './ProfilePage.module.css';

export function SecurityCard() {
  const {
    mutate: changePassword,
    isPending,
    isSuccess,
    isError,
    error: errorObj,
  } = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setValidationError('Todos los campos son obligatorios');
      return;
    }

    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      setValidationError(strengthError);
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

    changePassword(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        },
      }
    );
  };

  return (
    <div className={styles.profilePage__card}>
      <div className={styles.profilePage__cardHeader}>
        <h2><Lock size={20} /> Seguridad</h2>
      </div>
      <div className={styles.profilePage__cardBody}>
        <form onSubmit={handleSubmit} className={styles.profilePage__form}>
          <p className={styles.profilePage__formDescription}>
            Cambia tu contraseña regularmente para mantener tu cuenta segura
          </p>

          <div className={styles.profilePage__formGrid}>
            <div className={styles.profilePage__formGroup}>
              <label htmlFor="currentPassword">Contraseña actual</label>
              <input type="password" id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={styles.profilePage__input} placeholder="••••••••" disabled={isPending} autoComplete="current-password" />
            </div>
            <div className={styles.profilePage__formGroup}>
              <label htmlFor="newPassword">Nueva contraseña</label>
              <input type="password" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={styles.profilePage__input} placeholder="Mínimo 8 caracteres" disabled={isPending} autoComplete="new-password" />
            </div>
            <div className={styles.profilePage__formGroup}>
              <label htmlFor="confirmPassword">Confirmar contraseña</label>
              <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={styles.profilePage__input} placeholder="Repite la nueva contraseña" disabled={isPending} autoComplete="new-password" />
            </div>
          </div>

          {newPassword && (
            <ul className={styles.profilePage__requirements}>
              {passwordRequirementLabels.map((req) => (
                <li key={req.key} className={req.check(newPassword) ? styles.profilePage__requirementMet : styles.profilePage__requirementUnmet}>
                  {req.check(newPassword) ? <Check size={14} /> : <X size={14} />}
                  <span>{req.label}</span>
                </li>
              ))}
            </ul>
          )}

          {validationError && <div className={styles.profilePage__alert_error}>{validationError}</div>}
          {isError && (
            <div className={styles.profilePage__alert_error}>
              {errorObj instanceof Error ? errorObj.message : 'Error al cambiar la contraseña. Verifica que la contraseña actual sea correcta.'}
            </div>
          )}
          {isSuccess && (
            <div className={styles.profilePage__alert_success}><Check size={18} /> Contraseña cambiada exitosamente</div>
          )}

          <button type="submit" className={styles.profilePage__submitButton} disabled={isPending}>
            {isPending ? 'Cambiando...' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
