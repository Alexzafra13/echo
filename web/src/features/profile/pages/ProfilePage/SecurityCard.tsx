import { useState } from 'react';
import { Lock, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChangePassword } from '../../hooks';
import {
  validatePasswordStrength,
  getPasswordRequirementLabels,
} from '@shared/utils/password.utils';
import styles from './ProfilePage.module.css';

export function SecurityCard() {
  const { t } = useTranslation();
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
      setValidationError(t('profile.security.fieldsRequired'));
      return;
    }

    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      setValidationError(strengthError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationError(t('profile.security.passwordMismatch'));
      return;
    }

    if (currentPassword === newPassword) {
      setValidationError(t('profile.security.passwordSameAsCurrent'));
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
        <h2>
          <Lock size={20} /> {t('profile.security.title')}
        </h2>
      </div>
      <div className={styles.profilePage__cardBody}>
        <form onSubmit={handleSubmit} className={styles.profilePage__form}>
          <p className={styles.profilePage__formDescription}>{t('profile.security.description')}</p>

          <div className={styles.profilePage__formGrid}>
            <div className={styles.profilePage__formGroup}>
              <label htmlFor="currentPassword">{t('profile.security.currentPasswordLabel')}</label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={styles.profilePage__input}
                placeholder="••••••••"
                disabled={isPending}
                autoComplete="current-password"
              />
            </div>
            <div className={styles.profilePage__formGroup}>
              <label htmlFor="newPassword">{t('profile.security.newPasswordLabel')}</label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={styles.profilePage__input}
                placeholder={t('profile.security.minCharsHint')}
                disabled={isPending}
                autoComplete="new-password"
              />
            </div>
            <div className={styles.profilePage__formGroup}>
              <label htmlFor="confirmPassword">{t('profile.security.confirmPasswordLabel')}</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={styles.profilePage__input}
                placeholder={t('profile.security.repeatPasswordPlaceholder')}
                disabled={isPending}
                autoComplete="new-password"
              />
            </div>
          </div>

          {newPassword && (
            <ul className={styles.profilePage__requirements}>
              {getPasswordRequirementLabels().map((req) => (
                <li
                  key={req.key}
                  className={
                    req.check(newPassword)
                      ? styles.profilePage__requirementMet
                      : styles.profilePage__requirementUnmet
                  }
                >
                  {req.check(newPassword) ? <Check size={14} /> : <X size={14} />}
                  <span>{req.label}</span>
                </li>
              ))}
            </ul>
          )}

          {validationError && (
            <div className={styles.profilePage__alert_error}>{validationError}</div>
          )}
          {isError && (
            <div className={styles.profilePage__alert_error}>
              {errorObj instanceof Error ? errorObj.message : t('profile.security.errorMessage')}
            </div>
          )}
          {isSuccess && (
            <div className={styles.profilePage__alert_success}>
              <Check size={18} /> {t('profile.security.successMessage')}
            </div>
          )}

          <button type="submit" className={styles.profilePage__submitButton} disabled={isPending}>
            {isPending ? t('profile.security.changingButton') : t('profile.security.submitButton')}
          </button>
        </form>
      </div>
    </div>
  );
}
