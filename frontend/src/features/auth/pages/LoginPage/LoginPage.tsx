import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, User, Lock, AlertCircle } from 'lucide-react';
import { Button, Input } from '@shared/components/ui';
import { useAuth } from '@shared/hooks';
import styles from './LoginPage.module.css';

/**
 * Available background images for login page
 * Add new images to /public/images/backgrounds/ and include them here
 */
const LOGIN_BACKGROUNDS = [
  '/images/backgrounds/login-bg.jpg',
  '/images/backgrounds/concert_orange_light.jpg',
  '/images/backgrounds/concert_instruments.jpg',
] as const;

// Validation schema
const loginSchema = z.object({
  username: z.string().min(1, 'El nombre de usuario es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, isLoggingIn, loginError } = useAuth();

  // Select a random background different from the last one
  const backgroundImage = useMemo(() => {
    const lastBackground = sessionStorage.getItem('lastLoginBackground');
    const availableBackgrounds = LOGIN_BACKGROUNDS.filter(bg => bg !== lastBackground);

    // If all were filtered (shouldn't happen with 3+ images), use all
    const pool = availableBackgrounds.length > 0 ? availableBackgrounds : LOGIN_BACKGROUNDS;
    const randomIndex = Math.floor(Math.random() * pool.length);
    const selected = pool[randomIndex];

    // Store for next time
    sessionStorage.setItem('lastLoginBackground', selected);
    return selected;
  }, []);

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
      {/* Background image - rotates randomly on each visit */}
      <div
        className={styles.background}
        style={{
          backgroundImage: `url(${backgroundImage})`
        }}
      />

      {/* Content */}
      <div className={styles.content}>
        {/* Logo */}
        <div className={styles.logoContainer}>
          <img
            src="/images/logos/echo-icon.png"
            alt="Echo"
            className={styles.logo}
          />
        </div>

        {/* Login form */}
        <div className={styles.formCard}>
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
              label="Username"
              placeholder=""
              error={errors.username?.message}
              leftIcon={<User size={20} />}
              autoComplete="username"
            />

            <Input
              {...register('password')}
              type="password"
              label="Password"
              placeholder=""
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
              Sing In
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}