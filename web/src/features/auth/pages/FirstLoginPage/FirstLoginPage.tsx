import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, X, AlertCircle, ArrowRight } from 'lucide-react';
import { Button, Input } from '@shared/components/ui';
import { useAuth } from '@shared/hooks';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import { useAuthStore } from '@shared/store';
import { useLocation } from 'wouter';
import apiClient from '@shared/services/api';
import { passwordRequirements, getPasswordRequirementLabels } from '@shared/utils/password.utils';
import { useTranslation } from 'react-i18next';
import styles from './FirstLoginPage.module.css';

type FirstLoginFormData = {
  username: string;
  newPassword: string;
  confirmPassword: string;
};

/**
 * FirstLoginPage Component
 * Página de configuración inicial para usuarios nuevos
 * Permite cambiar contraseña (obligatorio) y username (opcional)
 */
export default function FirstLoginPage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const updateUser = useAuthStore((s) => s.updateUser);
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Schema de validación (inside component to use t())
  const firstLoginSchema = z
    .object({
      username: z
        .string()
        .min(3, t('auth.firstLogin.usernameMinLength'))
        .max(50, t('auth.firstLogin.usernameMaxLength'))
        .regex(/^[a-zA-Z0-9_]+$/, t('auth.firstLogin.usernamePattern'))
        .optional()
        .or(z.literal('')),
      newPassword: z
        .string()
        .min(8, t('auth.firstLogin.passwordMinLength'))
        .refine(passwordRequirements.hasUpperCase, t('auth.firstLogin.passwordUppercase'))
        .refine(passwordRequirements.hasLowerCase, t('auth.firstLogin.passwordLowercase'))
        .refine(passwordRequirements.hasNumber, t('auth.firstLogin.passwordNumber'))
        .refine(passwordRequirements.hasSpecialChar, t('auth.firstLogin.passwordSpecial')),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t('auth.firstLogin.passwordMismatch'),
      path: ['confirmPassword'],
    });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FirstLoginFormData>({
    resolver: zodResolver(firstLoginSchema),
    defaultValues: {
      username: user?.username || '',
    },
  });

  // Watch password for live validation feedback
  const watchPassword = watch('newPassword', '');

  const onSubmit = async (data: FirstLoginFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Actualizar contraseña
      await apiClient.put('/users/password', {
        newPassword: data.newPassword,
      });

      // Actualizar username si se proporcionó uno diferente
      if (data.username && data.username !== user?.username) {
        await apiClient.put('/users/profile', {
          username: data.username,
        });
      }

      // Actualizar el usuario en el store para desactivar mustChangePassword
      updateUser({ mustChangePassword: false });

      // Redirigir a home
      setLocation('/home');
    } catch (err) {
      setError(getApiErrorMessage(err, t('auth.firstLogin.updateError')));
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  // Verificar requisitos de contraseña en tiempo real
  const requirements = getPasswordRequirementLabels().map((req) => ({
    label: req.label,
    met: req.check(watchPassword),
  }));

  return (
    <div className={styles.container}>
      {/* Background */}
      <div
        className={styles.background}
        style={{
          backgroundImage: 'url(/images/backgrounds/login-bg.jpg)',
        }}
      />

      {/* Content */}
      <div className={styles.content}>
        {/* Logo */}
        <div className={styles.logoContainer}>
          <img src="/images/empy_cover/empy_cover_default.png" alt="Echo" className={styles.logo} />
        </div>

        {/* Card */}
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>{t('auth.firstLogin.welcomeTitle')}</h1>
            <p className={styles.subtitle}>{t('auth.firstLogin.pageSubtitle')}</p>
          </div>

          <div className={styles.info}>
            <AlertCircle size={20} className={styles.infoIcon} />
            <p>{t('auth.firstLogin.description')}</p>
          </div>

          {error && (
            <div className={styles.errorAlert}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <fieldset disabled={isSubmitting} className="fieldset-reset">
              {/* Username (opcional) */}
              <div className={styles.formGroup}>
                <Input
                  {...register('username')}
                  type="text"
                  label={t('auth.firstLogin.usernameLabel')}
                  error={errors.username?.message}
                  autoComplete="username"
                />
                <p className={styles.hint}>
                  {t('auth.firstLogin.keepCurrentHint')}
                  <strong>{user?.username}</strong>
                </p>
              </div>

              {/* Nueva contraseña */}
              <div className={styles.formGroup}>
                <Input
                  {...register('newPassword')}
                  type="password"
                  label={t('auth.firstLogin.newPasswordLabel')}
                  error={errors.newPassword?.message}
                  autoComplete="new-password"
                />
              </div>

              {/* Confirmar contraseña */}
              <div className={styles.formGroup}>
                <Input
                  {...register('confirmPassword')}
                  type="password"
                  label={t('auth.firstLogin.confirmPasswordLabel')}
                  error={errors.confirmPassword?.message}
                  autoComplete="new-password"
                />
              </div>

              {/* Requisitos de contraseña */}
              <div className={styles.requirements}>
                <p className={styles.requirementsTitle}>{t('auth.firstLogin.requirementsTitle')}</p>
                <ul className={styles.requirementsList}>
                  {requirements.map((req) => (
                    <li
                      key={req.label}
                      className={`${styles.requirement} ${req.met ? styles.requirementMet : ''}`}
                    >
                      {req.met ? (
                        <Check size={16} className={styles.requirementIcon} />
                      ) : (
                        <X size={16} className={styles.requirementIcon} />
                      )}
                      <span>{req.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Botones */}
              <div className={styles.actions}>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={isSubmitting}
                  rightIcon={<ArrowRight size={20} />}
                >
                  {t('auth.firstLogin.continueButton')}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  fullWidth
                  onClick={handleLogout}
                  disabled={isSubmitting}
                >
                  {t('auth.firstLogin.logoutButton')}
                </Button>
              </div>
            </fieldset>
          </form>
        </div>

        {/* Footer */}
        <p className={styles.footer}>{t('auth.firstLogin.footerText')}</p>
      </div>
    </div>
  );
}
