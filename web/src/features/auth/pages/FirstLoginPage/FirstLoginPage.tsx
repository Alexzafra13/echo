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
import styles from './FirstLoginPage.module.css';

// Validación de contraseña robusta
const passwordRequirements = {
  minLength: (password: string) => password.length >= 8,
  hasUpperCase: (password: string) => /[A-Z]/.test(password),
  hasLowerCase: (password: string) => /[a-z]/.test(password),
  hasNumber: (password: string) => /[0-9]/.test(password),
  hasSpecialChar: (password: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
};

// Schema de validación
const firstLoginSchema = z.object({
  username: z.string()
    .min(3, 'El nombre de usuario debe tener al menos 3 caracteres')
    .max(20, 'El nombre de usuario no puede tener más de 20 caracteres')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Solo letras, números, guiones y guiones bajos')
    .optional()
    .or(z.literal('')),
  newPassword: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .refine(passwordRequirements.hasUpperCase, 'Debe contener al menos una mayúscula')
    .refine(passwordRequirements.hasLowerCase, 'Debe contener al menos una minúscula')
    .refine(passwordRequirements.hasNumber, 'Debe contener al menos un número')
    .refine(passwordRequirements.hasSpecialChar, 'Debe contener al menos un carácter especial'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type FirstLoginFormData = z.infer<typeof firstLoginSchema>;

/**
 * FirstLoginPage Component
 * Página de configuración inicial para usuarios nuevos
 * Permite cambiar contraseña (obligatorio) y username (opcional)
 */
export default function FirstLoginPage() {
  const { user, logout } = useAuth();
  const updateUser = useAuthStore((s) => s.updateUser);
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(getApiErrorMessage(err, 'Error al actualizar las credenciales'));
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  // Verificar requisitos de contraseña en tiempo real
  const requirements = [
    { label: 'Mínimo 8 caracteres', met: passwordRequirements.minLength(watchPassword) },
    { label: 'Al menos una mayúscula', met: passwordRequirements.hasUpperCase(watchPassword) },
    { label: 'Al menos una minúscula', met: passwordRequirements.hasLowerCase(watchPassword) },
    { label: 'Al menos un número', met: passwordRequirements.hasNumber(watchPassword) },
    { label: 'Al menos un carácter especial (!@#$%^&*)', met: passwordRequirements.hasSpecialChar(watchPassword) },
  ];

  return (
    <div className={styles.container}>
      {/* Background */}
      <div
        className={styles.background}
        style={{
          backgroundImage: 'url(/images/backgrounds/login-bg.jpg)'
        }}
      />

      {/* Content */}
      <div className={styles.content}>
        {/* Logo */}
        <div className={styles.logoContainer}>
          <img
            src="/images/empy_cover/empy_cover_default.png"
            alt="Echo"
            className={styles.logo}
          />
        </div>

        {/* Card */}
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>Bienvenido a Echo</h1>
            <p className={styles.subtitle}>Configuración de Primera Sesión</p>
          </div>

          <div className={styles.info}>
            <AlertCircle size={20} className={styles.infoIcon} />
            <p>
              Por seguridad, cambie su contraseña predeterminada antes de continuar.
              Opcionalmente, puede cambiar su nombre de usuario.
            </p>
          </div>

          {error && (
            <div className={styles.errorAlert}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <fieldset disabled={isSubmitting} style={{ border: 'none', padding: 0, margin: 0, minInlineSize: 0 }}>
              {/* Username (opcional) */}
              <div className={styles.formGroup}>
                <Input
                  {...register('username')}
                  type="text"
                  label="Nombre de Usuario (opcional)"
                  error={errors.username?.message}
                  autoComplete="username"
                />
                <p className={styles.hint}>
                  Deje vacío para mantener: <strong>{user?.username}</strong>
                </p>
              </div>

              {/* Nueva contraseña */}
              <div className={styles.formGroup}>
                <Input
                  {...register('newPassword')}
                  type="password"
                  label="Nueva Contraseña"
                  error={errors.newPassword?.message}
                  autoComplete="new-password"
                />
              </div>

              {/* Confirmar contraseña */}
              <div className={styles.formGroup}>
                <Input
                  {...register('confirmPassword')}
                  type="password"
                  label="Confirmar Contraseña"
                  error={errors.confirmPassword?.message}
                  autoComplete="new-password"
                />
              </div>

              {/* Requisitos de contraseña */}
              <div className={styles.requirements}>
                <p className={styles.requirementsTitle}>Requisitos de contraseña:</p>
                <ul className={styles.requirementsList}>
                  {requirements.map((req, index) => (
                    <li
                      key={index}
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
                  Continuar a Echo
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  fullWidth
                  onClick={handleLogout}
                  disabled={isSubmitting}
                >
                  Cerrar Sesión
                </Button>
              </div>
            </fieldset>
          </form>
        </div>

        {/* Footer */}
        <p className={styles.footer}>
          Sus credenciales serán encriptadas y almacenadas de forma segura.
        </p>
      </div>
    </div>
  );
}
