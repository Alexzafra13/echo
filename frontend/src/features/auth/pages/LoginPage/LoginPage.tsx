import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, User, Lock } from 'lucide-react';
import { Button, Input, Card } from '@shared/components/ui';
import styles from './LoginPage.module.css';

// Validation schema
const loginSchema = z.object({
  username: z.string().min(1, 'El nombre de usuario es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      console.log('Login data:', data);
      // TODO: Implement login logic with API
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className={styles.container}>
      {/* Background */}
      <div className={styles.background}>
        {/* Background image will be added via CSS or inline style */}
        <div className={styles.backgroundImage} />
      </div>

      {/* Vinyl decorations */}
      <div className={`${styles.vinylDecoration} ${styles.vinyl1}`} />
      <div className={`${styles.vinylDecoration} ${styles.vinyl2}`} />

      {/* Content */}
      <div className={styles.content}>
        {/* Logo card */}
        <Card variant="white" padding="md" className={styles.logoCard}>
          <div className={styles.logoContainer}>
            <div className={styles.logoCircle}>
              {/* Logo image or icon */}
              <div className={styles.logoImage}>
                {/* SVG or image will go here */}
              </div>
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
              loading={isSubmitting}
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
