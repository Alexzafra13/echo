import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, User, Lock, AlertCircle } from 'lucide-react';
import { Button, Input } from '@shared/components/ui';
import { useAuth } from '@shared/hooks';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import { safeLocalStorage } from '@shared/utils/safeLocalStorage';
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

type LoginFormData = {
  username: string;
  password: string;
};

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, isLoggingIn, loginError } = useAuth();

  // Validation schema (inside component to access t())
  const loginSchema = useMemo(
    () =>
      z.object({
        username: z.string().min(1, t('auth.usernameRequired')),
        password: z.string().min(1, t('auth.passwordRequired')),
      }),
    [t]
  );

  // Cycle through all backgrounds before repeating (shuffled queue)
  const backgroundImage = useMemo(() => {
    let queue: string[] = [];
    try {
      queue = JSON.parse(safeLocalStorage.getItem('loginBgQueue') || '[]');
    } catch {
      safeLocalStorage.removeItem('loginBgQueue');
    }

    // If queue is empty, reshuffle all backgrounds
    if (queue.length === 0) {
      queue = [...LOGIN_BACKGROUNDS];
      for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
      }
    }

    // Take the next background from the queue
    const selected = queue.shift()!;
    safeLocalStorage.setItem('loginBgQueue', JSON.stringify(queue));

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
          backgroundImage: `url(${backgroundImage})`,
        }}
      />

      {/* Content */}
      <div className={styles.content}>
        {/* Logo */}
        <div className={styles.logoContainer}>
          <img src="/images/empy_cover/empy_cover_default.png" alt="Echo" className={styles.logo} />
        </div>

        {/* Login form */}
        <div className={styles.formCard}>
          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <fieldset disabled={isLoggingIn} className={`fieldset-reset ${styles.form}`}>
              {loginError && (
                <div className={styles.errorAlert}>
                  <AlertCircle size={20} />
                  <span>{getApiErrorMessage(loginError, t('auth.loginError'))}</span>
                </div>
              )}

              <Input
                {...register('username')}
                type="text"
                label={t('auth.username')}
                error={errors.username?.message}
                leftIcon={<User size={20} />}
                autoComplete="username"
              />

              <Input
                {...register('password')}
                type="password"
                label={t('auth.passwordLabel')}
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
                {t('auth.login')}
              </Button>
            </fieldset>
          </form>
        </div>
      </div>
    </div>
  );
}
