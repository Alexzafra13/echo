import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, User, Lock, AlertCircle } from 'lucide-react';
import { Button, Input, Card } from '@shared/components/ui';
import { useAuth } from '@shared/hooks';
import styles from './LoginPage.module.css';

// Validation schema
const loginSchema = z.object({
  username: z.string().min(1, 'El nombre de usuario es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, isLoggingIn, loginError } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    login(data);
  };

  return (
    <div className={styles.container}>
      {/* Background image */}
      <div
        className={styles.background}
        style={{
          backgroundImage: 'url(/images/backgrounds/login-bg.jpg)'
        }}
      />

      {/* Vinyl decorations */}
      <div className={`${styles.vinylDecoration} ${styles.vinyl1}`} />
      <div className={`${styles.vinylDecoration} ${styles.vinyl2}`} />

      {/* Content */}
      <div className={styles.content}>
        {/* Logo card */}
        <Card variant="white" padding="md" className={styles.logoCard}>
          <div className={styles.logoContainer}>
            <div className={styles.logoCircle}>
              {/* Logo icon - Replace with your actual logo */}
              <img
                src="/images/logos/echo-icon.png"
                alt="Echo Icon"
                className={styles.logoImage}
                onError={(e) => {
                  // Fallback si no existe la imagen
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span className={styles.logoBadge}>V1</span>
            </div>
            <h1 className={styles.logoText}>Echo</h1>
          </div>
        </Card>

        {/* Login form card */}
        <Card variant="glass" padding="none" className={styles.formCard}>
          <h2 className={styles.formTitle}>Iniciar Sesión</h2>
          <p className={styles.formSubtitle}>
            Bienvenido de nuevo a Echo
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            {loginError && (
              <div className={styles.errorAlert}>
                <AlertCircle size={20} />
                <span>
                  {(loginError as any)?.response?.data?.message ||
                    'Error al iniciar sesión. Verifica tus credenciales.'}
                </span>
              </div>
            )}

            <Input
              {...register('username')}
              type="text"
              label="Usuario"
              placeholder="Introduce tu usuario"
              error={errors.username?.message}
              leftIcon={<User size={20} />}
              autoComplete="username"
            />

            <Input
              {...register('password')}
              type="password"
              label="Contraseña"
              placeholder="Introduce tu contraseña"
              error={errors.password?.message}
              leftIcon={<Lock size={20} />}
              autoComplete="current-password"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoggingIn}
              rightIcon={<ArrowRight size={20} />}
            >
              Entrar
            </Button>
          </form>

          <div className={styles.forgotPassword}>
            <a href="#" className={styles.forgotPasswordLink}>
              ¿Has Olvidado Tu Contraseña?
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
